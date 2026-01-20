// const ParkingSessionRepository = require('../repositories/parking-session.repository');
// const SiteRepository = require('../repositories/site.repository'); // [필수] 사이트 정보 조회용
// const LaneRepository = require('../repositories/lane.repository'); // [필수] 차선 정보 조회용
// const FeeService = require('./fee.service');
// const AlertService = require('./alert.service');
// const logger = require('../../../logger');
// const AdapterFactory = require('../adapters/adapter.factory'); // 팩토리 추가

// class ParkingProcessService {
//     constructor() {
//         this.sessionRepository = new ParkingSessionRepository();
//         // [추가] 리포지토리 인스턴스 생성 (이름 조회에 사용)
//         this.siteRepository = new SiteRepository();
//         this.laneRepository = new LaneRepository();
        
//         this.feeService = FeeService;
//     }

//     /**
//      * 입출차 통합 처리 (LPR Service에서 호출)
//      * @param {Object} data - { carNumber, siteId, zoneId, laneId, eventTime, direction, ... }
//      */
//     async processEntryExit(data) {
//         const { direction } = data;

//         if (direction && direction.toUpperCase() === 'IN') {
//             return await this._handleEntry(data);
//         } else if (direction && direction.toUpperCase() === 'OUT') {
//             return await this._handleExit(data);
//         } else {
//             logger.warn(`[ParkingProcess] 알 수 없는 방향(Direction): ${direction}`);
//             return { success: false, shouldOpenGate: false, message: 'Invalid Direction' };
//         }
//     }

//     // =================================================================
//     // 1. 입차 로직 (Entry)
//     // =================================================================
//     async _handleEntry(data) {
//         const { 
//             carNumber,
//             siteId,
//             zoneId,
//             laneId,
//             locationName,
//             direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
//             eventTime,
//             imageUrl,
//             isMember,
//             isBlacklist,
//             ip,
//             port 
//         } = data;

//         logger.info(`[Process:Entry] 입차 시도: ${carNumber} (Site: ${siteId})`);

//         try {
//             // 0. 사이트 정보 조회
//             const site = await this.siteRepository.findById(siteId);
//             if (!site) throw new Error(`Site info not found for ID: ${siteId}`);

//             // 차선 정보 조회
//             let laneName = 'Unknown Lane';
//             if (laneId) {
//                 const lane = await this.laneRepository.findById(laneId);
//                 if (lane) laneName = lane.name;
//             }

//             // 1. 중복 입차(Ghost Session) 체크 및 자동 정리
//             const activeSession = await this.sessionRepository.findActiveSession(siteId, carNumber);
            
//             if (activeSession) {
//                 logger.warn(`[Process:Entry] 미출차(Ghost) 차량 재입차 감지 -> 기존 세션 강제 종료: ${activeSession.id}`);
                
//                 // [수정] 바로 리턴하지 않고, 기존 세션을 강제 종료 처리함
//                 await this.sessionRepository.updateExit(activeSession.id, {
//                     exitTime: new Date(), 
//                     status: 'FORCE_COMPLETED',
                    
//                     // [중요] 아까 발생했던 SQL 에러 방지를 위해 컬럼명 통일 (totalFee)
//                     totalFee: 0, 
//                     discountFee: 0,
//                     paidFee: 0,
                    
//                     note: `[System] 재입차로 인한 자동 강제 종료 (Ghost Session Cleanup)`
//                 });

//                 // ★ 여기서 return을 하지 않습니다! 그래야 아래 '새 세션 생성'으로 넘어갑니다.
//             }

//             // 2. 입차 세션 생성 (새로운 기록)
//             const newSession = await this.sessionRepository.create({
//                 siteId,
//                 siteName: site.name,
//                 siteCode: site.code,
//                 zoneId,
//                 entryLaneId: laneId,
//                 entryLaneName: laneName,
//                 carNumber,
                
//                 // [추가] vehicleType 처리 (Controller에서 넘겨준다고 가정, 없으면 NORMAL)
//                 vehicleType: data.vehicleType || (isMember ? 'MEMBER' : 'NORMAL'),
                
//                 entryTime: eventTime,
//                 entryImageUrl: imageUrl,
//                 entrySource: 'SYSTEM', // LPR 등 자동 입차
                
//                 status: 'PENDING_ENTRY',
//                 note: activeSession ? '재입차(Ghost 처리됨)' : null
//             });

//             // 3. 차단기 개방
//             const shouldOpenGate = true; 

//             logger.info(`[Process:Entry] 세션 생성 완료: ${carNumber} (ID: ${newSession.id})`);

//             let vehicleTypeName = "";

//             switch (data.vehicleType) {
//                 case 'MEMBER':
//                     vehicleTypeName = "정기권";
//                     break; 

//                 case "COMPACT":
//                     vehicleTypeName = "경차";
//                     break;

//                 case "ELECTRIC":
//                     vehicleTypeName = "전기차";
//                     break;

//                 default:
//                     vehicleTypeName = "일반"; // '='를 사용하여 값을 할당해야 합니다.
//                     break;
//             }

//             const socketPayload = {
//                 direction: 'IN',
//                 siteId: siteId,
//                 deviceIp: ip || null,     // 차단기/LPR IP
//                 devicePort: port || null, // 포트
//                 imageUrl: imageUrl,
//                 eventTime: newSession.entryTime,      // 입차 인식 시각
                
//                 location: locationName,
                
//                 carNumber: carNumber,
                
//                 // 입차 시점 금액 정보 (0원)
//                 totalFee: 0,
//                 discountPolicyIds: [],
//                 discountFee: 0,
//                 preSettledFee: 0,
                
//                 isBlacklist: isBlacklist,

//                 vehicleType: vehicleTypeName,
                
//                 rtspUrl: null,
//                 parkingSessionId: newSession.id
//             };

//             // 
//             if((data) && (global.websocket)) {
//                 global.websocket.emit("pf_lpr-update", { parkingSession: { 'data': socketPayload }});
//             }

//             if (shouldOpenGate) {

//                 await this._triggerOpenGate(data.deviceControllerId, data.locationName);

//             }

//             return {
//                 success: true,
//                 shouldOpenGate,
//                 message: 'Entry Processed',
//                 session: newSession
//             };

//         } catch (error) {
//             logger.error(`[Process:Entry] 실패: ${error.message}`);
//             throw error;
//         }
//     }

//     // =================================================================
//     // 2. 출차 로직 (Exit)
//     // =================================================================
//     async _handleExit(data) {
//         const { 
//             carNumber,
//             siteId,
//             zoneId,
//             laneId,
//             locationName,
//             direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
//             eventTime,
//             imageUrl,
//             isMember,
//             isBlacklist,
//             ip,
//             port  
//         } = data;

//         logger.info(`[Process:Exit] 출차 시도: ${carNumber}`);

//         try {
//             // 0. 출차 차선 이름 조회
//             let exitLaneName = null;
//             if (laneId) {
//                 const lane = await this.laneRepository.findById(laneId);
//                 if (lane) exitLaneName = lane.name;
//             }

//             // 1. 활성 세션(입차 기록) 조회
//             let session = await this.sessionRepository.findActiveSession(siteId, carNumber);

//             console.log('5555555555555555555555', {session});

//             // 2. [GHOST EXIT] 미입차 차량 출차 시도 처리
//             if (!session) {
//                 logger.warn(`[Process:Exit] 입차 기록 없음(Ghost): ${carNumber}`);
                
//                 // [Alert] 관리자에게 즉시 알림
//                 await AlertService.sendAlert({
//                     type: AlertService.Types.GHOST_EXIT,
//                     message: `👻 미입차 차량 출차 시도: ${carNumber}`,
//                     siteId,
//                     data: { carNumber, location: laneId, imageUrl, eventTime }
//                 });

//                 // Ghost Session 생성을 위해 사이트 이름 조회
//                 const site = await this.siteRepository.findById(siteId);

//                 // !!! 미입차 차량 출차 시도 소켓 고려
                
//                 return {
//                     success: false,
//                     shouldOpenGate: false, // [중요] 절대 열어주지 않음 (보안)
//                     message: 'No Entry Record found (Ghost Exit)',
//                     session
//                 };
//             }

//             // 3. 요금 계산 (Fee Service 위임)
//             const feeResult = await this.feeService.calculate({
//                 entryTime: session.entryTime,
//                 exitTime: eventTime,
//                 preSettledAt: session.preSettledAt,
//                 vehicleType: session.vehicleType,
//                 siteId: siteId
//             });

//             // [Fix 1] 퍼센트 할인 재계산 로직 추가
//             // 시간이 흘러 TotalFee가 변했으므로, 비율(%) 할인은 금액을 다시 계산해야 함
//             let recalculatedDiscountFee = 0;
//             let appliedDiscounts = session.appliedDiscounts || [];

//             if (appliedDiscounts.length > 0) {
//                 appliedDiscounts = appliedDiscounts.map(d => {
//                     // POLICY 타입이면서 PERCENT인 경우 재계산
//                     if (d.type === 'POLICY' && d.discountType === 'PERCENT') {
//                         const newAmount = Math.floor(feeResult.totalFee * (d.value / 100));
//                         recalculatedDiscountFee += newAmount;
//                         return { ...d, amount: newAmount };
//                     } 
//                     // 정액권 등은 기존 금액 유지
//                     recalculatedDiscountFee += (d.amount || 0);
//                     return d;
//                 });
//             }


//             // [수정 핵심 1] 잔여 요금(미납금) 계산
//             // 총 요금 - (할인 합계 + 기납부 요금)
//             const totalDiscount = recalculatedDiscountFee + (feeResult.discountAmount || 0);
//             const alreadyPaid = session.paidFee || 0;

//             const remainingFee = Math.max(0, feeResult.totalFee - totalDiscount - alreadyPaid);

//             // [Fix 3] 차단기 개방 조건 수정 (잔여 요금이 없으면 개방)
//             // feeResult.finalFee(총요금)가 아니라 remainingFee(낼 돈)를 봐야 함
//             const shouldOpenGate = (remainingFee === 0);

//             // ★ [수정] 상태 결정 로직
//             // - 돈을 다 냈으면(0원) -> 'PENDING_EXIT' (나가세요, 차단기 통과 대기)
//             // - 돈이 남았으면 -> 'PAYMENT_PENDING' (돈 내세요)
//             const nextStatus = shouldOpenGate ? 'PENDING_EXIT' : 'PAYMENT_PENDING';

//             console.log(`10101010101010: ${laneId}`)

//             // 4. 세션 업데이트 (출차 정보 및 요금 기록)
//             const updatedSession = await this.sessionRepository.updateExit(session.id, {
//                 exitTime: eventTime,
//                 exitImageUrl: imageUrl,
                
//                 exitLaneId: laneId,
//                 exitLaneName: exitLaneName, // 출차 차선명 업데이트
                
//                 totalFee: feeResult.totalFee,
//                 discountFee: totalDiscount,


//                 paidFee: alreadyPaid,
//                 duration: feeResult.durationMinutes,
                
//                 // 0원이면 바로 완료(COMPLETED), 요금이 있으면 결제 대기(PAYMENT_PENDING)
//                 status: nextStatus
//             });       

//             if (shouldOpenGate) {
//                 logger.info(`[Process:Exit] 무료/회차 출차: ${carNumber} (요금 0원)`);
//                 await this._triggerOpenGate(data.deviceControllerId, data.locationName);
//             } else {
//                 logger.info(`[Process:Exit] 과금 출차 대기: ${carNumber} (요금 ${feeResult.finalFee}원)`);

//                 // [Fix 4] 출구 정산기에 요금 정보 전송 (필수)
//                 // AdapterFactory를 통해 PLS Adapter의 sendPaymentInfo 호출
//                 if (data.deviceControllerId) {
//                     const adapter = await AdapterFactory.getAdapter(data.deviceControllerId);
//                     // LPR 데이터에 있는 장비 IP/Port가 보통 정산기 IP/Port와 동일하다고 가정하거나,
//                     // 별도 매핑된 정산기 IP를 찾아야 함. 여기서는 data.ip를 타겟으로 가정.
//                     await adapter.sendPaymentInfo({
//                         location: locationName,
//                         targetIp: ip, 
//                         targetPort: port,
//                         carNumber: carNumber,
//                         parkingFee: remainingFee, // 남은 돈만 청구
//                         inTime: session.entryTime,
//                         outTime: eventTime
//                     }).catch(e => logger.error(`[Process:Exit] 요금 전송 실패: ${e.message}`));
//                 }
//             }

//             let vehicleTypeName = '';

//             switch (session.vehicleType) {
//                 case 'MEMBER':
//                     vehicleTypeName = "정기권";
//                     break; 

//                 case "COMPACT":
//                     vehicleTypeName = "경차";
//                     break;

//                 case "ELECTRIC":
//                     vehicleTypeName = "전기차";
//                     break;

//                 default:
//                     vehicleTypeName = "일반"; // '='를 사용하여 값을 할당해야 합니다.
//                     break;
//             }

//             const socketPayload = {
//                 direction: 'OUT',
//                 siteId: siteId,
//                 deviceIp: ip || null,     // 차단기/LPR IP
//                 devicePort: port || null, // 포트
//                 imageUrl: imageUrl,
//                 eventTime: updatedSession.entryTime,      // 입차 인식 시각
                
//                 location: locationName,
                
//                 carNumber: carNumber,
                
//                 // 입차 시점 금액 정보 (0원)
//                 totalFee: feeResult.totalFee,
//                 discountPolicyIds: appliedDiscounts.map(d => d.id),
//                 discountFee: totalDiscount,
//                 preSettledFee: alreadyPaid,
                
//                 isBlacklist: isBlacklist,

//                 vehicleType: vehicleTypeName,
//                 rtspUrl: null,
//                 parkingSessionId: session.id
//             };

//             // 
//             if((data) && (global.websocket)) {
//                 global.websocket.emit("pf_lpr-update", { parkingSession: { 'data': socketPayload }});
//             }


//             return {
//                 success: true,
//                 shouldOpenGate,
//                 message: shouldOpenGate ? 'Exit Allowed' : 'Payment Required',
//                 data: {
//                     fee: remainingFee,
//                     session: updatedSession
//                 }
//             };

//         } catch (error) {
//             logger.error(`[Process:Exit] 실패: ${error.message}`);
//             throw error;
//         }
//     }

//     /**
//      * [Helper] 차단기 개방 명령 전송
//      * @param {string} controllerId - 장비 제어기 ID
//      * @param {string} locationName - 장비 위치명 (LPR 데이터의 location)
//      */
//     async _triggerOpenGate(controllerId, locationName) {
//         try {
//             if (!controllerId) {
//                 logger.warn(`[Process] 차단기 개방 실패: Controller ID 없음 (${locationName})`);
//                 return;
//             }

//             // 1. 팩토리에서 어댑터 가져오기
//             const adapter = await AdapterFactory.getAdapter(controllerId);
            
//             // 2. 차단기 개방 명령 (PlsAdapter.openGate 호출)
//             logger.info(`[Process] 차단기 개방 명령 전송 -> ${locationName}`);
//             const result = await adapter.openGate(locationName);
            
//             if (!result) logger.warn(`[Process] 차단기 개방 응답 실패 (${locationName})`);

//         } catch (error) {
//             logger.error(`[Process] 차단기 제어 중 오류: ${error.message}`);
//         }
//     }

//     // =================================================================
//     // [NEW] 차단기 닫힘(Down) 신호 처리 -> 세션 상태 확정 (입차완료/출차완료)
//     // - 호출처: PlsService.updateGateStatus (status === 'down' 일 때)
//     // =================================================================
//     async confirmGatePassage(laneId, eventTime) {
//         try {
//             logger.info(`[Gate] 차단기 닫힘(Down) 신호 수신 - LaneID: ${laneId}`);

//             // 1. 해당 차선에서 '진입/진출 대기 중'인 세션 조회
//             // (Repository에 findLatestTransitioningSession 메서드가 구현되어 있어야 함)
//             const session = await this.sessionRepository.findLatestTransitioningSession(laneId);

//             if (!session) {
//                 // 이미 처리가 끝났거나, 차단기만 오작동한 경우 등
//                 logger.debug(`[Gate] 해당 차선에 상태 변경 대기 중(PENDING_ENTRY/EXIT)인 세션이 없습니다.`);
//                 return;
//             }

//             let nextStatus = null;
//             let noteAppend = '';
//             let logMessage = '';

//             // 2. 현재 상태에 따른 다음 상태 결정
//             if (session.status === 'PENDING_ENTRY') {
//                 // [입차 시나리오] 차단기 통과 -> '주차 중(PENDING)'으로 확정
//                 nextStatus = 'PENDING'; 
//                 noteAppend = ' (입차 차단기 통과 확인)';
//                 logMessage = `[Gate] 입차 완료 확정: ${session.carNumber}`;
//             } 
//             else if (session.status === 'PENDING_EXIT') {
//                 // [출차 시나리오] 차단기 통과 -> '종료(COMPLETED)'로 확정
//                 nextStatus = 'COMPLETED'; 
//                 noteAppend = ' (출차 차단기 통과 확인)';
//                 logMessage = `[Gate] 출차 완료 확정: ${session.carNumber}`;
//             }
//             else {
//                 // PAYMENT_PENDING 상태에서 문이 닫힌 경우 (도주, 회차, 혹은 단순 오작동)
//                 // 로직에 따라 여기서 처리를 안 하거나, 별도 로그를 남김
//                 logger.warn(`[Gate] 미결제/대기 상태(${session.status})에서 차단기 닫힘 감지: ${session.carNumber}`);
//                 return; 
//             }

//             console.log('9999999999999999999: ' + nextStatus);

//             // 3. DB 업데이트 실행
//             // (일반 update 메서드를 재사용하거나, 특정 필드만 바꾸는 메서드 사용)
//             const updatedSession = await this.sessionRepository.update(session.id, {
//                 status: nextStatus,
//                 note: (session.note || '') + noteAppend
//             });

//             logger.info(logMessage);

//             // 4. [웹소켓] 클라이언트 UI 갱신 (선택 사항)
//             // - 상태가 변경되었음을 알려주어, 키오스크 화면을 초기화하거나 "입차완료" 메시지를 띄움
//             if (global.websocket) {
//                 // 필요한 데이터만 페이로드 구성
//                 const socketPayload = {
//                     parkingSessionId: updatedSession.id,
//                     carNumber: updatedSession.carNumber,
//                     status: nextStatus, // PENDING or COMPLETED
                    
//                     // 클라이언트가 어떤 차선인지 알 수 있게 정보 포함
//                     siteId: updatedSession.siteId,
//                     laneId: laneId, 
//                     location: updatedSession.entryLaneId === laneId ? updatedSession.entryLaneName : updatedSession.exitLaneName,

//                     eventTime: eventTime || new Date(),
//                     message: session.status === 'PENDING_ENTRY' ? '입차 완료' : '출차 완료'
//                 };

//                 // 'pf_session-update' 같은 별도 이벤트를 쓰거나, 기존 'pf_lpr-update'를 재활용
//                 global.websocket.emit("pf_lpr-update", { parkingSession: { 'data': socketPayload }});
//             }

//             return updatedSession;

//         } catch (error) {
//             logger.error(`[Gate] 상태 확정 처리 중 오류: ${error.message}`);
//         }
//     }
// }

// // 싱글톤으로 내보내기
// module.exports = new ParkingProcessService();