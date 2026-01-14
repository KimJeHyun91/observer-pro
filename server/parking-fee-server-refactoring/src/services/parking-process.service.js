const ParkingSessionRepository = require('../repositories/parking-session.repository');
const DeviceReository = require('../repositories/device.repository');
const SiteRepository = require('../repositories/site.repository'); 
const LaneRepository = require('../repositories/lane.repository'); 
const FeeService = require('./fee.service');
const AlertService = require('./alert.service');
const logger = require('../../../logger');
const AdapterFactory = require('../adapters/adapter.factory');

/**
 * ==============================================================================
 * Parking Process Service
 * ------------------------------------------------------------------------------
 * 역할:
 * 1. 입차(Entry) 및 출차(Exit) 시나리오의 핵심 비즈니스 로직을 수행합니다.
 * 2. 요금 계산(FeeService), 알림/소켓(AlertService), 하드웨어 제어(Adapter)를 조율합니다.
 * ==============================================================================
 */
class ParkingProcessService {
    constructor() {
        this.parkingSessionRepository = new ParkingSessionRepository();
        this.siteRepository = new SiteRepository();
        this.laneRepository = new LaneRepository();
        this.alertService = new AlertService();
        this.feeService = new FeeService();
        this.deviceRepository = new DeviceReository();
    }

    /**
     * 입출차 통합 처리 진입점
     * @param {Object} data
     */
    async processEntryExit(data) {
        const { direction } = data;

        if (direction && direction.toUpperCase() === 'IN') {
            return await this._handleEntry(data);
        } else if (direction && direction.toUpperCase() === 'OUT') {
            return await this._handleExit(data);
        } else {
            logger.warn(`[ParkingProcess] 알 수 없는 방향(Direction): ${direction}`);
            return { success: false, shouldOpenGate: false, message: 'Invalid Direction' };
        }
    }

    // =================================================================
    // 1. 입차 로직 (Entry)
    // =================================================================
    async _handleEntry(data) {
        const { 
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
        } = data;

        logger.info(`[Process:Entry] 입차 시도: ${carNumber} (Site: ${siteId})`);

        try {
            // 0. 사이트 정보 조회
            const site = await this.siteRepository.findById(siteId);
            if (!site) throw new Error(`Site info not found for ID: ${siteId}`);

            // 차선 정보 조회
            let laneName = 'Unknown Lane';
            if (laneId) {
                const lane = await this.laneRepository.findById(laneId);
                if (lane) laneName = lane.name;
            }

            // 1. [Ghost Check] 중복 입차(미출차) 체크 및 자동 정리
            const activeParkingSession = await this.parkingSessionRepository.findParkingActiveSession(siteId, carNumber);
            
            if (activeParkingSession) {
                logger.warn(`[Process:Entry] 미출차(Ghost) 차량 재입차 감지 -> 기존 세션 강제 종료: ${activeParkingSession.id}`);
                
                // 기존 세션 강제 종료
                await this.parkingSessionRepository.updateExit(activeParkingSession.id, {
                    exitTime: new Date(), 
                    status: 'FORCE_COMPLETED',
                    note: `[System] 재입차로 인한 자동 강제 종료 (Ghost Session Cleanup)`
                });
            }

            // 2. 입차 세션 생성
            const newParkingSession = await this.parkingSessionRepository.create({
                siteId,
                siteName: site.name,
                siteCode: site.code,
                zoneId,
                entryLaneId: laneId,
                entryLaneName: laneName,
                carNumber,
                
                vehicleType: data.vehicleType || (isMember ? 'MEMBER' : 'NORMAL'),
                
                entryTime: eventTime,
                entryImageUrl: imageUrl,
                entrySource: 'SYSTEM',
                
                status: 'PENDING_ENTRY',
                note: activeParkingSession ? '재입차(Ghost 처리됨)' : null
            });
 
            // 3. 차단기 개방 판단
            const shouldOpenGate = true; 

            logger.info(`[Process:Entry] 세션 생성 완료: ${carNumber} (ID: ${newParkingSession.id})`);

            this.alertService.sendLprUpdate({
                parkingSessionId: newParkingSession.id,
                siteId: siteId,
                carNumber: carNumber,
                direction: 'IN',
                deviceIp: deviceIp, 
                devicePort: devicePort, 
                location: location, 
                imageUrl: imageUrl,
                eventTime: eventTime,
                isBlacklist: isBlacklist,
                vehicleType: newParkingSession.vehicleType,
                status: newParkingSession.status
            })

            // 5. 차단기 제어
            if (shouldOpenGate) {
                await this._triggerOpenGate(deviceControllerId, location);
            }

            return {
                success: true,
                shouldOpenGate,
                message: 'Entry Processed',
                session: newParkingSession
            };

        } catch (error) {
            logger.error(`[Process:Entry] 실패: ${error.message}`);
            throw error;
        }
    }

    // =================================================================
    // 2. 출차 로직 (Exit)
    // =================================================================
    async _handleExit(data) {
        const { 
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
        } = data;

        logger.info(`[Process:Exit] 출차 시도: ${carNumber}`);

        try {
            // 0. 차선 이름 조회
            let exitLaneName = null;
            if (laneId) {
                const lane = await this.laneRepository.findById(laneId);
                if (lane) exitLaneName = lane.name;
            }

            // 1. 활성 세션 조회
            let activeParkingSession = await this.parkingSessionRepository.findParkingActiveSession(siteId, carNumber);

            // 2. [GHOST EXIT] 미입차 차량 출차 시도 처리
            if (!activeParkingSession) {
                logger.warn(`[Process:Exit] 입차 기록 없음(Ghost): ${carNumber}`);
                
                // Critical Alert 전송
                await this.alertService.sendAlert({
                    type: this.alertService.Types.GHOST_EXIT,
                    message: `👻 미입차 차량 출차 시도: ${carNumber}`,
                    siteId,
                    data: { carNumber, location: location, imageUrl, eventTime }
                });

                return {
                    success: false,
                    shouldOpenGate: false,
                    message: 'No Entry Record found (Ghost Exit)',
                    session: null
                };
            }

            // 3. 요금 계산
            const feeResult = await this.feeService.calculate({
                entryTime: activeParkingSession.entryTime,
                exitTime: eventTime,
                preSettledAt: activeParkingSession.preSettledAt,
                vehicleType: activeParkingSession.vehicleType,
                siteId: siteId
            });

            // 4. 최종 결제액 및 할인 재계산 (FeeService 위임)
            const { 
                totalDiscount, 
                recalculatedDiscounts, 
                remainingFee 
            } = this.feeService.calculateFinalPayment({
                totalFee: feeResult.totalFee,
                appliedDiscounts: activeParkingSession.appliedDiscounts, // 여기에 기본 감면 정책도 포함됨
                paidFee: activeParkingSession.paidFee || 0
            });
            
            // 5. 개방 여부 판단
            const shouldOpenGate = (remainingFee === 0);
            const nextStatus = shouldOpenGate ? 'PENDING_EXIT' : 'PAYMENT_PENDING';

            // 6. 세션 업데이트
            const updatedSession = await this.parkingSessionRepository.updateExit(activeParkingSession.id, {
                exitTime: eventTime,
                exitImageUrl: imageUrl,
                exitLaneId: laneId,
                exitLaneName: exitLaneName,
                
                totalFee: feeResult.totalFee,
                discountFee: totalDiscount,
                paidFee: activeParkingSession.paidFee || 0,
                duration: feeResult.durationMinutes,
                appliedDiscounts: recalculatedDiscounts,
                
                status: nextStatus
            });

            // 7. 후속 조치
            if (shouldOpenGate) {
                logger.info(`[Process:Exit] 무료/회차/정산완료 출차: ${carNumber}`);
                await this._triggerOpenGate(deviceControllerId, location);
            } else {
                logger.info(`[Process:Exit] 과금 출차 대기: ${carNumber} (미납 ${remainingFee}원)`);

                // 정산기(장비)에 요금 정보 전송
                if (deviceControllerId) {
                    const adapter = await AdapterFactory.getAdapter(deviceControllerId);
                    await adapter.sendPaymentInfo({
                        targetKey: location,
                        targetIp: deviceIp,
                        targetPort: devicePort,
                        carNumber: carNumber,
                        parkingFee: remainingFee,
                        inTime: activeParkingSession.entryTime,
                        outTime: eventTime
                    }).catch(e => logger.error(`[Process:Exit] 요금 전송 실패: ${e.message}`));
                }
            }

            // 8. 소켓 전송 (AlertService 이용)
            this.alertService.sendLprUpdate({
                parkingSessionId: updatedSession.id,
                siteId: siteId,
                carNumber: carNumber,
                direction: 'OUT',
                
                deviceIp: deviceIp, 
                devicePort: devicePort, 
                location: location, 
                
                imageUrl: imageUrl,
                eventTime: eventTime,
                
                totalFee: feeResult.totalFee,
                remainingFee: remainingFee,
                discountFee: totalDiscount,
                preSettledFee: activeParkingSession.paidFee || 0,
                discountPolicyIds: recalculatedDiscounts.map(d => d.policyId), // ID 추출
                
                isBlacklist: isBlacklist,
                vehicleType: activeParkingSession.vehicleType,
                status: nextStatus
            });

            return {
                success: true,
                shouldOpenGate,
                message: shouldOpenGate ? 'Exit Allowed' : 'Payment Required',
                data: {
                    fee: remainingFee,
                    session: updatedSession
                }
            };

        } catch (error) {
            logger.error(`[Process:Exit] 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * [Helper] 차단기 개방 명령 전송
     * @param {string} controllerId - 장비 제어기 ID
     * @param {string} locationName - 장비 위치명 (LPR 데이터의 location)
     */
    async _triggerOpenGate(deviceControllerId, locationName) {
        try {
            if (!deviceControllerId) {
                logger.warn(`[Process] 차단기 개방 실패: Controller ID 없음 (${locationName})`);
                return;
            }

            // 1. 팩토리에서 어댑터 가져오기
            const adapter = await AdapterFactory.getAdapter(deviceControllerId);
            
            // 2. 차단기 개방 명령 (PlsAdapter.openGate 호출)
            logger.info(`[Process] 차단기 개방 명령 전송 -> ${locationName}`);
            const result = await adapter.openGate(locationName);
            
            if (!result) logger.warn(`[Process] 차단기 개방 응답 실패 (${locationName})`);

        } catch (error) {
            logger.error(`[Process] 차단기 제어 중 오류: ${error.message}`);
        }
    }

    // =================================================================
    // [NEW] 차단기 닫힘(Down) 신호 처리 -> 세션 상태 확정 (입차완료/출차완료)
    // - 호출처: PlsService.updateGateStatus (status === 'down' 일 때)
    // =================================================================
    async confirmGatePassage(laneId, eventTime) {
        try {
            logger.info(`[Gate] 차단기 닫힘(Down) 신호 수신 - LaneID: ${laneId}`);

            // 1. 해당 차선에서 '진입/진출 대기 중'인 세션 조회
            // (Repository에 findLatestTransitioningSession 메서드가 구현되어 있어야 함)
            const session = await this.parkingSessionRepository.findLatestTransitioningSession(laneId);

            if (!session) {
                // 이미 처리가 끝났거나, 차단기만 오작동한 경우 등
                logger.debug(`[Gate] 해당 차선에 상태 변경 대기 중(PENDING_ENTRY/EXIT)인 세션이 없습니다.`);
                return;
            }

            let nextStatus = null;
            let noteAppend = '';
            let logMessage = '';

            // 2. 현재 상태에 따른 다음 상태 결정
            if (session.status === 'PENDING_ENTRY') {
                // [입차 시나리오] 차단기 통과 -> '주차 중(PENDING)'으로 확정
                nextStatus = 'PENDING'; 
                noteAppend = ' (입차 차단기 통과 확인)';
                logMessage = `[Gate] 입차 완료 확정: ${session.carNumber}`;
            } 
            else if (session.status === 'PENDING_EXIT') {
                // [출차 시나리오] 차단기 통과 -> '종료(COMPLETED)'로 확정
                nextStatus = 'COMPLETED'; 
                noteAppend = ' (출차 차단기 통과 확인)';
                logMessage = `[Gate] 출차 완료 확정: ${session.carNumber}`;
            }
            else {
                // PAYMENT_PENDING 상태에서 문이 닫힌 경우 (도주, 회차, 혹은 단순 오작동)
                // 로직에 따라 여기서 처리를 안 하거나, 별도 로그를 남김
                logger.warn(`[Gate] 미결제/대기 상태(${session.status})에서 차단기 닫힘 감지: ${session.carNumber}`);
                return; 
            }

            // 3. DB 업데이트 실행
            // (일반 update 메서드를 재사용하거나, 특정 필드만 바꾸는 메서드 사용)
            const updatedSession = await this.parkingSessionRepository.update(session.id, {
                status: nextStatus,
                note: (session.note || '') + noteAppend
            });

            logger.info(logMessage);

            // [Socket] 상태 확정 알림
            this.alertService.sendLprUpdate({
                parkingSessionId: updatedSession.id,
                siteId: updatedSession.siteId,
                carNumber: updatedSession.carNumber,
                direction: null, 

                location: session.status === 'PENDING_ENTRY' ? updatedSession.entryLaneName : updatedSession.exitLaneName,
                eventTime: eventTime || new Date(),
                
                status: nextStatus,
                vehicleType: updatedSession.vehicleType,
                message: session.status === 'PENDING_ENTRY' ? '입차 완료' : '출차 완료'
            });

            return updatedSession;

        } catch (error) {
            logger.error(`[Gate] 상태 확정 처리 중 오류: ${error.message}`);
        }
    }

    /**
     * [사전 정산] 차량 번호 뒷자리로 차량 검색 및 현재 요금 계산
     * @param {string} searchKey - 차량번호 4자리
     * @param {string} siteId
     */
    async searchCarsByRearNumber(siteId, searchKey) {
        // 1. 활성 세션 중 뒷자리가 일치하는 차량 검색 (Repository 기능 필요)
        // SQL 예시: WHERE site_id = $1 AND car_number LIKE '%' || $2 AND status IN (...)
        const sessions = await this.parkingSessionRepository.findActiveSessionsBySearchKey(siteId, searchKey);
        
        const results = [];
        const now = new Date();

        // 2. 각 차량별 현재 기준 요금 계산 (미리 보여줘야 하므로)
        for (const session of sessions) {
            const feeResult = await this.feeService.calculate({
                entryTime: session.entryTime,
                exitTime: now,
                preSettledAt: session.preSettledAt, // 기존 정산 이력 반영
                vehicleType: session.vehicleType,
                siteId: siteId
            });

            // 할인 등 적용 후 최종 사용자 부담금 계산
            const totalDiscount = (session.discountFee || 0) + feeResult.discountAmount;
            const alreadyPaid = session.paidFee || 0;
            const remainingFee = Math.max(0, feeResult.totalFee - totalDiscount - alreadyPaid);

            results.push({
                carNumber: session.carNumber,
                entryTime: session.entryTime,
                totalFee: remainingFee, // 남은 요금만 표시
                entryImageUrl: session.entryImageUrl
            });
        }

        return results;
    }

    /**
     * [공통] 결제 완료 처리 (DB 반영)
     * - PLS로부터 PARK_FEE_DONE 수신 시 호출
     */
    async applyPayment(paymentData) {
        const { carNumber, paidFee, paymentDetails, siteId, deviceControllerId, location, deviceIp, devicePort } = paymentData;

        // 1. 차량 조회
        const session = await this.parkingSessionRepository.findParkingActiveSession(siteId, carNumber);
        if (!session) {
            logger.warn(`[Payment] 결제 차량 세션 없음: ${carNumber}`);
            return;
        }

        // 2. 정산 시간 갱신 (중요: 정산 후 회차 시간 적용을 위해)
        const now = new Date();
        const currentPaid = session.paidFee || 0;

        // 3. DB 업데이트
        await this.parkingSessionRepository.update(session.id, {
            paidFee: currentPaid + paidFee,
            preSettledAt: now, // 정산 시점 갱신 -> FeeService가 이 시간을 기준으로 유예 처리
            
            // 결제 상세 정보 로그 저장 (선택 사항 - 별도 테이블 권장하지만 여기선 note 등에 요약)
            note: (session.note || '') + ` /[결제] ${paidFee}원(${paymentDetails.paytime})`
        });

        logger.info(`[Payment] 결제 반영 완료: ${carNumber}, 금액: ${paidFee}`);

        const device = this.deviceRepository.findDeviceByIpAndPort(deviceIp, devicePort);

        if (device.type === 'EXIT_KIOSK') {
            await this._triggerOpenGate(deviceControllerId, location);
        }        
    }
}

module.exports = ParkingProcessService;