const EventEmitter = require("events");
const { pool } = require("../../../db/postgresqlPool");
const logger = require("../../../logger");
const { addOperLog } = require("../../../utils/addOperLog");
const { executeAutoControlWithGroupCheck } = require('./waterlevelAutoControl');

const waterLevelState = new Map();
const waterLevelEmitter = new EventEmitter();

const processAiboxWaterLevelData = async (aiboxData, requestIp) => {
    try {
        let aiboxInfo, cameraData, systemInfo;
        
        try {
            aiboxInfo = JSON.parse(aiboxData.aibox_info);
            cameraData = JSON.parse(aiboxData.cameraData);
            systemInfo = JSON.parse(aiboxData.system_info);
        } catch (parseError) {
            return { success: false, message: `JSON 파싱 오류: ${parseError.message}` };
        }

        let aiBoxIp = null;
        if (requestIp && typeof requestIp === 'string') {
            aiBoxIp = requestIp.replace(/^::ffff:/, '');
        } else if (aiboxInfo.ai_box_ip) {
            aiBoxIp = aiboxInfo.ai_box_ip;
        }

        if (!aiBoxIp) {
            return { success: false, message: 'AIBOX IP를 찾을 수 없음' };
        }

        let waterLevelValue = 0;
        
        if (aiboxData.waterHeight && aiboxData.waterHeight !== '보통') {
            const heightFloat = parseFloat(aiboxData.waterHeight);
            if (!isNaN(heightFloat)) {
                waterLevelValue = heightFloat * 1000; // m -> mm
            } else {
                console.warn(`[AIBOX] 잘못된 waterHeight 값: ${aiboxData.waterHeight}, 0으로 설정`);
            }
        } 

        const client = await pool.connect();
        try {
            const query = `
                SELECT idx as water_level_idx, water_level_ip, water_level_name, 
                    water_level_location, threshold
                FROM fl_water_level
                WHERE water_level_model = 'AI BOX' 
                AND water_level_ip = $1
            `;

            const result = await client.query(query, [aiBoxIp]);

            if (result.rows.length === 0) {
                return { success: false, message: `수위계 장치를 찾을 수 없음 (IP: ${aiBoxIp})` };
            }

            const waterLevelDevice = result.rows[0];
            const thresholdInMeters = parseFloat(waterLevelDevice.threshold) || 0;
            const thresholdInMm = thresholdInMeters * 1000; // m -> mm

            waterLevelEmitter.emit("data", {
                ip: aiBoxIp,
                waterLevel: waterLevelValue,
                timestamp: new Date()
            });

            if (waterLevelValue > thresholdInMm && thresholdInMm > 0) {
                console.log(`[AIBOX] 임계치 초과! EventEmitter thresholdExceeded 이벤트 발생`);
                waterLevelEmitter.emit("thresholdExceeded", {
                    ip: aiBoxIp,
                    waterLevel: waterLevelValue,
                    threshold: thresholdInMm
                });

                try {
                    logger.info(`[AIBOX] 자동제어 실행 시작 (그룹 체크 포함): IP: ${aiBoxIp}`);
                    await executeAutoControlWithGroupCheck(aiBoxIp, waterLevelValue, thresholdInMm);
                } catch (error) {
                    logger.error(`[AIBOX] 자동제어 실행 중 오류: ${aiBoxIp} - ${error.message}`);
                }
            }

            return {
                success: true,
                message: 'AIBOX 수위 데이터 처리 완료',
                data: {
                    ip: aiBoxIp,
                    waterLevel: waterLevelValue,
                    waterHeight: aiboxData.waterHeight,
                    device: waterLevelDevice
                }
            };

        } finally {
            client.release();
        }

    } catch (error) {
        logger.error(`[AIBOX] 데이터 처리 오류: ${error.message}`);
        return { success: false, message: error.message };
    }
};

const handleWaterLevelManagement = (data) => {
    const eventData = Array.isArray(data) ? data[0] : data;

    if (!eventData.cmd || !eventData.ipaddress || !eventData.water_level_port) {
        console.log(`[AIBOX] Invalid manageWaterLevel data: ${JSON.stringify(data)}`);
        return;
    }
    const { cmd, ipaddress, water_level_port, id } = eventData;

    if (water_level_port !== '80' && water_level_port !== '8080') {
        console.log(`[AIBOX] AIBox가 아닌 수위계 무시: ${ipaddress}:${water_level_port}`);
        return;
    }

    if (cmd === "add") {
        console.log(`[AIBOX] 수위계 추가: ${ipaddress}:${water_level_port}`);
        addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'AIBox WaterLevel added',
            logDescription: `AIBox WaterLevel(${ipaddress}:${water_level_port}) added`
        });
    } else if (cmd === "modify") {
        console.log(`[AIBOX] 수위계 수정: ${ipaddress}:${water_level_port}`);
        addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'AIBox WaterLevel modify',
            logDescription: `AIBox WaterLevel(${ipaddress}:${water_level_port}) modify`
        });
    } else if (cmd === "remove") {
        console.log(`[AIBOX] 수위계 삭제: ${ipaddress}:${water_level_port}`);
        addOperLog({
            logAction: 'addoper',
            operatorId: id,
            logType: 'AIBox WaterLevel removed',
            logDescription: `AIBox WaterLevel(${ipaddress}:${water_level_port}) removed`
        });
    }
};

module.exports = {
    waterLevelEmitter,
    processAiboxWaterLevelData,
    handleWaterLevelManagement
};