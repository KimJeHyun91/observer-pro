const net = require("net");
const EventEmitter = require("events");
const { addOperLog } = require("../../utils/addOperLog");
const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const { sendToSignboard } = require('../../utils/signboardNotification');

const STATUS_CHECK_INTERVAL = 60000;
const STATUS_CHECK_CMD = "\x02STATUS\x03\r\n";
const CONNECTION_TIMEOUT = 10000;
const SOCKET_TIMEOUT = 90000;
const KEEP_ALIVE_INTERVAL = 5000;
const MAX_RETRY_COUNT = 3;
const DB_BATCH_INTERVAL = 5000;
const OPERATION_CONCURRENCY = 5;
const INITIAL_STATUS_TIMEOUT = 8000;

const GATE_COMMANDS = {
    OPEN: "\x02GATE UPLOCK\x03\r\n",
    CLOSE: "\x02GATE DOWN\x03\r\n",
    RESET_NEW: "\x02GATE UNLOCK\x03\r\n",
    RESET_OLD: "\x02SYSTEM RESET\x03\r\n",
    GREEN_PARKING: {
        OPEN: "OPEN_CMD",
        CLOSE: ["CLOSE_CMD1", "CLOSE_CMD2"]
    }
};

const CONTROLLER_MODELS = {
    WIZNET: '위즈넷',
    INTEGRATED: '일체형',
    GREEN_PARKING: '그린파킹'
};

const CONNECTION_STATES = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};


class SimpleGate {
    constructor(ipaddress, controllerModel) {
        this.ipaddress = ipaddress;
        this.controllerModel = controllerModel;
        this.socket = null;
        this.state = CONNECTION_STATES.DISCONNECTED;
        this.currentStatus = null; // 'open', 'close', null
        this.dbStatus = null;
        this.dbLinkedStatus = null;
        this.statusInterval = null;
        this.reconnectTimeout = null;
        this.retryCount = 0;
        this.buffer = '';
        this.initialStatusReceived = false;
        this.initialStatusPromise = null;
        this.connectionEstablished = false;
        this.lastStatusRequestTime = null;
        this.statusResponseTimeout = null;
        this.consecutiveTimeouts = 0;
        this.maxConsecutiveTimeouts = 3;
    }

    getPort() {
        return this.controllerModel === CONTROLLER_MODELS.INTEGRATED ? 2000 : 5000;
    }

    isConnected() {
        return this.state === CONNECTION_STATES.CONNECTED &&
            this.socket &&
            !this.socket.destroyed &&
            this.connectionEstablished;
    }

    shouldUpdateDB(status, linkedStatus) {
        if (this.dbStatus === null || this.dbLinkedStatus === null) {
            logger.info(`[${this.ipaddress}] DB update needed: initial state`);
            return true;
        }

        if (this.dbStatus !== status || this.dbLinkedStatus !== linkedStatus) {
            logger.info(`[${this.ipaddress}] DB update needed: status(${this.dbStatus}->${status}), linked(${this.dbLinkedStatus}->${linkedStatus})`);
            return true;
        }
        return false;
    }


    updateDBCache(status, linkedStatus) {
        logger.info(`[${this.ipaddress}] Cache updated: status=${status}, linked=${linkedStatus}`);
        this.dbStatus = status;
        this.dbLinkedStatus = linkedStatus;
    }

    async connect() {
        if (this.socket) {
            this.disconnect();
        }

        if (this.state === CONNECTION_STATES.CONNECTING) {
            logger.info(`[${this.ipaddress}] Already connecting, skipping`);
            return false;
        }

        this.state = CONNECTION_STATES.CONNECTING;
        logger.info(`[${this.ipaddress}] 연결 시도... (attempt ${this.retryCount + 1})`);

        try {
            this.socket = await this.createSocket();
            this.state = CONNECTION_STATES.CONNECTED;
            this.retryCount = 0;

            logger.info(`[${this.ipaddress}] Socket connected successfully`);

            this.setupSocketHandlers();

            await new Promise(resolve => setTimeout(resolve, 2000));

            this.connectionEstablished = true;
            logger.info(`[${this.ipaddress}] Connection established, starting status polling`);

            this.startStatusCheck();

            setTimeout(() => this.requestStatus(), 1000);

            return true;
        } catch (error) {
            console.error(`[${this.ipaddress}] 연결 실패: ${error.message}`);
            this.state = CONNECTION_STATES.ERROR;
            this.connectionEstablished = false;

            await this.updateDisconnectStatus(true);

            this.scheduleReconnect();
            return false;
        }
    }

    createSocket() {
        return new Promise((resolve, reject) => {
            const socket = net.connect({
                host: this.ipaddress,
                port: this.getPort(),
                timeout: CONNECTION_TIMEOUT
            });

            socket.setEncoding('utf8');
            socket.setKeepAlive(true, KEEP_ALIVE_INTERVAL);
            socket.setTimeout(SOCKET_TIMEOUT);

            const cleanup = () => {
                socket.removeAllListeners();
            };

            socket.once('connect', () => {
                cleanup();
                logger.info(`[${this.ipaddress}] Socket connected`);
                resolve(socket);
            });

            socket.once('error', (err) => {
                cleanup();
                reject(err);
            });

            socket.once('timeout', () => {
                cleanup();
                socket.destroy();
                reject(new Error('Connection timeout'));
            });
        });
    }

    setupSocketHandlers() {
        this.socket.on('data', (data) => {
            try {
                this.buffer += data.toString();
                this.processBufferedData();
            } catch (error) {
                console.error(`[${this.ipaddress}] Data processing error:`, error.message);
            }
        });

        this.socket.on('error', (error) => {
            console.error(`[${this.ipaddress}] 소켓 에러: ${error.message}`);
            this.handleDisconnect();
        });

        this.socket.on('close', () => {
            logger.info(`[${this.ipaddress}] 소켓 종료`);
            this.handleDisconnect();
        });

        this.socket.on('timeout', () => {
            logger.info(`[${this.ipaddress}] Socket timeout`);
            this.socket.destroy();
        });
    }

    processBufferedData() {
        const messageStart = this.buffer.indexOf('\x02');
        const messageEnd = this.buffer.indexOf('\x03');

        if (messageStart !== -1 && messageEnd !== -1 && messageStart < messageEnd) {
            const completeMessage = this.buffer.slice(messageStart, messageEnd + 1);
            this.buffer = this.buffer.slice(messageEnd + 1);

            this.consecutiveTimeouts = 0;
            if (this.statusResponseTimeout) {
                clearTimeout(this.statusResponseTimeout);
                this.statusResponseTimeout = null;
            }

            const status = this.parseStatus(completeMessage);
            if (status) {
                if (!this.initialStatusReceived) {
                    this.initialStatusReceived = true;
                    this.currentStatus = status;
                    logger.info(`[${this.ipaddress}] Initial status received: ${status}`);
                    this.updateDatabase();
                    return;
                }

                if (status !== this.currentStatus) {
                    logger.info(`[${this.ipaddress}] 상태 변경: ${this.currentStatus} -> ${status}`);
                    this.currentStatus = status;
                    this.updateDatabase();
                }
            }
        }
    }

    parseStatus(message) {
        const cleanMessage = message.replace(/[\x02\x03\r\n]/g, '');
        logger.debug(`[${this.ipaddress}] 받은 데이터: ${cleanMessage}`);

        // STATUS 응답 파싱
        if (cleanMessage.includes('GATE=')) {
            if (cleanMessage.includes('UP')) return 'open';
            if (cleanMessage.includes('DOWN')) return 'close';
        }

        return null;
    }

    async updateDatabase() {
        try {
            const statusBool = this.currentStatus === 'open' ? true : false;

            if (!this.shouldUpdateDB(statusBool, true)) {
                return;
            }

            const client = await pool.connect();
            const result = await client.query(`
                UPDATE fl_outside 
                SET crossing_gate_status = $1, linked_status = true, updated_at = NOW() 
                WHERE crossing_gate_ip = $2
                RETURNING idx, outside_name
            `, [statusBool, this.ipaddress]);

            client.release();

            if (result.rowCount > 0) {
                logger.info(`[${this.ipaddress}] DB 업데이트 완료: ${this.currentStatus}`);

                this.updateDBCache(statusBool, true);

                if (global.websocket) {
                    global.websocket.emit('fl_crossingGates-update', {
                        id: result.rows[0].idx,
                        crossing_gate_ip: this.ipaddress,
                        crossing_gate_status: statusBool,
                        linked_status: true,
                        outside_name: result.rows[0].outside_name,
                        timestamp: new Date().toISOString()
                    });

                    global.websocket.emit('setGate', {
                        ipaddress: this.ipaddress,
                        status: statusBool,
                        cmd: statusBool ? 'open' : 'close',
                        linked_status: true
                    });
                }
                 // 군위 침수차단시스템 에이엘테크 안내판 전용 함수. (차단기 상태 값 전송. 이후 안내판은 payload에 따라 알아서 처리됨)
                await sendToSignboard(this.ipaddress, statusBool);
            }
        } catch (error) {
            console.error(`[${this.ipaddress}] DB 업데이트 실패: ${error.message}`);
        }
    }

    requestStatus() {
        if (this.isConnected()) {
            logger.debug(`[${this.ipaddress}] 상태 요청 전송`);

            try {
                this.socket.write(STATUS_CHECK_CMD, (err) => {
                    if (err) {
                        console.error(`[${this.ipaddress}] Status request write error: ${err.message}`);
                    } else {
                        logger.debug(`[${this.ipaddress}] Status request sent successfully`);
                    }
                });
            } catch (error) {
                console.error(`[${this.ipaddress}] Status request error: ${error.message}`);
                return;
            }

            if (this.statusResponseTimeout) {
                clearTimeout(this.statusResponseTimeout);
            }

            this.statusResponseTimeout = setTimeout(() => {
                this.consecutiveTimeouts++;
                logger.info(`[${this.ipaddress}] Status response timeout (${this.consecutiveTimeouts}/${this.maxConsecutiveTimeouts})`);

                if (this.consecutiveTimeouts >= this.maxConsecutiveTimeouts) {
                    logger.info(`[${this.ipaddress}] Max consecutive timeouts - marking disconnected`);
                    this.updateDisconnectStatus();
                    this.consecutiveTimeouts = 0;
                }
            }, 15000);
        }
    }

    startStatusCheck() {
        this.stopStatusCheck();

        const sendStatusRequest = () => {
            if (!this.isConnected()) {
                logger.info(`[${this.ipaddress}] Gate not connected, stopping status polling`);
                if (this.statusInterval) {
                    clearInterval(this.statusInterval);
                    this.statusInterval = null;
                }
                return;
            }

            this.requestStatus();
        };

        logger.info(`[${this.ipaddress}] Starting status polling (interval: ${STATUS_CHECK_INTERVAL}ms)`);

        this.statusInterval = setInterval(sendStatusRequest, STATUS_CHECK_INTERVAL);
        logger.info(`[${this.ipaddress}] 주기적 상태 체크 시작, ${new Date().toISOString()}`);
    }

    stopStatusCheck() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        if (this.statusResponseTimeout) {
            clearTimeout(this.statusResponseTimeout);
            this.statusResponseTimeout = null;
        }
    }

    handleDisconnect() {
        logger.info(`[${this.ipaddress}] Handling disconnect`);

        this.state = CONNECTION_STATES.DISCONNECTED;
        this.connectionEstablished = false;
        this.stopStatusCheck();

        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
        }

        this.buffer = '';
        this.initialStatusReceived = false;
        this.initialStatusPromise = null;
        this.consecutiveTimeouts = 0;

        this.updateDisconnectStatus(true);
        this.scheduleReconnect();
    }

    async updateDisconnectStatus(force = false) {
        try {
            const currentStatusBool = this.currentStatus === 'open' ? true :
                this.currentStatus === 'close' ? false :
                    false; // 기본값 false

            if (!force && !this.shouldUpdateDB(currentStatusBool, false)) {
                logger.info(`[${this.ipaddress}] Disconnect status already up to date`);
                return;
            }

            const client = await pool.connect();
            const result = await client.query(`
            UPDATE fl_outside 
            SET linked_status = false, updated_at = NOW() 
            WHERE crossing_gate_ip = $1
            RETURNING idx, outside_name, crossing_gate_status
        `, [this.ipaddress]);
            client.release();

            if (result.rowCount > 0) {
                this.updateDBCache(result.rows[0].crossing_gate_status, false);

                if (global.websocket) {
                    const updatedGate = result.rows[0];

                    logger.info(`[${this.ipaddress}] Sending disconnect websocket events`);

                    global.websocket.emit('fl_crossingGates-update', {
                        id: updatedGate.idx,
                        crossing_gate_ip: this.ipaddress,
                        crossing_gate_status: updatedGate.crossing_gate_status,
                        linked_status: false,
                        outside_name: updatedGate.outside_name,
                        timestamp: new Date().toISOString()
                    });

                    global.websocket.emit('setGate', {
                        ipaddress: this.ipaddress,
                        status: 'disconnect',
                        cmd: 'disconnect',
                        linked_status: false
                    });
                }
            } else {
                logger.info(`[${this.ipaddress}] No rows updated - gate may not exist in DB`);
            }
        } catch (error) {
            console.error(`[${this.ipaddress}] Connect update faild: ${error.message}`);
        }
    }

    scheduleReconnect() {
        if (this.retryCount >= MAX_RETRY_COUNT) {
            logger.info(`[${this.ipaddress}] Max retry count reached, marking as permanently disconnected`);
            this.state = CONNECTION_STATES.ERROR;

            this.updateDisconnectStatus(true);
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const backoffDelay = 5000 * Math.pow(2, this.retryCount);
        const jitter = Math.random() * 1000;
        const finalDelay = Math.min(backoffDelay + jitter, 300000);

        logger.info(`[${this.ipaddress}] ${Math.floor(finalDelay)}ms 후 재연결 시도 (attempt ${this.retryCount + 1}/${MAX_RETRY_COUNT})`);

        this.reconnectTimeout = setTimeout(async () => {
            this.retryCount++;
            this.reconnectTimeout = null;
            await this.connect();
        }, finalDelay);
    }

    async sendCommand(cmd) {
        if (!this.isConnected()) {
            throw new Error('게이트가 연결되지 않았습니다');
        }

        return new Promise((resolve, reject) => {
            this.socket.write(cmd, (error) => {
                if (error) {
                    reject(error);
                } else {
                    logger.info(`[${this.ipaddress}] 명령 전송 완료: ${cmd.replace(/[\x02\x03\r\n]/g, '')}`);
                    resolve(true);
                }
            });
        });
    }

    disconnect() {
        logger.info(`[${this.ipaddress}] 연결 해제`);

        this.state = CONNECTION_STATES.DISCONNECTED;
        this.connectionEstablished = false;
        this.stopStatusCheck();

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.destroy();
            this.socket = null;
        }

        this.buffer = '';
        this.initialStatusReceived = false;
        this.initialStatusPromise = null;
        this.consecutiveTimeouts = 0;
    }
}

// 배치 DB 업데이트 클래스
class DatabaseBatchUpdater {
    constructor() {
        this.pendingUpdates = new Map();
        this.batchInterval = setInterval(() => this.processBatch(), DB_BATCH_INTERVAL);
    }

    scheduleUpdate(ipaddress, status, linkedStatus, force = false) {
        const gate = gateManager.gates.get(ipaddress);
        if (!force && gate && !gate.shouldUpdateDB(status, linkedStatus)) {
            return;
        }

        this.pendingUpdates.set(ipaddress, {
            status,
            linkedStatus,
            timestamp: Date.now(),
            force
        });
    }

    async processBatch() {
        if (this.pendingUpdates.size === 0) return;

        const updates = Array.from(this.pendingUpdates.entries());
        this.pendingUpdates.clear();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updatedCount = 0;

            for (const [ipaddress, { status, linkedStatus, force }] of updates) {
                let shouldUpdate = force;

                if (!force) {
                    const currentResult = await client.query(
                        'SELECT crossing_gate_status, linked_status FROM fl_outside WHERE crossing_gate_ip = $1',
                        [ipaddress]
                    );

                    if (currentResult.rows.length > 0) {
                        const current = currentResult.rows[0];
                        shouldUpdate = current.crossing_gate_status !== status || current.linked_status !== linkedStatus;
                    } else {
                        shouldUpdate = true;
                    }
                }

                if (shouldUpdate) {
                    const result = await client.query(`
                        UPDATE fl_outside 
                        SET crossing_gate_status = $1, linked_status = $2, updated_at = NOW() 
                        WHERE crossing_gate_ip = $3
                        RETURNING idx, outside_name, crossing_gate_status, linked_status
                    `, [status, linkedStatus, ipaddress]);

                    if (result.rowCount > 0) {
                        updatedCount++;
                        const updatedGate = result.rows[0];

                        const gate = gateManager.gates.get(ipaddress);
                        if (gate) {
                            gate.updateDBCache(status, linkedStatus);
                        }

                        if (global.websocket) {
                            global.websocket.emit('fl_crossingGates-update', {
                                id: updatedGate.idx,
                                crossing_gate_ip: ipaddress,
                                crossing_gate_status: updatedGate.crossing_gate_status,
                                linked_status: updatedGate.linked_status,
                                outside_name: updatedGate.outside_name,
                                timestamp: new Date().toISOString()
                            });

                            global.websocket.emit('setGate', {
                                ipaddress,
                                status: updatedGate.crossing_gate_status,
                                cmd: status === true ? 'open' : status === false ? 'close' : 'disconnect',
                                linked_status: updatedGate.linked_status
                            });
                        }


                    }
                }
            }

            await client.query('COMMIT');
            if (updatedCount > 0) {
                logger.info(`Batch DB update completed: ${updatedCount}/${updates.length} records updated`);
            }
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Batch DB update failed:', error.message);
        } finally {
            client.release();
        }
    }

    destroy() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
    }
}

// 동시성 제어 큐
class OperationQueue {
    constructor(concurrency = OPERATION_CONCURRENCY) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    async add(operation) {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { operation, resolve, reject } = this.queue.shift();

        try {
            const result = await operation();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
}

class SimpleGateManager extends EventEmitter {
    constructor() {
        super();
        this.gates = new Map();
        this.dbUpdater = new DatabaseBatchUpdater();
        this.operationQueue = new OperationQueue();
    }

    addGate(ipaddress, controllerModel) {
        if (!this.validateControllerModel(controllerModel, ipaddress)) {
            return false;
        }

        logger.info(`[${ipaddress}] 게이트 추가: ${controllerModel}`);

        if (this.gates.has(ipaddress)) {
            this.removeGate(ipaddress);
        }

        const gate = new SimpleGate(ipaddress, controllerModel);
        this.gates.set(ipaddress, gate);

        this.notifyGateAdded(ipaddress, controllerModel);

        gate.connect();

        return true;
    }

    async notifyGateAdded(ipaddress, controllerModel) {
        try {
            const client = await pool.connect();
            const result = await client.query(`
            SELECT idx, outside_name, crossing_gate_status, linked_status
            FROM fl_outside 
            WHERE crossing_gate_ip = $1
        `, [ipaddress]);
            client.release();

            if (result.rows.length > 0) {
                const gateInfo = result.rows[0];

                logger.info(`[${ipaddress}] Notifying FE about gate addition`);

                if (global.websocket) {
                    global.websocket.emit('fl_crossingGates-update', {
                        id: gateInfo.idx,
                        crossing_gate_ip: ipaddress,
                        crossing_gate_status: gateInfo.crossing_gate_status,
                        linked_status: gateInfo.linked_status,
                        outside_name: gateInfo.outside_name,
                        controller_model: controllerModel,
                        action: 'added',
                        timestamp: new Date().toISOString()
                    });

                    global.websocket.emit('setGate', {
                        ipaddress: ipaddress,
                        status: gateInfo.linked_status ?
                            (gateInfo.crossing_gate_status ? 'open' : 'close') :
                            'disconnect',
                        cmd: 'init',
                        linked_status: gateInfo.linked_status,
                        controller_model: controllerModel
                    });
                }
            }
        } catch (error) {
            console.error(`[${ipaddress}] Failed to notify FE about gate addition: ${error.message}`);
        }
    }


    modifyGate(ipaddress, controllerModel) {
        if (!this.validateControllerModel(controllerModel, ipaddress)) {
            return false;
        }

        logger.info(`[${ipaddress}] 게이트 수정: ${controllerModel}`);

        const gate = this.gates.get(ipaddress);
        if (gate) {
            gate.disconnect();
            gate.controllerModel = controllerModel;
            gate.state = CONNECTION_STATES.DISCONNECTED;
            gate.dbStatus = null;
            gate.dbLinkedStatus = null;

            this.notifyGateModified(ipaddress, controllerModel);

            setTimeout(() => {
                gate.connect();
            }, 1000);
        }

        return true;
    }

    async notifyGateModified(ipaddress, controllerModel) {
        try {
            const client = await pool.connect();
            const result = await client.query(`
            SELECT idx, outside_name, crossing_gate_status, linked_status
            FROM fl_outside 
            WHERE crossing_gate_ip = $1
        `, [ipaddress]);
            client.release();

            if (result.rows.length > 0) {
                const gateInfo = result.rows[0];

                logger.info(`[${ipaddress}] Notifying FE about gate modification`);

                if (global.websocket) {
                    global.websocket.emit('fl_crossingGates-update', {
                        id: gateInfo.idx,
                        crossing_gate_ip: ipaddress,
                        crossing_gate_status: gateInfo.crossing_gate_status,
                        linked_status: false,
                        outside_name: gateInfo.outside_name,
                        controller_model: controllerModel,
                        action: 'modified',
                        timestamp: new Date().toISOString()
                    });

                    global.websocket.emit('setGate', {
                        ipaddress: ipaddress,
                        status: 'reconnecting',
                        cmd: 'modify',
                        linked_status: false,
                        controller_model: controllerModel
                    });
                }
            }
        } catch (error) {
            console.error(`[${ipaddress}] Failed to notify FE about gate modification: ${error.message}`);
        }
    }

    removeGate(ipaddress) {
        const gate = this.gates.get(ipaddress);
        if (gate) {
            logger.info(`[${ipaddress}] 게이트 제거`);
            gate.disconnect();
            this.gates.delete(ipaddress);

            this.notifyGateRemoved(ipaddress);
        }
    }

    async notifyGateRemoved(ipaddress) {
        try {
            logger.info(`[${ipaddress}] Notifying FE about gate removal`);

            if (global.websocket) {
                global.websocket.emit('fl_crossingGates-update', {
                    crossing_gate_ip: ipaddress,
                    action: 'removed',
                    timestamp: new Date().toISOString()
                });

                global.websocket.emit('setGate', {
                    ipaddress: ipaddress,
                    status: 'removed',
                    cmd: 'remove',
                    linked_status: false
                });
            }
        } catch (error) {
            console.error(`[${ipaddress}] Failed to notify FE about gate removal: ${error.message}`);
        }
    }


    validateControllerModel(controllerModel, ipaddress) {
        const validModels = Object.values(CONTROLLER_MODELS);
        if (!controllerModel || !validModels.includes(controllerModel)) {
            console.error(`[${ipaddress}] Invalid controller_model: ${controllerModel}`);
            return false;
        }
        return true;
    }

    async sendGateCommand(ipaddress, cmd) {
        const gate = this.gates.get(ipaddress);
        if (!gate) {
            throw new Error('게이트를 찾을 수 없습니다');
        }

        if (!gate.isConnected()) {
            throw new Error('게이트가 연결되지 않았습니다');
        }

        let command;
        const isNewController = gate.controllerModel === CONTROLLER_MODELS.INTEGRATED;
        const isGreenParking = gate.controllerModel === CONTROLLER_MODELS.GREEN_PARKING;

        if (isGreenParking) {
            if (cmd === 'open') {
                const message = `\x02${GATE_COMMANDS.GREEN_PARKING.OPEN}\x03\r\n`;
                await gate.sendCommand(message);
            } else if (cmd === 'close') {
                for (const command of GATE_COMMANDS.GREEN_PARKING.CLOSE) {
                    const message = `\x02${command}\x03\r\n`;
                    await gate.sendCommand(message);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        } else {
            if (cmd === 'open') {
                command = GATE_COMMANDS.OPEN;
            } else if (cmd === 'close') {
                const resetCmd = isNewController ? GATE_COMMANDS.RESET_NEW : GATE_COMMANDS.RESET_OLD;

                await gate.sendCommand(resetCmd);
                await new Promise(resolve => setTimeout(resolve, 2000));
                command = GATE_COMMANDS.CLOSE;
            } else {
                throw new Error('잘못된 명령입니다');
            }

            if (command) {
                await gate.sendCommand(command);
            }
        }

        // 명령 후 상태 체크
        setTimeout(() => {
            gate.requestStatus();
        }, 1000);

        return true;
    }

    async initialize() {
        logger.info('게이트 매니저 초기화 중...');

        try {
            const client = await pool.connect();
            const result = await client.query(`
            SELECT crossing_gate_ip, controller_model, crossing_gate_status, linked_status
            FROM fl_outside 
            WHERE crossing_gate_ip IS NOT NULL
        `);
            client.release();

            logger.info(`DB에서 ${result.rows.length}개 게이트 발견`);

            for (const row of result.rows) {
                const { crossing_gate_ip, controller_model, crossing_gate_status, linked_status } = row;

                if (this.addGate(crossing_gate_ip, controller_model)) {
                    const gate = this.gates.get(crossing_gate_ip);
                    if (gate) {
                        gate.updateDBCache(crossing_gate_status, linked_status);
                        logger.info(`[${crossing_gate_ip}] Gate cache initialized: status=${crossing_gate_status}, linked=${linked_status}`);

                        setTimeout(async () => {
                            if (!gate.isConnected() &&
                                (gate.state === CONNECTION_STATES.ERROR ||
                                    gate.state === CONNECTION_STATES.DISCONNECTED)) {
                                logger.info(`[${crossing_gate_ip}] Initial connection failed, forcing disconnect status`);
                                await gate.updateDisconnectStatus(true);
                            }
                        }, 8000);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            logger.info('게이트 매니저 초기화 완료');
        } catch (error) {
            console.error('게이트 매니저 초기화 실패:', error.message);
        }
    }

    cleanup() {
        logger.info('게이트 매니저 정리 중...');

        for (const gate of this.gates.values()) {
            gate.disconnect();
        }

        this.gates.clear();
        this.dbUpdater.destroy();
        this.removeAllListeners();
        logger.info('게이트 매니저 정리 완료');
    }
}

const gateManager = new SimpleGateManager();

const handleGateControl = async (data, socket) => {
    const { ipaddress, cmd, id, type = 'single', ipaddresses, area_name, location } = data;

    if (!cmd || !['open', 'close'].includes(cmd)) {
        socket.emit('setGate', {
            status: 'error',
            message: '유효하지 않은 명령입니다.',
            cmd,
            type
        });
        return;
    }

    const executeCommand = async (targetIp) => {
        try {
            const gate = gateManager.gates.get(targetIp);
            if (!gate || !gate.isConnected()) {
                throw new Error('게이트가 연결되지 않았습니다');
            }

            const isNewController = gate.controllerModel === CONTROLLER_MODELS.INTEGRATED;
            const isGreenParking = gate.controllerModel === CONTROLLER_MODELS.GREEN_PARKING;
            let success = false;

            if (isGreenParking) {
                if (cmd === 'open') {
                    const message = `\x02${GATE_COMMANDS.GREEN_PARKING.OPEN}\x03\r\n`;
                    success = await gate.sendCommand(message);
                } else if (cmd === 'close') {
                    for (const command of GATE_COMMANDS.GREEN_PARKING.CLOSE) {
                        const message = `\x02${command}\x03\r\n`;
                        success = await gate.sendCommand(message);
                        if (!success) break;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            } else {
                if (cmd === 'open') {
                    success = await gate.sendCommand(GATE_COMMANDS.OPEN);
                } else if (cmd === 'close') {
                    const resetCmd = isNewController ? GATE_COMMANDS.RESET_NEW : GATE_COMMANDS.RESET_OLD;
                    success = await gate.sendCommand(resetCmd);
                    if (success) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        success = await gate.sendCommand(GATE_COMMANDS.CLOSE);
                    }
                }
            }

            if (success) {
                const targetStatus = cmd === 'open' ? true : false;

                gate.currentStatus = cmd;
                gate.updateDatabase();

                if (type === 'single') {
                    socket.emit('setGate', {
                        ipaddress: targetIp,
                        status: targetStatus,
                        cmd,
                        type
                    });
                }

                return { success: true, ipaddress: targetIp };
            } else {
                throw new Error('명령 전송 실패');
            }
        } catch (error) {
            console.error(`[${targetIp}] Command failed: ${error.message}`);

            if (type === 'single') {
                socket.emit('setGate', {
                    ipaddress: targetIp,
                    status: 'error',
                    message: error.message,
                    cmd,
                    type
                });
            }

            return { success: false, error: error.message, ipaddress: targetIp };
        }
    };

    if (type === 'group' || type === 'all') {
        const targets = type === 'group' ? ipaddresses : Array.from(gateManager.gates.keys());

        if (!targets?.length) {
            socket.emit('setGate', {
                status: 'error',
                message: '대상 게이트가 없습니다.',
                cmd,
                type
            });
            return;
        }

        const results = [];

        for (let i = 0; i < targets.length; i += 5) {
            const batch = targets.slice(i, i + 5);
            const batchResults = await Promise.allSettled(
                batch.map(ip => gateManager.operationQueue.add(() => executeCommand(ip)))
            );
            results.push(...batchResults);

            if (i + 5 < targets.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const successes = results
            .filter(r => r.status === 'fulfilled' && r.value.success)
            .map(r => r.value.ipaddress)
            .filter(ip => ip && ip !== 'unknown');

        const errors = results
            .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.success !== true))
            .map(r => ({
                ipaddress: r.status === 'fulfilled' ? r.value?.ipaddress || 'unknown' : 'unknown',
                message: r.status === 'fulfilled' ? r.value?.error || 'Unknown error' : r.reason?.message || 'Promise rejected'
            }));

        await gateManager.operationQueue.add(async () => {
            try {
                await addOperLog({
                    logAction: 'addoper',
                    operatorId: id,
                    logType: `${type} gates control`,
                    logDescription: `Controlled ${targets.length} gates: ${successes.length} succeeded, ${errors.length} failed`
                });
            } catch (logError) {
                console.error('Failed to add operation log:', logError.message);
            }
        });

        socket.emit('setGate', {
            status: errors.length === 0 ? 'success' : (successes.length === 0 ? 'error' : 'partial'),
            message: `${targets.length}개 중 ${successes.length}개 성공, ${errors.length}개 실패`,
            successList: successes,
            errorList: errors,
            cmd,
            type
        });

        return;
    }

    // single 타입 처리
    if (!ipaddress) {
        socket.emit('setGate', {
            status: 'error',
            message: 'IP 주소가 필요합니다.',
            cmd,
            type
        });
        return;
    }

    const result = await gateManager.operationQueue.add(() => executeCommand(ipaddress));

    if (result.success) {
        const description = `${area_name || 'Unknown'} ${location === 'upstream' ? '상류' : '하류'} 차단기(${ipaddress}) ${cmd === 'open' ? '열림' : '닫힘'}`;

        await gateManager.operationQueue.add(async () => {
            try {
                await addOperLog({
                    logAction: 'addoper',
                    operatorId: id,
                    logType: 'Gate control',
                    logDescription: description
                });
            } catch (logError) {
                console.error('운영 로그 추가 실패:', logError.message);
            }
        });
    }
};

const handleGateManagement = async (data) => {
    logger.info('게이트 관리 요청:', data);

    let gateData = Array.isArray(data) ? data[0] : data;
    const { cmd, ipaddress, controllerModel, id } = gateData;

    if (!cmd || !ipaddress) {
        console.error('필수 정보 누락:', { cmd, ipaddress });
        return;
    }

    try {
        let result = false;
        let description = '';

        if (cmd === 'add') {
            result = gateManager.addGate(ipaddress, controllerModel);
            description = `게이트(${ipaddress}) 추가 - ${controllerModel}`;

        } else if (cmd === 'modify') {
            result = gateManager.modifyGate(ipaddress, controllerModel);
            description = `게이트(${ipaddress}) 수정 - ${controllerModel}`;

        } else if (cmd === 'remove') {
            gateManager.removeGate(ipaddress);
            result = true;
            description = `게이트(${ipaddress}) 제거`;
        }

        if (result) {
            logger.info(`[${ipaddress}] ${cmd} 완료`);

            try {
                await addOperLog({
                    logAction: 'addoper',
                    operatorId: id,
                    logType: `Gate ${cmd}`,
                    logDescription: description
                });
            } catch (logError) {
                console.error('운영 로그 추가 실패:', logError.message);
            }
        }

    } catch (error) {
        console.error(`게이트 관리 오류: ${error.message}`);
    }
};

const cleanup = () => {
    logger.info('서비스 종료 - 게이트 매니저 정리');
    gateManager.cleanup();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = async (io) => {
    if (global.gateEventEmitter) {
        global.gateEventEmitter.on('setGate', (data) => {
            io.emit('setGate', data);
        });
        global.gateEventEmitter.ready = true;
    }

    io.on("connection", (socket) => {
        logger.info(`차단기 소켓 연결: ${socket.handshake.address}/${socket.id}`);

        socket.on("setGate", (data) => {
            handleGateControl(data, socket);
        });

        socket.on("manageGate", (data) => {
            handleGateManagement(data);
        });
    });

    await gateManager.initialize();
};

module.exports.initializeCrossingGates = () => gateManager.initialize();
module.exports.gateManager = gateManager;
