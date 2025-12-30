const net = require("net");
const EventEmitter = require("events");
const { addOperLog } = require("../../utils/addOperLog");
const { pool } = require('../../db/postgresqlPool');

const STATUS_CHECK_INTERVAL = 5000;
const RETRY_INTERVAL = 5 * 60 * 1000;

const PROTOCOL_CONFIG = {
    DELIMITER_START: '#####',
    DELIMITER_END: '$$$$$',
    RS232_START: '\x02',
    RS232_END: '\x03',
    KEEP_ALIVE_INTERVAL: 10 * 1000,
    TIMEOUT_DURATION: 30 * 1000,
    RECONNECT_DELAY: 5000,
};

const MESSAGE_KINDS = {
    KEEP_ALIVE: 'keep_alive',
    CONTROL: 'control',
    GATE_COMM_TX: 'gate_comm_tx',
    GATE_COMM_RX: 'gate_comm_rx'
};

const GATE_COMMANDS = {
    OPEN: { kind: MESSAGE_KINDS.CONTROL, direction: 'up_and_lock' },
    CLOSE: [
        { kind: MESSAGE_KINDS.CONTROL, direction: 'unlock' },
        { kind: MESSAGE_KINDS.CONTROL, direction: 'down' }
    ],
    STATUS: { kind: MESSAGE_KINDS.GATE_COMM_TX, data: '\x02ZBP\x03' },
    KEEP_ALIVE: { kind: MESSAGE_KINDS.KEEP_ALIVE }
};

global.gateEventEmitter = new EventEmitter();

const retryTimeouts = new Map();
const state = {
    gateConnections: [],
    addedGates: new Map(),
    controlMap: new Map(),
    connectionStates: new Map(),
    lastKnownStatus: new Map(),
};

const validateControllerModel = (controllerModel, ipaddress) => {
    const validModels = ['위즈넷', '일체형', '그린파킹'];
    if (!controllerModel || !validModels.includes(controllerModel)) {
        console.error(`Invalid controller_model ${ipaddress}: ${controllerModel}`);
        return false;
    }
    return true;
};

const createProtocolMessage = (messageObject) => {
    try {
        return `${PROTOCOL_CONFIG.DELIMITER_START}${JSON.stringify(messageObject)}${PROTOCOL_CONFIG.DELIMITER_END}`;
    } catch (error) {
        console.error('메시지 생성 중 오류:', error);
        throw new Error('프로토콜 메시지 생성 실패');
    }
};

const connectGreenParkingGateTcp = async (ipaddress, retryCount = 0, force = true) => {
    const currentState = state.connectionStates.get(ipaddress) || 'disconnected';
    if (!force && (currentState === 'connecting' || currentState === 'retrying' || currentState === 'connected')) {
        console.log(`Skip connect to ${ipaddress}, current state: ${currentState}`);
        return state.gateConnections.find(conn => conn.ipaddress === ipaddress)?.socket || null;
    }

    const port = 33001;
    console.log(`Connecting to 그린파킹 ${ipaddress}:${port}, retry: ${retryCount}, force: ${force}`);
    state.connectionStates.set(ipaddress, 'connecting');

    const socket = net.connect({ host: ipaddress, port, timeout: PROTOCOL_CONFIG.TIMEOUT_DURATION });
    socket.setEncoding("utf8");
    socket.setKeepAlive(true, PROTOCOL_CONFIG.KEEP_ALIVE_INTERVAL);

    let buffer = '';
    return new Promise((resolve) => {
        socket.on('connect', () => {
            state.gateConnections = state.gateConnections.filter(g => g.ipaddress !== ipaddress);
            state.gateConnections.push({ ipaddress, socket });
            state.connectionStates.set(ipaddress, 'connected');
            retryCount = 0;

            const aliveTimeoutId = setInterval(() => {
                try {
                    const keepAliveMessage = createProtocolMessage(GATE_COMMANDS.KEEP_ALIVE);
                    socket.write(keepAliveMessage);
                    console.log(`Keep-alive 전송 (${ipaddress}): ${keepAliveMessage}`);
                } catch (error) {
                    console.error(`Keep-alive 전송 실패 (${ipaddress}):`, error);
                }
            }, PROTOCOL_CONFIG.KEEP_ALIVE_INTERVAL);

            state.gateConnections.find(conn => conn.ipaddress === ipaddress).aliveTimeoutId = aliveTimeoutId;
            console.log(`Connected to ${ipaddress}:${port}`);
            resolve(socket);

            if (retryTimeouts.has(ipaddress)) {
                clearTimeout(retryTimeouts.get(ipaddress));
                retryTimeouts.delete(ipaddress);
            }
        });

        socket.on('error', async (err) => {
            console.log(`Connection error for ${ipaddress}: ${err.message}`);
            buffer = '';
            state.connectionStates.set(ipaddress, 'disconnected');
            await updateGateStatusInDB(ipaddress, 'disconnect');
            socket.destroy();
            scheduleRetry(ipaddress, retryCount + 1);
            resolve(null);
        });

        socket.on('close', async () => {
            console.log(`Connection closed for ${ipaddress}`);
            buffer = '';
            state.gateConnections = state.gateConnections.filter(g => g.ipaddress !== ipaddress);
            state.connectionStates.set(ipaddress, 'disconnected');
            await updateGateStatusInDB(ipaddress, 'disconnect');
            scheduleRetry(ipaddress, retryCount + 1);
            resolve(null);
        });

        socket.on('timeout', () => {
            console.log(`Timeout for ${ipaddress}`);
            state.connectionStates.set(ipaddress, 'disconnected');
            socket.destroy();
            scheduleRetry(ipaddress, retryCount + 1);
            resolve(null);
        });
    });
};

const scheduleRetry = async (ipaddress, retryCount) => {
    const delay = Math.min(30000 * Math.pow(2, retryCount), 120000); // 30초, 1분, 2분, 최대 2분
    console.log(`Scheduling retry: ${ipaddress}, delay: ${delay}ms, retry: ${retryCount}`);
    state.connectionStates.set(ipaddress, 'retrying');
    const timeout = setTimeout(() => {
        state.connectionStates.delete(ipaddress);
        connectGreenParkingGateTcp(ipaddress, retryCount + 1);
    }, delay);
    retryTimeouts.set(ipaddress, timeout);
};

const sendCommand = async (socket, command, ipaddress) => {
    if (socket.destroyed) {
        return Promise.reject(new Error(`Socket is destroyed for ${ipaddress}`));
    }
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Command timeout for ${ipaddress}`));
        }, PROTOCOL_CONFIG.TIMEOUT_DURATION);
        const errorHandler = (err) => {
            clearTimeout(timeout);
            socket.removeListener('error', errorHandler);
            reject(err);
        };
        socket.once('error', errorHandler);
        socket.write(command, () => {
            clearTimeout(timeout);
            socket.removeListener('error', errorHandler);
            resolve();
        });
    });
};

const parseReceivedData = async (buffer, ipaddress) => {
    try {
        while (buffer.length > 0) {
            const protocolStart = buffer.indexOf(PROTOCOL_CONFIG.DELIMITER_START);
            const protocolEnd = buffer.indexOf(PROTOCOL_CONFIG.DELIMITER_END);
            if (protocolStart >= 0 && protocolEnd > protocolStart) {
                const jsonData = buffer.slice(protocolStart + 5, protocolEnd);
                try {
                    const obj = JSON.parse(jsonData);
                    await handleReceivedMessage(obj, ipaddress);
                } catch (parseError) {
                    console.error(`JSON 파싱 오류 (${ipaddress}):`, parseError, 'Data:', jsonData);
                }
                buffer = buffer.slice(protocolEnd + 5);
            } else {
                break;
            }
        }
        return buffer;
    } catch (error) {
        console.error(`데이터 파싱 오류 (${ipaddress}):`, error);
        return '';
    }
};

const handleReceivedMessage = async (obj, ipaddress) => {
    try {
        if (obj.kind === MESSAGE_KINDS.GATE_COMM_RX) {
            console.log(`상태 데이터 수신 (${ipaddress})`);
            let data = obj.data;

            if (data.startsWith(PROTOCOL_CONFIG.RS232_START) && data.endsWith(PROTOCOL_CONFIG.RS232_END)) {
                data = data.slice(1, -1);
            }

            let cmd;
            if (data.includes('4')) {
                console.log(`차단기 상태: CLOSE (${ipaddress})`);
                cmd = 'close';
            } else if (data.includes('6')) {
                console.log(`차단기 상태: OPEN (${ipaddress})`);
                cmd = 'open';
            } else if (data.includes('5')) {
                console.log(`차단기 상태: DISCONNECT (${ipaddress})`);
                cmd = 'disconnect';
            } else {
                console.log(`알 수 없는 상태 데이터 (${ipaddress}):`, data);
                return;
            }

            if (cmd && !state.controlMap.has(ipaddress)) {
                state.lastKnownStatus.set(ipaddress, cmd);
                await updateGateStatusInDB(ipaddress, cmd, true);
                if (state.controlMap.has(ipaddress)) {
                    const { area_name, location, cmd: controlCmd, userId, socket } = state.controlMap.get(ipaddress);
                    if (cmd === controlCmd) {
                        const description = `${area_name} ${location === 'upstream' ? '상류' : '하류'} 차단기(${ipaddress}) ${cmd === 'open' ? '열림' : '닫힘'}`;
                        await addOperLog({
                            logAction: 'addoper',
                            operatorId: userId,
                            logType: 'Gate control',
                            logDescription: description
                        });
                        socket.emit('setGate', {
                            location,
                            area_name,
                            cmd,
                            ipaddress,
                            status: 'success'
                        });
                        state.controlMap.delete(ipaddress);
                    }
                }
            }
        } else if (obj.kind === MESSAGE_KINDS.KEEP_ALIVE) {
            console.log(`Keep-alive 응답 처리 (${ipaddress})`);
            const connection = state.gateConnections.find(conn => conn.ipaddress === ipaddress);
            if (connection?.timeoutId) {
                clearTimeout(connection.timeoutId);
            }
            const timeoutId = setTimeout(() => {
                console.log(`Keep-alive 타임아웃 (${ipaddress})`);
                connection?.socket?.destroy();
            }, PROTOCOL_CONFIG.TIMEOUT_DURATION);
            connection.timeoutId = timeoutId;
        } else {
            console.log(`알 수 없는 메시지 종류 (${ipaddress}):`, obj.kind);
        }
    } catch (error) {
        console.error(`수신 메시지 처리 오류 (${ipaddress}):`, error);
        await updateGateStatusInDB(ipaddress, 'disconnect');
    }
};

const handleGateControl = async (data, socket) => {
    const { ipaddress, cmd, id, type = 'single', ipaddresses, area_name, location } = data;
    const executeCommand = async (targetIp) => {
        const findSocket = state.gateConnections.find(conn => conn.ipaddress === targetIp);
        if (!findSocket) {
            console.log(`No active connection for ${targetIp}`);
            socket.emit('setGate', {
                ipaddress: targetIp,
                status: 'error',
                message: '소켓 연결 없음',
                cmd,
                type
            });
            return { success: false, error: '소켓 연결 없음', ipaddress: targetIp };
        }

        const controllerModel = state.addedGates.get(targetIp);
        if (!validateControllerModel(controllerModel, targetIp)) {
            socket.emit('setGate', {
                ipaddress: targetIp,
                status: 'error',
                message: '유효하지 않은 controller_model',
                cmd,
                type
            });
            return { success: false, error: 'Invalid controller_model', ipaddress: targetIp };
        }

        try {
            state.controlMap.set(targetIp, { area_name, location, ipaddress: targetIp, cmd, userId: id, socket });
            if (cmd === 'open') {
                const message = createProtocolMessage(GATE_COMMANDS.OPEN);
                await sendCommand(findSocket.socket, message, targetIp);
            } else if (cmd === 'close') {
                for (const command of GATE_COMMANDS.CLOSE) {
                    const message = createProtocolMessage(command);
                    await sendCommand(findSocket.socket, message, targetIp);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            await updateGateStatusInDB(targetIp, cmd, true);
            return { success: true, ipaddress: targetIp };
        } catch (error) {
            console.error(`Command failed for ${targetIp}: ${error.message}`);
            socket.emit('setGate', {
                ipaddress: targetIp,
                status: 'error',
                message: `명령 실패: ${error.message}`,
                cmd,
                type
            });
            return { success: false, error: error.message, ipaddress: targetIp };
        } finally {
            setTimeout(() => state.controlMap.delete(targetIp), 10000);
        }
    };

    if (type === 'group' || type === 'all') {
        const targets = type === 'group' ? ipaddresses : Array.from(state.addedGates.keys());
        if (!targets?.length) {
            socket.emit('setGate', { status: 'error', message: 'No gates specified', cmd, type });
            return;
        }

        const results = await Promise.all(targets.map(executeCommand));
        const successes = results.filter(r => r.success).map(r => r.ipaddress);
        const errors = results.filter(r => !r.success).map(r => ({ ipaddress: r.ipaddress, message: r.error }));

        await addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: `${type} gates control`,
            logDescription: `Controlled ${targets.length} gates: ${successes.length} succeeded, ${errors.length} failed`,
        });

        socket.emit('setGate', {
            status: errors.length === 0 ? 'success' : successes.length > 0 ? 'partial' : 'error',
            message: `${targets.length}개 중 ${successes.length}개 성공, ${errors.length}개 실패`,
            successList: successes,
            errorList: errors,
            cmd,
            type,
        });
        return;
    }

    const result = await executeCommand(ipaddress);
    if (result.success) {
        const description = `${area_name} ${location === 'upstream' ? '상류' : '하류'} 차단기(${ipaddress}) ${cmd === 'open' ? '열림' : '닫힘'}`;
        await addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'Gate control',
            logDescription: description
        });
    }
};

const handleGateManagement = (data) => {
    if (!data?.cmd || !data?.ipaddress || !data?.controllerModel) {
        console.log(`Invalid manageGate data: ${JSON.stringify(data)}`);
        return;
    }
    const { cmd, ipaddress, controllerModel, id } = data;

    if (!validateControllerModel(controllerModel, ipaddress)) return;

    if (cmd === "add") {
        if (!state.addedGates.has(ipaddress)) {
            console.log(`${ipaddress} gate added with ${controllerModel}`);
            state.addedGates.set(ipaddress, controllerModel);
            connectGreenParkingGateTcp(ipaddress);
            addOperLog({
                logAction: 'addoper',
                operatorId: id,
                logType: 'Gate added',
                logDescription: `Gate(${ipaddress}) added with ${controllerModel}`
            });
        }
    } else if (cmd === "modify") {
        console.log(`${ipaddress} gate modify`);
        const targetSocket = state.gateConnections.find(item => item.ipaddress === ipaddress);
        addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'Gate modify',
            logDescription: `Gate(${ipaddress}) modify`
        });
        if (targetSocket?.socket) targetSocket.socket.destroy();
        state.gateConnections = state.gateConnections.filter(item => item.ipaddress !== ipaddress);
        state.addedGates.delete(ipaddress);
    } else if (cmd === "remove") {
        console.log(`${ipaddress} gate removed`);
        const targetSocket = state.gateConnections.find(item => item.ipaddress === ipaddress);
        addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'Gate removed',
            logDescription: `Gate(${ipaddress}) removed`
        });
        if (targetSocket?.socket) targetSocket.socket.destroy();
        state.gateConnections = state.gateConnections.filter(item => item.ipaddress !== ipaddress);
        state.addedGates.delete(ipaddress);
    }
};

const updateGateStatusInDB = async (ipaddress, cmd, emitSetGate = true) => {
    const checkQuery = `SELECT crossing_gate_status FROM fl_outside WHERE crossing_gate_ip=$1`;
    const updateQuery = `UPDATE fl_outside SET crossing_gate_status=$1, linked_status=$2 WHERE crossing_gate_ip=$3`;
    const status = cmd === 'open' ? true : cmd === 'close' ? false : null;
    const linkedStatus = cmd === 'disconnect' ? false : true;
    for (let attempt = 0; attempt < 3; attempt++) {
        let client;
        try {
            client = await pool.connect();
            const checkResult = await client.query(checkQuery, [ipaddress]);
            if (!checkResult.rows.length || checkResult.rows[0].crossing_gate_status !== status) {
                const res = await client.query(updateQuery, [status, linkedStatus, ipaddress]);
                if (res && res.rowCount > 0) {
                    global.websocket.emit('fl_areaList-update', { areaList: res.rowCount });
                    global.websocket.emit('fl_crossingGates-update', { crossingGates: status });
                    if (emitSetGate) {
                        global.gateEventEmitter.emit('setGate', { ipaddress, status });
                        global.websocket.emit('setGate', { ipaddress, status, cmd });
                    }
                }
                client.release();
                return res.rowCount > 0;
            }
            client.release();
            return false;
        } catch (error) {
            if (client) {
                try { client.release(); } catch (releaseError) { }
            }
            if (attempt < 2) {
                const delay = 1000 * Math.pow(2, attempt); // 1초, 2초, 4초
                console.warn(`DB update failed for ${ipaddress} (attempt ${attempt + 1}): ${error.message}, retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`DB update failed for ${ipaddress}: ${error.message}, Cmd: ${cmd}`);
                return false;
            }
        }
    }
};

const initializeCrossingGates = async () => {
    try {
        const client = await pool.connect();
        const query = `SELECT crossing_gate_ip, controller_model FROM fl_outside WHERE controller_model = '그린파킹'`;
        const result = await client.query(query);
        client.release();

        if (result?.rows?.length > 0) {
            const connectionPromises = result.rows
                .filter(gate => gate.crossing_gate_ip)
                .map(gate => {
                    const ipaddress = gate.crossing_gate_ip;
                    const controllerModel = gate.controller_model;
                    if (!validateControllerModel(controllerModel, ipaddress)) {
                        console.log(`Skipping gate ${ipaddress} due to invalid controller_model`);
                        return Promise.resolve();
                    }
                    state.addedGates.set(ipaddress, controllerModel);
                    console.log(`Added 그린파킹 gate: ${ipaddress} with ${controllerModel}`);
                    return connectGreenParkingGateTcp(ipaddress)
                        .catch(error => {
                            console.error(`그린파킹 Gate ${ipaddress} connection error:`, error);
                            return updateGateStatusInDB(ipaddress, 'disconnect');
                        });
                });

            await Promise.all(connectionPromises);
            console.log('Final 그린파킹 addedGates:', Array.from(state.addedGates.entries()));
        } else {
            console.log('No crossing gates in database');
        }
    } catch (error) {
        console.error('그린파킹 Crossing gate initialization error:', error);
    }
};

module.exports = async (io) => {
    io.on("connection", (socket) => {
        console.log(`그린파킹 crossinggate socket Connected: ${socket.handshake.address}/${socket.id}`);
        socket.on("greenParkingSetGate", (data) => {
            handleGateControl(data, socket);
        });
        socket.on("manageGate", (data) => handleGateManagement(data));
    });

    io.use((socket, next) => {
        socket.onAny((event, ...args) => {
            console.log(`Received (${socket.id}): ${event}`, JSON.stringify(args));
        });
        const originalEmit = socket.emit;
        socket.emit = function (event, ...args) {
            return originalEmit.apply(socket, [event, ...args]);
        };
        next();
    });

    await initializeCrossingGates();
};