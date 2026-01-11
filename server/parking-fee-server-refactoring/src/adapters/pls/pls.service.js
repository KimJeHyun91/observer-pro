const DeviceService = require('../../services/device.service');
const MemberService = require('../../services/member.service');
const BlacklistService = require('../../services/blacklist.service');
const alertService = require('../../services/alert.service'); // 싱글톤 인스턴스
const parkingProcessService = require('../../services/parking-process.service'); // 싱글톤 인스턴스
const debounceService = require('../../services/debounce.service'); // 싱글톤 인스턴스
const AdapterFactory = require('../../adapters/adapter.factory');
const logger = require('../../../../logger');

class PlsService {

    constructor() {
        // [수정] 클래스형 서비스들은 여기서 인스턴스화하여 사용 (의존성 관리)
        this.deviceService = new DeviceService();
        this.memberService = new MemberService();
        this.blacklistService = new BlacklistService();
    }

    /**
     * LPR 데이터 처리 메인 로직
     * @param {Object} lprRawData - PLS 장비로부터 수신한 Raw Data
     */
    async processLprData(lprRawData) {
        // 1. 데이터 추출 (Snake Case -> Camel Case 변환 및 가공)
        const { 
            lp, location, ip, port,
            fname, folder_name, image_url_header, loop_event_time, 
            direction // 필요시 사용
        } = lprRawData;

        // 차량번호 공백 제거 및 '미인식' 처리
        const carNumber = lp ? lp.replace(/\s/g, '') : '미인식';
        
        // 이미지 URL 조합
        const imageUrl = (image_url_header && folder_name && fname) 
            ? `${image_url_header}${folder_name}/${fname}` 
            : null;
            
        const eventDate = loop_event_time ? new Date(loop_event_time) : new Date();

        // 2. [Context 조회] 장비 위치(Location)를 기반으로 Site, Zone, Lane 정보 조회
        const context = await this._resolveLocationContext(location);
        
        if (!context) {
            logger.warn(`[LPR] 등록되지 않은 장비(Location)입니다: ${location}`);
            return;
        }

        const { siteId, zoneId, laneId, deviceControllerId } = context;

        // 3. [Debounce] 중복 요청 방지 (5초)
        const safeSiteId = siteId || 'UNKNOWN';
        const debounceKey = `LPR:${safeSiteId}:${location}:${carNumber}`;
        
        if (!debounceService.canProcess(debounceKey, 5000)) {
            logger.warn(`[LPR] 중복 요청 감지됨 (무시): ${carNumber} @ ${location}`);
            return;
        }

        logger.info(`[LPR] 차량 인식 시작: ${carNumber} @ ${location}`);

        try {
            // 4. [Alert] 미인식 차량 알림
            if (carNumber === '미인식' || carNumber === 'Unknown') {
                await alertService.sendAlert({
                    type: alertService.Types.LPR_ERROR, // Enum 사용
                    message: `차량 번호 미인식 발생 (${location})`,
                    siteId: siteId,
                    data: { location, imageUrl, eventTime: eventDate }
                });
                // 미인식이라도 입차 처리는 시도할지 정책 결정 (보통은 관리자 확인 필요하므로 차단기 안 엶)
                // 여기서는 계속 진행하여 '미인식'으로 입차 기록을 남김
            }

            // 5. [Blacklist] 블랙리스트 체크
            let isBlacklist = false;
            if (siteId) {
                const isBlacklisted = await this.blacklistService.checkBlacklist(siteId, carNumber);
                if (isBlacklisted) {
                    logger.warn(`[LPR] 블랙리스트 차량 진입 시도: ${carNumber}`);
                    isBlacklist = true;
                    
                    // 알림 전송
                    // await alertService.sendAlert({
                    //     type: alertService.Types.BLACKLIST_DETECTED,
                    //     message: `🚨 블랙리스트 차량 발견: ${carNumber}`,
                    //     siteId,
                    //     data: { carNumber, location, imageUrl }
                    // });
                    
                    // LED: 출입금지 표시
                    // await this._sendLedMessage(deviceControllerId, location, {
                    //     text1: '출입금지', text2: '관리자문의', color1: 'RED', color2: 'RED'
                    // });
                    
                    return; // 로직 종료 (차단기 개방 안 함)
                }
            }

            // 6. [Member] 정기권/회원 여부 확인
            let isMember = false;
            let memberId = null;

            if (siteId && carNumber !== '미인식') {
                const member = await this.memberService.findMemberByCarNumber(siteId, carNumber);
                
                // [수정] member 객체는 순수 데이터이므로 메서드(.isValid)가 없음.
                // 대신 isActive 필드와 현재 멤버십 상태(currentMembership.status)를 확인
                const isActiveMember = member && 
                                       member.isActive && 
                                       (member.currentMembership.status === 'ACTIVE' || member.currentMembership.status === 'EXPIRING');

                if (isActiveMember) {
                    isMember = true;
                    memberId = member.id;
                    
                    // LED: 환영 메시지
                    await this._sendLedMessage(deviceControllerId, location, {
                        text1: '반갑습니다', text2: '정기권차량', color1: 'GREEN', color2: 'GREEN'
                    });
                } else {
                    // LED: 일반 방문 메시지
                    await this._sendLedMessage(deviceControllerId, location, {
                        text1: '어서오세요', text2: carNumber, color1: 'YELLOW', color2: 'YELLOW'
                    });
                }
            } else {
                // 사이트 정보가 없거나 미인식인 경우 기본 메시지
                 await this._sendLedMessage(deviceControllerId, location, {
                    text1: '어서오세요', text2: '방문객', color1: 'YELLOW', color2: 'YELLOW'
                });
            }

            // 7. [Process] 입출차 비즈니스 로직 위임 (세션 생성/종료, 요금 계산 등)
            // ParkingProcessService가 성공/실패 및 차단기 개방 여부를 판단해줌
            const processResult = await parkingProcessService.processEntryExit({
                carNumber,
                siteId,
                zoneId,
                laneId,
                locationName: location,
                direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
                eventTime: eventDate,
                imageUrl,
                isMember,
                isBlacklist,
                ip,
                port
            });

            // 8. [Control] 차단기 제어 (Process 결과에 따름)
            if (processResult.success && processResult.shouldOpenGate) {
                logger.info(`[LPR] 차단기 개방 요청: ${location}`);
                
                const adapter = await AdapterFactory.getAdapter(deviceControllerId);
                await adapter.openGate(location); // 어댑터를 통해 하드웨어 제어
            } else {
                logger.info(`[LPR] 차단기 미개방 (사유: ${processResult.message})`);
            }

        } catch (error) {
            logger.error(`[LPR Service] 처리 중 치명적 오류: ${error.message}`);
            // 시스템 에러 알림 전송 가능
        }
    }

    /**
     * 차단기 상태 업데이트 (Controller -> Service)
     * - 장비로부터 상태 변경 이벤트를 받았을 때 호출됨
     */
    async updateGateStatus({ locationName, status, eventTime }) {
        logger.info(`[PLS Service] 차단기 상태 변경: ${locationName} -> ${status}`);
        // TODO: DeviceStatusService 등을 통해 DB에 현재 상태(UP/DOWN) 업데이트
        // await this.deviceService.updateDeviceStatus(locationName, status); 
    }

    /**
     * [Helper] 위치 이름으로 Context(Site, Lane 등) 조회
     */
    async _resolveLocationContext(locationName) {
        // DeviceService에 구현된 findOneByLocation 활용
        const device = await this.deviceService.findOneByLocation(locationName);
        
        if (!device) return null;

        return {
            siteId: device.siteId,
            zoneId: device.zoneId,
            laneId: device.laneId,
            deviceControllerId: device.deviceControllerId
        };
    }

    /**
     * [Helper] LED 전송 로직 (안전장치 포함)
     * - Controller ID로 어댑터를 찾고, Location으로 LED 장비 IP를 찾아서 전송
     */
    async _sendLedMessage(controllerId, locationName, msgData) {
        try {
            if (!controllerId) return;

            // 1. 해당 위치(Location)에 매핑된 LED 장비 정보 조회 (IP, Port 필요)
            // DeviceService에 findLedByLocation 메서드가 필요합니다. (이전 피드백 참조)
            const ledDevice = await this.deviceService.findLedByLocation(locationName);
            
            if (!ledDevice) {
                // LED 장비가 DB에 없으면 전송 포기 (에러 아님, 설정 문제)
                logger.debug(`[PLS Service] LED 장비 미설정: ${locationName}`);
                return;
            }

            // 2. 어댑터 가져오기
            const adapter = await AdapterFactory.getAdapter(controllerId);
            
            // 3. 메시지 기본값 채우기
            const fullMessage = {
                text1: msgData.text1 || '',
                text2: msgData.text2 || '',
                color1: msgData.color1 || 'GREEN',
                color2: msgData.color2 || 'GREEN',
                effect1: 'fixed',
                effect2: 'fixed',
                kind1: 'flash',
                ...msgData // 덮어쓰기 허용
            };

            // 4. 어댑터에 전송 요청 (LED 장비 정보 + 메시지)
            await adapter.sendDisplay(locationName, ledDevice, fullMessage);

        } catch (e) {
            // LED 전송 실패는 핵심 로직(입차)을 방해하면 안 되므로 로그만 남김
            logger.warn(`[LPR] LED 전송 실패 (${locationName}): ${e.message}`);
        }
    }
}

module.exports = new PlsService();