// const parkingProcessService = require('../../services/parking-process.service');
// const plsAdapter = require('./pls.adapter'); 
// const logger = require('../../utils/logger');

// class PlsService {

//     /**
//      * 차량 감지 (Loop) 신호 처리 (알림 전용)
//      */
//     async processVehicleDetection(data) {
//         logger.debug(`[PlsService] 차량 감지 알림: ${data.locationName} (${data.status})`);

//         parkingProcessService.processVehicleDetection(data, 'PLS');
//     }

//     /**
//      * [Step 2] LPR 데이터 처리 -> 입차 판단 -> 차단기 제어
//      */
//     async processLprData(lprData) {
//         const { carNumber, locationName, entryTime, imageUrl } = lprData;
//         logger.info(`[PlsService] 입차 프로세스 시작: ${carNumber} @ ${locationName}`);

//         try {
//             // 1. 위치 정보 매핑 (Location Name -> Lane ID 등)
//             // (실제로는 DB 조회 필요)
//             const siteId = 'site-uuid-placeholder'; 
//             const laneId = 'lane-uuid-placeholder';
            
//             // LPR이 인식된 장비의 IP/Port 정보가 필요함 (제어 명령 전송용)
//             // const targetPls = await ...; 
//             // 임시: 요청에 IP가 없으므로 DB에서 조회했다고 가정
//             const targetIp = '192.168.0.100'; 
//             const targetPort = 80;

//             // 2. [Core] 공통 비즈니스 로직 호출 (입차 허용 여부 판단)
//             const processResult = await parkingProcessService.processEntry({
//                 siteId,
//                 laneId,
//                 carNumber,
//                 entryTime,
//                 imageUrl,
//                 loopSignal: 'ON'
//             });

//             // 3. [Feedback] 결과에 따른 장비 제어
//             // Core가 'UP' 명령을 내렸거나 메시지를 줬다면 실행
            
//             if (processResult.control) {
//                 // 3-1. 차단기 제어
//                 if (processResult.control.barrier === 'UP') {
//                     logger.info(`[PlsService] 차단기 개방 명령 전송 -> ${locationName}`);
//                     await plsAdapter.controlDevice({ ipAddress: targetIp, port: targetPort }, { linkKey: '1' }, 'OPEN');
//                 }

//                 // 3-2. 전광판 제어
//                 if (processResult.control.display) {
//                     logger.info(`[PlsService] 전광판 메시지 전송: "${processResult.control.display}"`);
//                     // await plsAdapter.sendDisplay(...)
//                 }
//             }

//         } catch (error) {
//             logger.error(`[PlsService] 입차 로직 수행 중 오류: ${error.message}`);
//         }
//     }

    
// }

// module.exports = new PlsService();