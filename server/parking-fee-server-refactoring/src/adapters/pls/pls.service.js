const DeviceService = require('../../services/device.service');
const MemberService = require('../../services/member.service');
const BlacklistService = require('../../services/blacklist.service');
const AlertService = require('../../services/alert.service');            
const ParkingProcessService = require('../../services/parking-process.service'); 
const DebounceService = require('../../services/debounce.service');       
const AdapterFactory = require('../../adapters/adapter.factory');  
const logger = require('../../../../logger');

/**
 * ==============================================================================
 * PLS Service
 * ------------------------------------------------------------------------------
 * 역할: 
 * 1. Controller로부터 전달받은 장비 데이터를 가공합니다.
 * 2. 장비 위치(Location)를 기반으로 DB의 Site/Lane 정보를 조회(Context Resolve)합니다.
 * 3. 핵심 입출차 로직은 ParkingProcessService에 위임합니다.
 * 4. 결과에 따라 AdapterFactory를 통해 물리 장비(차단기, 전광판)를 제어합니다.
 * ==============================================================================
 */
class PlsService {

    constructor() {
        this.deviceService = new DeviceService();
        this.memberService = new MemberService();
        this.blacklistService = new BlacklistService();
        this.alertService = new AlertService();
        this.processService = new ParkingProcessService();
        this.debounceService = new DebounceService();
    }

    /**
     * 1. LPR 데이터 처리 메인 로직
     * @param {Object} lprRawData - PLS 장비로부터 수신한 Raw Data
     */
    async processLprData(lprRawData) {
        const {
            ip,
            port,          
            lp,
            direction,
            location,
            fname,
            folder_name,
            image_url_header,
            loop_event_time
        } = lprRawData;

        // 1. 데이터 정제
        const carNumber = lp ? lp.replace(/\s/g, '') : '미인식';
        const eventTime = loop_event_time ? new Date(loop_event_time) : new Date();

        try {

            // 2. [Context 조회] 장비 위치(Location)를 기반으로 Site, Zone, Lane 정보 조회
            const context = await this._resolveLocationContext(location);

            if (!context) {
                logger.warn(`[LPR] 등록되지 않은 장비(Location)입니다: ${location} (IP: ${ip})`);
                return;
            }

            const { 
                siteId, 
                zoneId, 
                laneId, 
                deviceIp, 
                devicePort, 
                deviceControllerId, 
                deviceControllerIp, 
                deviceControllerPort 
            } = context;

            // 이미지 전체 URL 조립
            const imageUrl = `http://${deviceControllerIp}:${deviceControllerPort}${image_url_header}${folder_name}/${fname}`;

            // 3. [Debounce] 중복 요청 방지 (동일 장비, 동일 차량 5초 내 재진입 무시)
            const safeSiteId = siteId || 'UNKNOWN';
            const debounceKey = `LPR:${safeSiteId}:${location}:${carNumber}`;

            if (!this.debounceService.canProcess(debounceKey, 5000)) {
                logger.warn(`[LPR] 중복 요청 감지됨 (무시): ${carNumber} @ ${location}`);
                return;
            }

            logger.info(`[LPR] 차량 인식 시작: ${carNumber} @ ${location}`);

            // 4. [Alert] 미인식 차량 처리 (알림만 보내고 프로세스는 계속 진행)
            if (carNumber === '미인식' || carNumber === 'Unknown') {
                await this.alertService.sendAlert({
                    type: this.alertService.Types.LPR_ERROR,
                    message: `차량 번호 미인식 발생 (${location})`,
                    siteId: siteId,
                    data: { location, imageUrl, eventTime }
                });
            }

            // 5. [Blacklist] 블랙리스트 체크
            let isBlacklist = false;
            if (siteId) {
                isBlacklist = await this.blacklistService.checkBlacklist(siteId, carNumber);
                if (isBlacklist) {
                    logger.warn(`[LPR] 🚨 블랙리스트 차량 진입 시도: ${carNumber}`);
                    
                    // !! 구현 필요 알림 전송 후 차단기 개방
                    await this.alertService.sendAlert({
                        type: this.alertService.Types.BLACKLIST_DETECTED,
                        message: `블랙리스트 차량 발견: ${carNumber}`,
                        siteId,
                        data: { carNumber, location, imageUrl }
                    });
                }
            }

            // 6. [Member] 정기권/회원 여부 확인 & LED 안내
            let isMember = false;
            if (siteId && carNumber !== '미인식') {
                const member = await this.memberService.findMemberByCarNumber(siteId, carNumber);
                
                // 멤버십 상태가 유효한지 확인
                const isActiveMember = member && member.isActive && 
                                     (member.currentMembership?.status === 'ACTIVE' || member.currentMembership?.status === 'EXPIRING');

                if (isActiveMember) {
                    isMember = true;
                    // LED: 정기권 환영
                    await this._sendLedMessage(deviceControllerId, location, {
                        text1: '반갑습니다', text2: '정기권차량', color1: 'GREEN', color2: 'GREEN'
                    });
                } else {
                    // LED: 일반 방문
                    await this._sendLedMessage(deviceControllerId, location, {
                        text1: '어서오세요', text2: carNumber, color1: 'YELLOW', color2: 'YELLOW'
                    });
                }
            } else {
                // 비회원/미인식 LED
                 await this._sendLedMessage(deviceControllerId, location, {
                    text1: '어서오세요', text2: '방문객', color1: 'YELLOW', color2: 'YELLOW'
                });
            }

            // 7. [Process] 입출차 핵심 로직 위임 (세션 생성/종료, 요금 계산, DB 저장)
            const processResult = await this.processService.processEntryExit({
                carNumber,
                siteId,
                zoneId,
                laneId,
                location,
                direction,
                eventTime,
                imageUrl,
                isMember,
                isBlacklist,
                deviceIp,
                devicePort,
                deviceControllerId
            });

            logger.info(`[LPR] Process Result: Success=${processResult.success}, OpenGate=${processResult.shouldOpenGate}`);

            // 8. [Control] 차단기 제어 (Process 결과에 따름)
            if (processResult.success && processResult.shouldOpenGate) {
                logger.info(`[LPR] 차단기 개방 요청: ${location}`);
                
                // 팩토리를 통해 어댑터 획득 후 제어
                const adapter = await AdapterFactory.getAdapter(deviceControllerId);
                await adapter.openGate(location);
                
            } else {
                logger.info(`[LPR] 차단기 미개방 (사유: ${processResult.message})`);
                
                // 출차인데 미개방인 경우 (요금 미납 등) 안내 메시지
                if (direction === 'OUT' && !processResult.shouldOpenGate) {
                     await this._sendLedMessage(deviceControllerId, location, {
                        text1: '요금정산필요', text2: '정산해주세요', color1: 'RED', color2: 'RED'
                    });
                }
            }

        } catch (error) {
            logger.error(`[PlsService] LPR 처리 중 오류: ${error.message}`);
        }
    }

    /**
     * 2. 차단기 상태 변경 이벤트 처리
     * - 차단기가 완전히 내려갔을 때(down) 입/출차 세션을 '완료' 상태로 확정
     */
    async updateGateStatus(rawData) {
        const { location, status, ip, port, loop_event_time } = rawData;

        try {
            // 1. Context 조회
            const deviceContext = await this.deviceService.findOneByLocation(location);

            if (!deviceContext) {
                logger.warn(`[Gate] 알 수 없는 장비: ${rawData.gate_location}`);
                return;
            }

            const { laneId } = deviceContext;

            // 2. 차단기가 내려갔다면(down), 세션 상태 확정 로직 호출
            if (status === 'down') {
                logger.info(`[Gate] 차단기 닫힘(Down) 감지 -> 세션 상태 확정 시도 (${location})`);
                
                // 해당 차선의 대기 중인 세션을 완료 처리
                await this.processService.confirmGatePassage(laneId, loop_event_time);
            }

            // 3. 웹소켓 전송 (관제 UI 갱신용)
            if (global.websocket) {
                const socketPayload = {                
                    siteId: deviceContext.siteId,
                    zoneId: deviceContext.zoneId,
                    laneId: deviceContext.laneId,
                    deviceId: deviceContext.deviceId,
                    direction: deviceContext.direction || 'UNKNOWN',
                    deviceIp: deviceContext.deviceIp,
                    devicePort: deviceContext.devicePort,
                    location: location,
                    status: status, 
                    eventTime: loop_event_time
                };
                
                global.websocket.emit("pf_gate_state-update", { gateState: { 'data': socketPayload }});
            }

        } catch (error) {
            logger.error(`[Gate] 상태 처리 오류: ${error.message}`);
        }
    }

    /**
     * 3. 결제 성공 처리 (정산기 -> 서버)
     * - PLS에서 PARK_FEE_DONE 수신 시 호출
     */
    async processPaymentSuccess(data) {
        const { lp, paid_fee, location, ...details } = data;

        // 위치 정보로 Context 조회 (siteId 필요)
        const context = await this._resolveLocationContext(location);
        if (!context) return;

        // 핵심 로직 위임
        await this.processService.applyPayment({
            siteId: context.siteId,
            carNumber: lp,
            paidFee: parseInt(paid_fee || 0),
            paymentDetails: details,
            deviceControllerId: context.deviceControllerId,
            location,
            deviceIp: context.deviceIp,
            devicePort: context.devicePort
        });
    }

    /**
     * 4. 할인권 투입 처리 (재계산 요청)
     */
    async processCouponInput(couponData) {
        const { lp, couponCode, location } = couponData;
        logger.info(`[Coupon] 할인권 투입: ${lp}, 코드: ${couponCode}`);
        // 1. 할인권 유효성 검증
        // 2. 할인 적용 및 잔여 요금 재계산
        // 3. 장비에게 재계산된 요금 전송 (장비 별도 API 호출 필요)
    }

    /**
     * 5. [사전 정산] 차량 검색 요청 및 결과 전송
     * - 키오스크에서 차량번호 4자리를 입력했을 때
     */
    async searchCarAndReply({ searchKey, targetLocation, targetIp, targetPort }) {

        try {
            // Context 조회
            const context = await this._resolveLocationContext(targetLocation);
            if (!context) {
                logger.warn(`[Search] 알 수 없는 장비 위치: ${targetLocation}`);
                return; 
            }
            // 1. 차량 리스트 및 요금 조회 (ProcessService)
            const carList = await this.processService.searchCarsByRearNumber(context.siteId, searchKey);

            // 2. 결과 전송 (Adapter 사용)
            const adapter = await AdapterFactory.getAdapter(context.deviceControllerId);

            await adapter.sendCarSearchResult({
                targetKey: targetLocation,
                targetIp: targetIp,
                targetPort: targetPort,
                carList: carList
            });
        } catch (error) {
            logger.error(`[PlsService] 차량 검색 처리 실패: ${error.message}`);
        }
    }

    // =================================================================
    // Helper Methods
    // =================================================================

    /**
     * [Helper] 위치 이름(Location)으로 Context(Site, Lane, Controller 등) 조회
     */
    async _resolveLocationContext(location) {
        const device = await this.deviceService.findOneByLocation(location);
        
        if (!device) return null;
        
        return {
            siteId: device.siteId,
            zoneId: device.zoneId,
            laneId: device.laneId,
            // 장비 정보
            deviceIp: device.deviceIp,
            devicePort: device.devicePort,
            // 제어기 정보
            deviceControllerId: device.deviceControllerId,
            deviceControllerIp: device.deviceControllerIpAddress,
            deviceControllerPort: device.deviceControllerPort
        };
    }

    /**
     * [Helper] LED 전송 로직
     */
    async _sendLedMessage(controllerId, location, msgData) {

        try {
            if (!controllerId) return;

            // 1. 해당 위치(Location)에 매핑된 LED 장비 정보 조회
            const ledDevice = await this.deviceService.findLedByLocation(location);

            if (!ledDevice) {
                logger.debug(`[PlsService] LED 장비 미설정: ${location}`);
                return;
            }

            // 2. 어댑터 가져오기
            const adapter = await AdapterFactory.getAdapter(controllerId);
            
            // 3. 메시지 데이터 병합
            const fullMessage = {
                ip: ledDevice.ip, // LED 장비 실제 IP
                port: ledDevice.port,
                text1: msgData.text1 || '',
                text2: msgData.text2 || '',
                color1: msgData.color1 || 'GREEN',
                color2: msgData.color2 || 'GREEN',
                effect1: 'fixed',
                effect2: 'fixed',
                kind1: 'flash',
                ...msgData
            };

            // 4. 어댑터에 전송 요청
            await adapter.sendDisplay(location, fullMessage);
        } catch (error) {
            logger.warn(`[PlsService] LED 전송 실패 (${location}): ${error.message}`);
        }
    }
}

module.exports = PlsService;