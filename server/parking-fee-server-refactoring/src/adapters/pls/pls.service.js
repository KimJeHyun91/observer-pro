// const DeviceService = require('../../services/device.service');
// const MemberService = require('../../services/member.service');
// const BlacklistService = require('../../services/blacklist.service');
// const alertService = require('../../services/alert.service'); // 싱글톤 인스턴스
// const parkingProcessService = require('../../services/parking-process.service'); // 싱글톤 인스턴스
// const debounceService = require('../../services/debounce.service'); // 싱글톤 인스턴스
// const AdapterFactory = require('../../adapters/adapter.factory');
// const logger = require('../../../../logger');

// class PlsService {

//     constructor() {
//         // [수정] 클래스형 서비스들은 여기서 인스턴스화하여 사용 (의존성 관리)
//         this.deviceService = new DeviceService();
//         this.memberService = new MemberService();
//         this.blacklistService = new BlacklistService();
//     }

//     /**
//      * LPR 데이터 처리 메인 로직
//      * @param {Object} lprRawData - PLS 장비로부터 수신한 Raw Data
//      */
//     async processLprData(lprRawData) {
//         // 1. 데이터 추출 (Snake Case -> Camel Case 변환 및 가공)
//         const { 
//             lp, location, ip, port,
//             fname, folder_name, image_url_header, loop_event_time, 
//             direction // 필요시 사용
//         } = lprRawData;

//         // 차량번호 공백 제거 및 '미인식' 처리
//         const carNumber = lp ? lp.replace(/\s/g, '') : '미인식';
    
            
//         const eventDate = loop_event_time ? new Date(loop_event_time) : new Date();

//         // 2. [Context 조회] 장비 위치(Location)를 기반으로 Site, Zone, Lane 정보 조회
//         const context = await this._resolveLocationContext(location);
        
//         if (!context) {
//             logger.warn(`[LPR] 등록되지 않은 장비(Location)입니다: ${location}`);
//             return;
//         }

//         const { siteId, zoneId, laneId, deviceIp, devicePort, deviceControllerId, deviceControllerIp, deviceControllerPort } = context;

//         // 이미지 주소 변환
//         const imageUrl = 'http://' + deviceControllerIp + ':' + deviceControllerPort + image_url_header + folder_name + '/' + fname;

//         // 3. [Debounce] 중복 요청 방지 (5초)
//         const safeSiteId = siteId || 'UNKNOWN';
//         const debounceKey = `LPR:${safeSiteId}:${location}:${carNumber}`;
        
//         if (!debounceService.canProcess(debounceKey, 5000)) {
//             logger.warn(`[LPR] 중복 요청 감지됨 (무시): ${carNumber} @ ${location}`);
//             return;
//         }

//         logger.info(`[LPR] 차량 인식 시작: ${carNumber} @ ${location}`);

//         try {
//             // 4. [Alert] 미인식 차량 알림
//             if (carNumber === '미인식' || carNumber === 'Unknown') {
//                 await alertService.sendAlert({
//                     type: alertService.Types.LPR_ERROR, // Enum 사용
//                     message: `차량 번호 미인식 발생 (${location})`,
//                     siteId: siteId,
//                     data: { location, imageUrl, eventTime: eventDate }
//                 });
//                 // 미인식이라도 입차 처리는 시도할지 정책 결정 (보통은 관리자 확인 필요하므로 차단기 안 엶)
//                 // 여기서는 계속 진행하여 '미인식'으로 입차 기록을 남김
//             }

//             // 5. [Blacklist] 블랙리스트 체크
//             let isBlacklist = false;
//             if (siteId) {
//                 const isBlacklisted = await this.blacklistService.checkBlacklist(siteId, carNumber);
//                 if (isBlacklisted) {
//                     logger.warn(`[LPR] 블랙리스트 차량 진입 시도: ${carNumber}`);
//                     isBlacklist = true;
                    
//                     // 알림 전송
//                     // await alertService.sendAlert({
//                     //     type: alertService.Types.BLACKLIST_DETECTED,
//                     //     message: `🚨 블랙리스트 차량 발견: ${carNumber}`,
//                     //     siteId,
//                     //     data: { carNumber, location, imageUrl }
//                     // });
                    
//                     // LED: 출입금지 표시
//                     // await this._sendLedMessage(deviceControllerId, location, {
//                     //     text1: '출입금지', text2: '관리자문의', color1: 'RED', color2: 'RED'
//                     // });
                    
//                     return; // 로직 종료 (차단기 개방 안 함)
//                 }
//             }

//             // 6. [Member] 정기권/회원 여부 확인
//             let isMember = false;
//             let memberId = null;

//             if (siteId && carNumber !== '미인식') {
//                 const member = await this.memberService.findMemberByCarNumber(siteId, carNumber);
                
//                 // [수정] member 객체는 순수 데이터이므로 메서드(.isValid)가 없음.
//                 // 대신 isActive 필드와 현재 멤버십 상태(currentMembership.status)를 확인
//                 const isActiveMember = member && 
//                                        member.isActive && 
//                                        (member.currentMembership.status === 'ACTIVE' || member.currentMembership.status === 'EXPIRING');

//                 if (isActiveMember) {
//                     isMember = true;
//                     memberId = member.id;
                    
//                     // LED: 환영 메시지
//                     await this._sendLedMessage(deviceControllerId, location, {
//                         text1: '반갑습니다', text2: '정기권차량', color1: 'GREEN', color2: 'GREEN'
//                     });
//                 } else {
//                     // LED: 일반 방문 메시지
//                     await this._sendLedMessage(deviceControllerId, location, {
//                         text1: '어서오세요', text2: carNumber, color1: 'YELLOW', color2: 'YELLOW'
//                     });
//                 }
//             } else {
//                 // 사이트 정보가 없거나 미인식인 경우 기본 메시지
//                  await this._sendLedMessage(deviceControllerId, location, {
//                     text1: '어서오세요', text2: '방문객', color1: 'YELLOW', color2: 'YELLOW'
//                 });
//             }

//             // 7. [Process] 입출차 비즈니스 로직 위임 (세션 생성/종료, 요금 계산 등)
//             // ParkingProcessService가 성공/실패 및 차단기 개방 여부를 판단해줌
//             const processResult = await parkingProcessService.processEntryExit({
//                 carNumber,
//                 siteId,
//                 zoneId,
//                 laneId,
//                 locationName: location,
//                 direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
//                 eventTime: eventDate,
//                 imageUrl,
//                 isMember,
//                 isBlacklist,
//                 ip: deviceIp,
//                 port: devicePort,
//                 deviceControllerId: deviceControllerId
//             });

//             console.log('33333333333333333333333333', {processResult});

//             // 8. [Control] 차단기 제어 (Process 결과에 따름)
//             if (processResult.success && processResult.shouldOpenGate) {
//                 logger.info(`[LPR] 차단기 개방 요청: ${location}`);
                
//                 const adapter = await AdapterFactory.getAdapter(deviceControllerId);
//                 await adapter.openGate(location); // 어댑터를 통해 하드웨어 제어
//             } else {
//                 logger.info(`[LPR] 차단기 미개방 (사유: ${processResult.message})`);
//             }

//         } catch (error) {
//             logger.error(`[LPR Service] 처리 중 치명적 오류: ${error.message}`);
//             // 시스템 에러 알림 전송 가능
//         }
//     }

//     async updateGateStatus(rawData) {
//         const { location, status, ip, port, loop_event_time } = rawData;

//         try {
//             // 1. DeviceService로부터 조회된 Raw 데이터 받기
//             // 반환값 예시: { deviceId: 1, siteId: 2, zoneId: 3, laneId: 4, direction: 'IN', ... }
//             const deviceContext = await this.deviceService.findOneByLocation(location);

//             if (!deviceContext) {
//                 logger.warn(`[Gate] 알 수 없는 장비: ${location}`);
//                 return;
//             }

//             const { laneId } = deviceContext;

//             // 2. [추가] 차단기가 내려갔다면(down), 세션 상태 확정 로직 호출
//             if (status === 'down') {
//                 logger.info(`[PLS] 차단기 닫힘 감지 -> 세션 상태 확정 시도 (${location})`);
                
//                 // ParkingSessionService 호출 (순환 참조 주의: 필요시 require를 함수 내부에서 하거나 구조 조정)
//                 // 보통은 Service끼리 호출해도 괜찮지만, 구조에 따라 AdapterFactory처럼 분리할 수도 있음.
//                 // 여기서는 직접 호출 가정:
//                 await parkingProcessService.confirmGatePassage(laneId, loop_event_time);
//             }
            
//             // 2. [여기서 추출!] 필요한 데이터만 골라서 소켓 Payload 구성
//             const socketPayload = {                
//                 // DeviceService가 준 객체에서 필요한 것만 꺼내 씀
//                 siteId: deviceContext.siteId,
//                 zoneId: deviceContext.zoneId,
//                 laneId: deviceContext.laneId,
//                 deviceId: deviceContext.deviceId,
//                 direction: deviceContext.direction || 'UNKNOWN',
                
//                 // 장비가 보낸 원본 데이터
//                 deviceIp: ip,
//                 devicePort: port,
//                 location: location,
//                 status: status, 
//                 eventTime: loop_event_time
//             };

//             // 3. 소켓 전송
//             if (global.websocket) {
//                 global.websocket.emit("pf_gate_state-update", { gateState: { 'data': socketPayload }});
//             }

//         } catch (error) {
//             logger.error(`[Gate] Error: ${error.message}`);
//         }
//     }

//     /**
//      * 5. 결제 성공 처리 (정산기 -> 서버)
//      */
//     async processPaymentSuccess(paymentData) {
//         const { carNumber, paidFee, paymentType, approvalNo, locationName } = paymentData;
//         logger.info(`[Payment] 결제 수신: ${carNumber}, 금액: ${paidFee}`);

//         // 1. 차량 조회 (현재 주차 중인 차량 찾기)
//         // const parkingSession = await parkingProcessService.findActiveSession(carNumber);
        
//         // 2. 정산 반영 (DB 업데이트)
//         // await parkingProcessService.applyPayment(parkingSession.id, paidFee, paymentType, approvalNo);

//         // 3. 출구 정산기인 경우 차단기 개방 로직 추가 가능
//         // if (locationName.includes('출구')) { ... }
//     }

//     /**
//      * 6. 할인권 투입 처리
//      */
//     async processCouponInput(couponData) {
//         const { carNumber, couponCode, locationName } = couponData;
//         logger.info(`[Coupon] 할인권 투입: ${carNumber}, 코드: ${couponCode}`);

//         // 1. 할인권 유효성 검증
//         // 2. 할인 적용 및 잔여 요금 재계산
//         // 3. 장비에게 재계산된 요금 전송 (장비 별도 API 호출 필요)
//     }

//     /**
//      * 7. 차량 번호 검색 (사전 무인 정산기)
//      */
//     async searchCarAndReply({ searchKey, targetLocation, targetIp, targetPort }) {
//         logger.info(`[Search] 차량 검색 요청: 번호판 뒤 4자리 '${searchKey}'`);

//         // 1. 차량 리스트 조회 (LIKE %searchKey)
//         // const carList = await parkingProcessService.searchCarsByRearNumber(searchKey);

//         // 2. 장비 프로토콜에 맞춰 결과 전송
//         // 별도의 Adapter 혹은 Utility를 통해 UDP/TCP로 장비에게 리스트 전송
//         // await AdapterFactory.sendCarListToKiosk(targetIp, targetPort, carList);
//     }

//     /**
//      * [Helper] 위치 이름으로 Context(Site, Lane 등) 조회
//      */
//     async _resolveLocationContext(locationName) {
//         // DeviceService에 구현된 findOneByLocation 활용
//         const device = await this.deviceService.findOneByLocation(locationName);
        
//         if (!device) return null;

//         console.log(`666666666666666666666666666: ${device.deviceIp} ${device.devicePort}`)

//         return {
//             siteId: device.siteId,
//             zoneId: device.zoneId,
//             laneId: device.laneId,
//             deviceIp: device.deviceIp,
//             devicePort: device.devicePort,
//             deviceControllerId: device.deviceControllerId,
//             deviceControllerIp: device.deviceControllerIpAddress,
//             deviceControllerPort: device.deviceControllerPort
//         };
//     }

//     /**
//      * [Helper] LED 전송 로직 (안전장치 포함)
//      * - Controller ID로 어댑터를 찾고, Location으로 LED 장비 IP를 찾아서 전송
//      */
//     async _sendLedMessage(controllerId, locationName, msgData) {
//         try {
//             if (!controllerId) return;

//             // 1. 해당 위치(Location)에 매핑된 LED 장비 정보 조회 (IP, Port 필요)
//             // DeviceService에 findLedByLocation 메서드가 필요합니다. (이전 피드백 참조)
//             const ledDevice = await this.deviceService.findLedByLocation(locationName);
            
//             if (!ledDevice) {
//                 // LED 장비가 DB에 없으면 전송 포기 (에러 아님, 설정 문제)
//                 logger.debug(`[PLS Service] LED 장비 미설정: ${locationName}`);
//                 return;
//             }

//             // 2. 어댑터 가져오기
//             const adapter = await AdapterFactory.getAdapter(controllerId);
            
//             // 3. 메시지 기본값 채우기
//             const fullMessage = {
//                 text1: msgData.text1 || '',
//                 text2: msgData.text2 || '',
//                 color1: msgData.color1 || 'GREEN',
//                 color2: msgData.color2 || 'GREEN',
//                 effect1: 'fixed',
//                 effect2: 'fixed',
//                 kind1: 'flash',
//                 ...msgData // 덮어쓰기 허용
//             };

//             // 4. 어댑터에 전송 요청 (LED 장비 정보 + 메시지)
//             await adapter.sendDisplay(locationName, ledDevice, fullMessage);

//         } catch (e) {
//             // LED 전송 실패는 핵심 로직(입차)을 방해하면 안 되므로 로그만 남김
//             logger.warn(`[LPR] LED 전송 실패 (${locationName}): ${e.message}`);
//         }
//     }
// }




// module.exports = new PlsService();


// /**
//  * 장비 동기화 (Sync Devices)
//  */
// exports.syncDevices = async (deviceController) => {
//     const deviceController = await deviceControllerRepository.findById(id);
//         if (!deviceController) throw new Error('Device Controller not found');

//         logger.info(`[Sync] 장비 동기화 시작: ${deviceController.name} (${deviceController.ipAddress}:${deviceController.port})`);

//         try {
//             const adapter = await AdapterFactory.getAdapter(id);
//             const responseData = await adapter.getSystemConfig();
            
//             // 1. 데이터 구조 정규화
//             const config = responseData.docs || responseData;

//             // 2. 데이터 추출 (새로운 JSON 키 매핑)
//             // camera_list에 LPR과 정산기 카메라(Pinhole)가 혼재됨 -> _processCameraList에서 분기 처리
//             const cameraData = config.camera_list || []; 
//             const barrierData = config.iotb_list || [];   // 통합 제어기 (IoT Board) -> 부모 장비
//             const ledData = config.ledd_list || [];       // 전광판
//             const exitKioskData = config.pt_list || [];   // 출구 정산기 (PC)
//             const preKioskData = config.pre_pt_list || [];// 사전 정산기 (PC)

//             // 3. [Step 1] 부모 장비(INTEGRATED_GATE) 생성
//             const siteId = deviceController.siteId;
//             const laneMap = await this._getLaneMap(siteId);
//             const parentDeviceMap = new Map();
//             let syncCount = 0;

//             // 3-1. IoT Board 기준 생성
//             for (const item of barrierData) {
//                 const location = item.location || 'UNKNOWN';

//                 let validIp = item.ip;
//                 if (validIp === 'localhost' || !validIp) validIp = '127.0.0.1';
                
//                 // [방향 추론 적용]
//                 const direction = this._getDirection(item, location);

//                 // 유니크한 이름 생성 (location + index)
//                 const deviceName = `${location}_INTEGRATED_${item.index ?? 0}`;

//                 const parent = await this._upsertDevice({
//                     siteId,
//                     deviceControllerId: id,
//                     laneId: laneMap.get(location),
//                     type: 'INTEGRATED_GATE',
//                     name: deviceName,
//                     description: item.description || `통합 제어 장비 (${location})`,
//                     location: location,
//                     ipAddress: validIp,
//                     port: item.port,
//                     status: 'ONLINE',
//                     direction: direction,
//                     modelName: 'IoT_Board'
//                 });
//                 if (parent) parentDeviceMap.set(location, parent.id);
//             }

//             // 4. [Step 2] 하위 장비 연결
//             // 4-1. 카메라 (LPR, 보조LPR, 정산기카메라)
//             syncCount += await this._processCameraList(siteId, id, cameraData, parentDeviceMap, laneMap);
            
//             // 4-2. 전광판
//             syncCount += await this._processSimpleList(siteId, id, ledData, 'LED', parentDeviceMap, laneMap);
            
//             // 4-3. 정산기 (키오스크 본체)
//             syncCount += await this._processKioskList(siteId, id, exitKioskData, 'EXIT', parentDeviceMap, laneMap);
//             syncCount += await this._processKioskList(siteId, id, preKioskData, 'PRE', parentDeviceMap, laneMap);
            
//             // 5. 완료 처리
//             await this.repository.update(id, { status: 'ONLINE', config: config });

//             logger.info(`[Sync] 동기화 완료. Parent: ${parentDeviceMap.size}개, Child: ${syncCount}개`);
//             return { success: true, count: syncCount, parentCount: parentDeviceMap.size };

//         } catch (error) {
//             logger.error(`[Sync] 동기화 실패: ${error.message}`);
//             await this.repository.update(id, { status: 'OFFLINE' });
//             throw error;
//         }
// }
    
    
//     // =================================================================
//     // [핵심] 장비 동기화 (Sync Devices) - Direction 추론 로직 적용
//     // =================================================================
//     async syncDevices(id) {
        
//     }

//     // =================================================================
//     // [공통 Helper] 방향(Direction) 결정 로직
//     // 1. item.direction 확인
//     // 2. 없으면 location 이름 확인 (입차/입구 -> IN, 출차/출구 -> OUT)
//     // 3. 없으면 기본값 IN
//     // =================================================================
//     _getDirection(item, location) {
//         // 1. JSON 데이터에 명시된 값 (ledd_list 등)
//         if (item.direction && item.direction !== 'undefined') {
//             return item.direction.toUpperCase();
//         }

//         // 2. Location 이름으로 추론
//         if (location) {
//             if (location.includes('입차') || location.includes('입구') || location.includes('in')) return 'IN';
//             if (location.includes('출차') || location.includes('출구') || location.includes('out')) return 'OUT';
//         }

//         // 3. 기본값
//         return 'IN';
//     }

//     // =================================================================
//     // [Private Helper] 카메라 리스트 처리
//     // =================================================================
//     async _processCameraList(siteId, controllerId, list, parentMap, laneMap) {
//         if (!list || !Array.isArray(list)) return 0;
//         let count = 0;
        
//         for (const item of list) {
//             const location = item.location || 'UNKNOWN';
//             const desc = item.description || '';

//             let validIp = item.ip;
//             if (validIp === 'localhost') validIp = '127.0.0.1';
//             const direction = this._getDirection(item, location); // 방향 추론

//             let deviceType = 'MAIN_LPR';

//             if (desc.includes('출차') && desc.includes('정산') || location.includes('출차') && location.includes('정산')) {
//                 // 예: "구역A_출차1_정산기" -> 정산기 내부 핀홀 카메라
//                 deviceType = 'EXIT_PINHOLE_CAMERA';
//             } else if (desc.includes('보조') || desc.includes('sub')) {
//                 // 예: "구역A_입차1_보조lpr"
//                 deviceType = 'SUB_LPR';
//             } else if (desc.includes('사전') && desc.includes('정산') || location.includes('사전') && location.includes('정산')) {
//                 deviceType = 'PRE_PINHOLE_CAMERA'
//             } else {
//                 // 예: "구역A_입차1_lpr"
//                 deviceType = 'MAIN_LPR';
//             }

//             const parentId = parentMap.get(location) || parentMap.get(location.replace('_정산기', ''));

//             const suffix = validIp.split('.').pop();
//             const deviceName = `${location}_${deviceType}_${suffix}`;

//             await this._upsertDevice({
//                 siteId,
//                 deviceControllerId: controllerId,
//                 laneId: laneMap.get(location) || laneMap.get(location.replace('_정산기', '')), // 정산기 카메라는 Gate Lane에 소속
//                 parentDeviceId: parentId,
//                 type: deviceType,
//                 code: deviceType,
//                 name: deviceName,
//                 description: desc,
//                 ipAddress: validIp,
//                 port: item.port,
//                 location: location,
//                 direction: direction,
//                 vendor: 'PLS'
//             });
//             count++;
//         }
//         return count;
//     }

//     // =================================================================
//     // [Private Helper] 정산기 리스트 처리
//     // =================================================================
//     async _processKioskList(siteId, controllerId, list, kioskMode, parentMap, laneMap) {
//         if (!list || !Array.isArray(list)) return 0;
//         let count = 0;

//         for (const item of list) {
//             const kioskType = kioskMode === 'PRE' ? 'PRE_KIOSK' : 'EXIT_KIOSK';
//             const location = item.location || 'UNKNOWN';

//             const validIp = (item.ip === 'localhost') ? '127.0.0.1' : item.ip;
//             const direction = this._getDirection(item, location); // 방향 추론

//             const parentId = parentMap.get(location);

//             const suffix = validIp.split('.').pop();
//             const deviceName = `${location}_${kioskType}_${suffix}`;

//             await this._upsertDevice({
//                 siteId,
//                 deviceControllerId: controllerId,
//                 laneId: laneMap.get(location),
//                 parentDeviceId: parentId,
//                 type: kioskType,
//                 name: deviceName,
//                 description: item.description,
//                 ipAddress: validIp,
//                 port: item.port,
//                 location: location,
//                 direction: direction,
//                 vendor: 'PLS'
//             });
//             count++;
//         }
//         return count;
//     }

//     // =================================================================
//     // [Private Helper] 일반 장비 (LED 등)
//     // =================================================================
//     async _processSimpleList(siteId, controllerId, list, type, parentMap, laneMap) {
//         if (!list || !Array.isArray(list)) return 0;
//         let count = 0;

//         for (const item of list) {
//             const location = item.location || 'UNKNOWN';

//             let validIp = item.ip;
//             if (validIp === 'localhost') validIp = '127.0.0.1';
            
//             const direction = this._getDirection(item, location); // 방향 추론

//             // LED의 경우 index가 명시되어 있는 경우가 많음
//             const suffix = item.index !== undefined ? `_${item.index}` : `_${validIp.split('.').pop()}`;
//             const deviceName = `${location}_${type}${suffix}`;

//             await this._upsertDevice({
//                 siteId,
//                 deviceControllerId: controllerId,
//                 laneId: laneMap.get(location),
//                 parentDeviceId: parentMap.get(location),
//                 type: type,
//                 name: deviceName,
//                 description: item.description,
//                 ipAddress: validIp,
//                 port: item.port,
//                 location: location,
//                 direction: direction,
//                 vendor: 'PLS'
//             });
//             count++;
//         }
//         return count;
//     }

//     async _upsertDevice(data) {
//         try {
//             // 이름과 컨트롤러 ID로 기존 장비 조회
//             const existing = await this.deviceService.findAll({
//                 siteId: data.siteId,
//                 deviceControllerId: data.deviceControllerId,
//                 name: data.name
//             });

//             if (existing.devices && existing.devices.length > 0) {
//                 return await this.deviceService.update(existing.devices[0].id, data, true); 
//             } else {
//                 return await this.deviceService.create(data);
//             }
//         } catch (error) {
//             logger.warn(`[Sync] 장비 처리 실패 (${data.name}): ${error.message}`);
//             return null;
//         }
//     }

//     async _getLaneMap(siteId) {
//         const lanes = await this.laneRepository.findAll({ siteId }, {}, 200, 0);
//         const map = new Map();
//         if (lanes && lanes.rows) {
//             lanes.rows.forEach(l => map.set(l.name, l.id));
//         }
//         return map;
//     }
// }

const { getAdapter } = require('../adapter.factory');
const deviceService = require('../../services/device.service'); 
const parkingProcessService = require('../../services/parking-process.service'); 
const deviceControllerRepository = require('../../repositories/device-controller.repository');
const logger = require('../../../../logger');

/**
 * [Public] 1. LPR 데이터 처리
 */
exports.processLprData = async (lprRawData) => {
    const { lp, location, ip, port, loop_event_time } = lprRawData;
    const carNumber = lp ? lp.replace(/\s/g, '') : '미인식';
    const eventTime = loop_event_time ? new Date(loop_event_time) : new Date();

    logger.info(`[PLS LPR] 차량 인식: ${carNumber} (Device: ${ip}:${port})`);

    try {
        // [Context 조회 로직 Inline]
        const targetIp = (ip === 'localhost' || !ip) ? '127.0.0.1' : ip;
        const targetPort = parseInt(port, 10);

        // 1. IP/Port로 장비 조회
        const context = await deviceService.findByIpAddressAndPort(targetIp, targetPort);

        if (!context) {
            logger.warn(`[PlsService] LPR 장비 식별 실패: ${location} (${targetIp}:${targetPort})`);
            return;
        }

        // [Domain Logic] 입출차 판단
        const processResult = await parkingProcessService.processEntryExit({
            carNumber,
            eventTime,
            ...context 
        });

        // 차단기 제어
        if (processResult.shouldOpenGate) {
            logger.info(`[PLS LPR] 차단기 개방 실행 -> ${context.location}`);
            const adapter = await getAdapter(context.deviceControllerId);
            await adapter.openGate(context.location);
        } else {
            logger.info(`[PLS LPR] 차단기 미개방 (사유: ${processResult.message})`);
        }

    } catch (error) {
        logger.error(`[PlsService] LPR 처리 중 오류: ${error.message}`);
    }
};

/**
 * [Public] 2. 차단기 상태 변경 이벤트 처리
 */
exports.updateGateStatus = async (gateRawData) => {
    const { location, ip, port, gate_control, loop_event_time } = gateRawData;
    
    try {
        // [Context 조회 로직 Inline]
        const targetIp = (ip === 'localhost' || !ip) ? '127.0.0.1' : ip;
        const targetPort = parseInt(port, 10);

        const context = await deviceService.findByIpAddressAndPort(targetIp, targetPort);

        if (!context) {
            logger.warn(`[PlsService] Gate 장비 식별 실패: ${location} (${targetIp}:${targetPort})`);
            return;
        }

        if (gate_control === 'down') {
            logger.info(`[PLS Gate] 차단기 닫힘 확인 -> 통과 완료 처리 (${context.location})`);
            await parkingProcessService.confirmGatePassage({
                laneId: context.laneId,
                eventTime: loop_event_time
            });
        }
    } catch (error) {
        logger.error(`[PlsService] Gate 상태 처리 오류: ${error.message}`);
    }
};

/**
 * [Public] 3. 결제 완료 처리
 */
exports.processPaymentSuccess = async (paymentData) => {
    const { lp: carNumber, parkingfee: paidFee, location, ip, port } = paymentData;
    
    try {
        // [Context 조회 로직 Inline] - 결제 로그를 정확히 남기기 위함
        const targetIp = (ip === 'localhost' || !ip) ? '127.0.0.1' : ip;
        const targetPort = parseInt(port, 10);

        let context = await deviceService.findOneByDeviceNetwork(targetIp, targetPort);
        if (!context && location) {
            context = await deviceService.findOneByLocation(location);
        }

        // Context가 없으면 raw location 사용
        const locationName = context ? context.location : location;

        await parkingProcessService.applyPayment({
            carNumber,
            paidFee,
            location: locationName
        });
    } catch (error) {
        logger.error(`[PlsService] 결제 처리 오류: ${error.message}`);
    }
};

/**
 * [Public] 4. 차량 번호 검색 (사전 정산기용)
 */
exports.searchCarAndReply = async ({ searchKey, targetLocation, targetIp, targetPort }) => {
    try {
        // [Context 조회 로직 Inline]
        const normalizedIp = (targetIp === 'localhost' || !targetIp) ? '127.0.0.1' : targetIp;
        const portNum = parseInt(targetPort, 10);

        let context = await deviceService.findOneByDeviceNetwork(normalizedIp, portNum);
        if (!context && targetLocation) {
            context = await deviceService.findOneByLocation(targetLocation);
        }

        if (!context) {
            logger.warn(`[PlsService] 검색 요청 장비 식별 실패: ${targetLocation} (${normalizedIp}:${portNum})`);
            return;
        }

        // 차량 검색 수행
        const carList = await parkingProcessService.searchCarsByRearNumber(searchKey);

        // 결과 전송
        const adapter = await getAdapter(context.deviceControllerId);
        await adapter.sendCarSearchResult({
            location: context.location, 
            targetIp,
            targetPort,
            carList
        });
    } catch (error) {
        logger.error(`[PlsService] 차량 검색 오류: ${error.message}`);
    }
};

/**
 * [Public] 5. 장비 동기화 (Sync Devices)
 */
exports.syncDevices = async (deviceController) => {
    logger.info(`[PlsService] 장비 동기화 시작 (ID: ${deviceController.id})`);

    try {
        const adapter = await getAdapter(deviceController);
        const config = await adapter.getSystemConfig(); 
        const docs = config.docs || {}; 

        // -----------------------------------------------------------
        // Local Helpers (함수 내부에서만 사용)
        // -----------------------------------------------------------
        
        // 방향 추론
        const inferDirection = (loaction, direction) => {
            if (direction && direction !== 'undefined') return direction.toUpperCase();
            if (!loaction) return 'UNKNOWN';
            if (loaction.match(/입차|입구|진입|in/i)) return 'IN';
            if (loaction.match(/출차|출구|진출|out/i)) return 'OUT';
            return 'UNKNOWN';
        };

        // 이름 생성
        const generateName = (location, type, value) => `${location}_${type}_${String(value).split('.').pop()}`;

        // DB 저장 (Upsert)
        const saveDevice = async (item, type, name, parentId = null, directionOverride = null) => {
            const location = item.location || 'UNKNOWN';
            const ipAddress = (item.ip === 'localhost' || !item.ip) ? '127.0.0.1' : item.ip;
            const direction = directionOverride || inferDirection(location, item.direction);

            return await deviceService.upsert({
                deviceControllerId: deviceController.id,
                parentDeviceId: parentId,
                type: type,
                name: name,
                description: item.description,
                location: location,
                direction: direction,
                ipAddress: ipAddress,
                port: item.port,
                status: 'ONLINE',
                modelName: null
            });
        };

        // -----------------------------------------------------------
        // Sync Logic Execution
        // -----------------------------------------------------------

        const parentMap = new Map();
        
        // 1. 부모 장비
        if (Array.isArray(docs.iotb_list)) {
            for (const item of docs.iotb_list) {
                const name = generateName(item.location, 'INTEGRATED', item.index);
                const saved = await saveDevice(item, 'INTEGRATED_GATE', name);
                if (saved) parentMap.set(item.location, saved.id);
            }
        }

        // 2. 카메라
        if (Array.isArray(docs.camera_list)) {
            for (const item of docs.camera_list) {
                const description = item.description || '';
                let type = 'LPR';
                if (description.includes('정산기')) type = 'PINHOLE_CAMERA';

                const name = generateName(item.location, type, item.ip);
                const parentId = parentMap.get(item.location);
                await saveDevice(item, type, name, parentId);
            }
        }

        // 3. 전광판
        if (Array.isArray(docs.ledd_list)) {
            for (const item of docs.ledd_list) {
                const name = generateName(item.location, 'LED', item.index);
                const parentId = parentMap.get(item.location);
                await saveDevice(item, 'LED', name, parentId, item.direction?.toUpperCase());
            }
        }

        // 4. 출구 정산기
        if (Array.isArray(docs.pt_list)) {
            for (const item of docs.pt_list) {
                const name = generateName(item.location, 'KIOSK', item.ip);
                const parentId = parentMap.get(item.location);
                await saveDevice(item, 'KIOSK', name, parentId, 'OUT');
            }
        }

        // 5. 사전 정산기
        if (Array.isArray(docs.pre_pt_list)) {
            for (const item of docs.pre_pt_list) {
                const name = generateName(item.location, 'KIOSK', item.ip);
                await saveDevice(item, 'KIOSK', name, null, null); 
            }
        }

        await deviceControllerRepository.update(deviceController.id, { 
            status: 'ONLINE'
        });
        
        logger.info(`[PlsService] 장비 동기화 완료 (Parents: ${parentMap.size})`);
        return true;

    } catch (error) {
        logger.error(`[PlsService] 장비 동기화 실패: ${error.message}`);
        await deviceControllerRepository.update(deviceController.id, { status: 'OFFLINE' });
        throw error;
    }
};