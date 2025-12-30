const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const outsideMapper = require('../../routes/inundationControl/mappers/outsideMapper');
const billboardMapper = require('../../routes/inundationControl/mappers/billboardMapper');
const speakerMapper = require('../../routes/inundationControl/mappers/speakerMapper');
const waterLevelMapper = require('../../routes/inundationControl/mappers/waterLevelMapper');
const cameraMapper = require('../../routes/observer/mappers/cameraMapper');
const vmsMapper = require('../../routes/observer/mappers/vmsMapper');
const ping = require('ping');
const { insertLog } = require('../../routes/common/services/commonService');
const mainServiceName = 'inundation';

const PERFORMANCE_CONFIG = {
    BATCH_SIZE: 3,
    PING_TIMEOUT: 2,
    PING_RETRIES: 2,
    CHUNK_DELAY: 2000,
    MAX_CONCURRENT_PINGS: 5,
    DB_BATCH_SIZE: 5,
    ERROR_RETRY_DELAY: 30000,
};

const deviceCaches = {
    waterLevel: new Map(),
    speaker: new Map(),
    camera: new Map(),
    billboard: new Map()
};

let isCacheInitialized = false;

const initializeDeviceCaches = async () => {
    try {
        logger.info('Initializing device caches...');

        const waterLevelQuery = await waterLevelMapper.getWaterLevelDeviceList();
        const waterLevelResult = await pool.query(waterLevelQuery);
        waterLevelResult.rows.forEach(data => {
            if (data.water_level_ip) {
                deviceCaches.waterLevel.set(data.water_level_idx, {
                    ip: data.water_level_ip,
                    linkedStatus: data.linked_status == null ? false : Boolean(data.linked_status),
                    name: data.water_level_name,
                    model: data.water_level_model,
                    idx: data.water_level_idx
                });
            }
        });

        const speakerQuery = await speakerMapper.getSpeakerList();
        const speakerResult = await pool.query(speakerQuery);
        speakerResult.rows.forEach(data => {
            if (data.speaker_ip) {
                deviceCaches.speaker.set(data.speaker_idx, {
                    ip: data.speaker_ip,
                    linkedStatus: data.linked_status == null ? false : Boolean(data.linked_status),
                    name: data.speaker_name,
                    idx: data.speaker_idx
                });
            }
        });

        const billboardQuery = await billboardMapper.getBillboardList();
        const billboardResult = await pool.query(billboardQuery);
        billboardResult.rows.forEach(data => {                  
            if (data.billboard_ip) {
                deviceCaches.billboard.set(data.billboard_idx, {
                    ip: data.billboard_ip,  
                    linkedStatus: data.linked_status == null ? false : Boolean(data.linked_status),
                    name: data.billboard_name,
                    idx: data.billboard_idx
                });
            }
        });

        const binds = [mainServiceName];
        const vmsQuery = await vmsMapper.getVmsList();
        const vmsResult = await pool.query(vmsQuery, binds);

        for (let vmsData of vmsResult.rows) {
            const cameraBinds = [vmsData.vms_name, mainServiceName, mainServiceName];
            const cameraQuery = await cameraMapper.getVmsNameCameraList();
            const cameraResult = await pool.query(cameraQuery, cameraBinds);

            cameraResult.rows.forEach(cameraData => {
                if (cameraData.camera_ip) {
                    deviceCaches.camera.set(cameraData.camera_id, {
                        ip: cameraData.camera_ip,
                        linkedStatus: cameraData.linked_status == null ? false : Boolean(cameraData.linked_status),
                        name: cameraData.camera_name,
                        vmsName: cameraData.vms_name,
                        cameraId: cameraData.camera_id,
                        idx: cameraData.camera_id
                    });
                }
            });
        }

        isCacheInitialized = true;
        logger.debug(`Device caches initialized: ` +
            `WaterLevel(${deviceCaches.waterLevel.size}), ` +
            `Speaker(${deviceCaches.speaker.size}), ` +
            `Camera(${deviceCaches.camera.size}), ` +
            `Billboard(${deviceCaches.billboard.size})`
        );
    } catch (error) {
        logger.error('Error initializing device caches:', error);
        isCacheInitialized = false;
    }
};

const updateSpeakersBatch = async (changedDevices) => {
    if (changedDevices.length === 0) return;

    const client = await pool.connect();
    const timeout = setTimeout(() => {
        if (client) {
            client.release();
        }
    }, 10000);
    try {
        await client.query('BEGIN');

        const connectedDevices = changedDevices.filter(device => device.newStatus === true);
        const disconnectedDevices = changedDevices.filter(device => device.newStatus === false);

        if (connectedDevices.length > 0) {
            const connectedIds = connectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE fl_speaker SET linked_status = true WHERE idx = ANY($1)`,
                [connectedIds]
            );
        }

        if (disconnectedDevices.length > 0) {
            const disconnectedIds = disconnectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE fl_speaker SET linked_status = false WHERE idx = ANY($1)`,
                [disconnectedIds]
            );
        }

        await client.query('COMMIT');

        for (const device of changedDevices) {
            deviceCaches.speaker.get(device.idx).linkedStatus = device.newStatus;

            if (global.websocket) {
                global.websocket.emit('fl_speaker-update', {
                    id: device.idx,
                    speakerip: device.ip,
                    linkedstatus: device.newStatus,
                    speakername: device.name,
                    timestamp: new Date().toISOString()
                });
            }

            if (!device.newStatus) {
                await insertLog('System', 'ping', `${device.name} / ip:${device.ip} 연결 끊김`, 'worker/inundation/checkPingDevices.js');
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Speaker batch update error:', error);
        throw error;
    } finally {
        if (timeout) clearTimeout(timeout);
        client.release();
    }
};

const updateBillboardsBatch = async (changedDevices) => {
    if (changedDevices.length === 0) return;

    const client = await pool.connect();
    const timeout = setTimeout(() => {
        if (client) {
            client.release();
        }
    }, 10000);
    try {
        await client.query('BEGIN');

        const connectedDevices = changedDevices.filter(device => device.newStatus === true);
        const disconnectedDevices = changedDevices.filter(device => device.newStatus === false);

        if (connectedDevices.length > 0) {
            const connectedIds = connectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE fl_billboard SET linked_status = true WHERE idx = ANY($1)`,
                [connectedIds]
            );
        }

        if (disconnectedDevices.length > 0) {
            const disconnectedIds = disconnectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE fl_billboard SET linked_status = false WHERE idx = ANY($1)`,
                [disconnectedIds]
            );
        }

        await client.query('COMMIT');

        for (const device of changedDevices) {
            deviceCaches.billboard.get(device.idx).linkedStatus = device.newStatus;

            if (global.websocket) {
                global.websocket.emit('fl_billboard-update', {
                    id: device.idx,
                    billboardip: device.ip,
                    linkedstatus: device.newStatus,
                    billboardname: device.name,
                    timestamp: new Date().toISOString()
                });
            }

            if (!device.newStatus) {
                await insertLog('System', 'ping', `${device.name} / ip:${device.ip} 연결 끊김`, 'worker/inundation/checkPingDevices.js');
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Billboard batch update error:', error);
        throw error;
    } finally {
        if (timeout) clearTimeout(timeout);
        client.release();
    }
};

const updateCamerasBatch = async (changedDevices) => {
    if (changedDevices.length === 0) return;

    const client = await pool.connect();
    const timeout = setTimeout(() => {
        if (client) {
            client.release();
        }
    }, 10000);
    try {
        await client.query('BEGIN');

        const connectedDevices = changedDevices.filter(device => device.newStatus === true);
        const disconnectedDevices = changedDevices.filter(device => device.newStatus === false);

        if (connectedDevices.length > 0) {
            const connectedIds = connectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE ob_camera SET linked_status = true WHERE camera_id = ANY($1)`,
                [connectedIds]
            );
        }

        if (disconnectedDevices.length > 0) {
            const disconnectedIds = disconnectedDevices.map(device => device.idx);
            await client.query(
                `UPDATE ob_camera SET linked_status = false WHERE camera_id = ANY($1)`,
                [disconnectedIds]
            );
        }

        await client.query('COMMIT');
        clearTimeout(timeout);

        logger.info(`Camera batch update completed: ${changedDevices.length} devices updated`);
        for (const device of changedDevices) {
            deviceCaches.camera.get(device.idx).linkedStatus = device.newStatus;

            if (global.websocket) {
                global.websocket.emit('fl_camera-update', {
                    id: device.idx,
                    cameraip: device.ip,
                    linkedstatus: device.newStatus,
                    cameraname: device.name,
                    vmsname: device.vmsName,
                    timestamp: new Date().toISOString()
                });
            }

            if (!device.newStatus) {
                await insertLog('System', 'ping', `camera ip:${device.ip} / ${device.vmsName} / ${device.cameraId}.${device.name} 연결 끊김`, 'worker/inundation/checkPingDevices.js');
            }
        }

    } catch (error) {
        clearTimeout(timeout);
        await client.query('ROLLBACK');
        logger.error('Camera batch update error:', error);
        throw error;
    } finally {
        client.release();
    }
};

class Semaphore {
    constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            if (this.current < this.max) {
                this.current++;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    release() {
        this.current--;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            this.current++;
            resolve();
        }
    }
}

const concurrencySemaphore = new Semaphore(PERFORMANCE_CONFIG.MAX_CONCURRENT_PINGS);

const parallelPingCheck = async (devices, checkFunction) => {
    const results = [];
    const batchSize = PERFORMANCE_CONFIG.BATCH_SIZE;

    for (let i = 0; i < devices.length; i += batchSize) {
        const batch = devices.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(async (device) => {
                await concurrencySemaphore.acquire();
                try {
                    return await checkFunction(device);
                } finally {
                    concurrencySemaphore.release();
                }
            })
        );

        const successfulResults = batchResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        results.push(...successfulResults);

        if (i + batchSize < devices.length) {
            await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.CHUNK_DELAY));
        }
    }

    return results;
};


exports.checkWaterLevel = async () => {
    try {
        if (!isCacheInitialized) {
            logger.warn('Device cache not initialized, attempting to initialize...');
            await initializeDeviceCaches();

            if (!isCacheInitialized) {
                logger.error('Failed to initialize device cache, skipping this check cycle');
                return;
            }
        }

        const devices = Array.from(deviceCaches.waterLevel.values());
        if (devices.length === 0) {
            logger.info('No water level devices in cache to check');
            return;
        }

        const results = await parallelPingCheck(devices, async (device) => {
            try {
                let isConnected = false;

                if (device.model?.toUpperCase() === 'AI BOX') {
                    const recentDataQuery = `SELECT COUNT(*) as count FROM fl_water_level_log WHERE water_level_idx = $1 AND created_at >= NOW() - INTERVAL '5 minutes'`;
                    const recentDataResult = await pool.query(recentDataQuery, [device.idx]);
                    isConnected = recentDataResult.rows[0].count > 0;
                } else {
                    isConnected = await pingCheck(device.ip);
                }

                if (device.linkedStatus !== isConnected) {
                    const updateQuery = await waterLevelMapper.modifyLinkedStatusWaterLevel();
                    await pool.query(updateQuery, [device.idx, isConnected]);

                    deviceCaches.waterLevel.get(device.idx).linkedStatus = isConnected;

                    if (global.websocket) {
                        global.websocket.emit('fl_waterLevel-update', {
                            id: device.idx,
                            waterlevelip: device.ip,
                            linkedstatus: isConnected,
                            waterlevelname: device.name,
                            timestamp: new Date().toISOString()
                        });
                    }

                    if (!isConnected) {
                        await insertLog('System', 'ping', `${device.name} / ip:${device.ip} 연결 끊김`, 'worker/inundation/checkPingDevices.js');
                    }

                    return { success: true, changed: true, deviceidx: device.idx };
                }

                return { success: true, changed: false, deviceidx: device.idx };
            } catch (error) {
                logger.error(`checkWaterLevel ping error for idx [${device.idx}]: ${error.message}`);
                return { success: false, deviceidx: device.idx, error: error.message };
            }
        });

        const errors = results.filter(r => !r.success);
        if (errors.length > 0) {
            logger.warn(`checkWaterLevel: ${errors.length} checks failed`);
        }

    } catch (error) {
        logger.error('checkWaterLevel error:', error);
    }
};


exports.checkSpeaker = async () => {
    try {
        if (!isCacheInitialized) {
            logger.warn('Device cache not initialized, attempting to initialize...');
            await initializeDeviceCaches();

            if (!isCacheInitialized) {
                logger.error('Failed to initialize device cache, skipping this check cycle');
                return;
            }
        }

        const devices = Array.from(deviceCaches.speaker.values());
        if (devices.length === 0) {
            logger.info('No speakers in cache to check');
            return;
        }

        logger.info(`Checking ${devices.length} speakers from cache...`);

        const results = await parallelPingCheck(devices, async (device) => {
            try {
                const isPingCheck = await pingCheck(device.ip);
                const newLinkedStatus = isPingCheck;

                if (device.linkedStatus !== newLinkedStatus) {
                    return {
                        success: true,
                        changed: true,
                        deviceData: {
                            idx: device.idx,
                            ip: device.ip,
                            name: device.name,
                            oldStatus: device.linkedStatus,
                            newStatus: newLinkedStatus
                        }
                    };
                }

                return { success: true, changed: false, deviceidx: device.idx };
            } catch (error) {
                logger.error(`checkSpeaker ping error for idx [${device.idx}]: ${error.message}`);
                return { success: false, deviceidx: device.idx, error: error.message };
            }
        });

        const changedDevices = results
            .filter(result => result.success && result.changed)
            .map(result => result.deviceData);

        if (changedDevices.length > 0) {
            await updateSpeakersBatch(changedDevices);
            logger.info(`Speaker batch update completed: ${changedDevices.length} devices updated`);
        }

        const errors = results.filter(r => !r.success);
        if (errors.length > 0) {
            logger.warn(`checkSpeaker: ${errors.length} checks failed`);
        }

    } catch (error) {
        logger.error('checkSpeaker error:', error);
    }
};


exports.checkCamera = async () => {
    try {
        if (!isCacheInitialized) {
            logger.warn('Device cache not initialized, attempting to initialize...');
            await initializeDeviceCaches();

            if (!isCacheInitialized) {
                logger.error('Failed to initialize device cache, skipping this check cycle');
                return;
            }
        }

        const devices = Array.from(deviceCaches.camera.values());
        if (devices.length === 0) {
            logger.info('No cameras in cache to check');
            return;
        }

        logger.info(`Checking ${devices.length} cameras from cache...`);

        const results = await parallelPingCheck(devices, async (device) => {
            try {
                const isPingCheck = await pingCheck(device.ip);
                const newLinkedStatus = isPingCheck;

                if (device.linkedStatus !== newLinkedStatus) {
                    return {
                        success: true,
                        changed: true,
                        deviceData: {
                            idx: device.idx,
                            ip: device.ip,
                            name: device.name,
                            vmsName: device.vmsName,
                            cameraId: device.cameraId,
                            oldStatus: device.linkedStatus,
                            newStatus: newLinkedStatus
                        }
                    };
                }

                return { success: true, changed: false, deviceidx: device.idx };
            } catch (error) {
                logger.error(`checkCamera ping error for idx [${device.idx}]: ${error.message}`);
                return { success: false, deviceidx: device.idx, error: error.message };
            }
        });

        const changedDevices = results
            .filter(result => result.success && result.changed)
            .map(result => result.deviceData);

        if (changedDevices.length > 0) {
            await updateCamerasBatch(changedDevices);

        }

        const errors = results.filter(r => !r.success);
        if (errors.length > 0) {
            logger.warn(`checkCamera: ${errors.length} checks failed`);
        }

    } catch (error) {
        logger.error('checkCamera error:', error);
    }
};


exports.checkBillboard = async () => {
    try {
        if (!isCacheInitialized) {
            logger.warn('Device cache not initialized, attempting to initialize...');
            await initializeDeviceCaches();

            if (!isCacheInitialized) {
                logger.error('Failed to initialize device cache, skipping this check cycle');
                return;
            }
        }

        const devices = Array.from(deviceCaches.billboard.values()); 
        if (devices.length === 0) {
            logger.info('No billboards in cache to check');
            return;
        }

        logger.info(`Checking ${devices.length} billboards from cache...`);

        const results = await parallelPingCheck(devices, async (data) => {
            try {
                const isPingCheck = await pingCheck(data.billboard_ip);
                const newLinkedStatus = isPingCheck;
                const currentStatus = data.linked_status == null ? false : Boolean(data.linked_status);

                if (currentStatus !== newLinkedStatus) {
                    const updateQuery = await billboardMapper.modifyLinkedStatusBillboard();
                    await pool.query(updateQuery, [data.billboard_idx, newLinkedStatus]);

                    if (global.websocket) {
                        global.websocket.emit('fl_billboard-update', {
                            id: data.billboard_idx,
                            billboardip: data.billboard_ip,
                            linkedstatus: newLinkedStatus,
                            billboardname: data.billboard_name,
                            timestamp: new Date().toISOString()
                        });
                    }

                    if (!isPingCheck) {
                        await insertLog('System', 'ping', `${data.billboard_name} / ip:${data.billboard_ip} 연결 끊김`, 'worker/inundation/checkPingDevices.js');
                    }

                    return { success: true, changed: true, deviceidx: data.billboard_idx };
                }

                return { success: true, changed: false, deviceidx: data.billboard_idx };
            } catch (error) {
                logger.error(`checkBillboard ping error for billboard [${data.billboard_idx}]: ${error.message}`);
                return { success: false, deviceidx: data.billboard_idx, error: error.message };
            }
        });

        const changedDevices = results
            .filter(result => result.success && result.changed)
            .map(result => result.deviceData);

        if (changedDevices.length > 0) {
            await updateBillboardsBatch(changedDevices);
        }

        const errors = results.filter(r => !r.success);
        if (errors.length > 0) {
            logger.warn(`checkBillboard: ${errors.length} checks failed`);
        }

    } catch (error) {
        logger.error('checkBillboard error:', error);
    }
};

const pingCheck = async (ipaddress, retries = PERFORMANCE_CONFIG.PING_RETRIES, timeout = PERFORMANCE_CONFIG.PING_TIMEOUT) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await ping.promise.probe(ipaddress, {
                timeout: timeout,
                min_reply: 1
            });
            return res.alive;
        } catch (error) {
            if (i === retries - 1) {
                logger.error(`pingCheck: Failed for IP ${ipaddress} after ${retries} attempts:`, error.message);
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return false;
};


exports.initializeDeviceCaches = initializeDeviceCaches;



let retryCount = 0;
const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY = 60000;

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    console.error('Uncaught Exception:', error);

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' ||
        (error.message && error.message.includes('connection'))) {
        logger.info('Critical DB error detected. Initiating graceful restart...');
        setTimeout(() => process.emit('SIGTERM'), 10000);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

    if (reason?.code === 'PGCONNECTIONLIMIT' ||
        (reason?.message && reason.message.includes('pool'))) {
        retryCount++;

        if (retryCount <= MAX_RETRY_COUNT) {
            const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1);
            logger.warn(`Connection pool issue detected. Retry ${retryCount}/${MAX_RETRY_COUNT}, delaying for ${delay / 1000}s`);

            setTimeout(() => {
                logger.info(`Retrying device checks after ${delay / 1000}s delay...`);
                retryCount = Math.max(0, retryCount - 1);
            }, delay);
        } else {
            logger.error(`Max retry count (${MAX_RETRY_COUNT}) exceeded. Initiating system restart...`);
            setTimeout(() => process.emit('SIGTERM'), 5000);
        }
    }
});

setInterval(() => {
    if (retryCount > 0) {
        retryCount = Math.max(0, retryCount - 1);
        logger.info(`Retry counter decremented to: ${retryCount}`);
    }
}, 300000);
