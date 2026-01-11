const ParkingSessionRepository = require('../repositories/parking-session.repository');
const SiteRepository = require('../repositories/site.repository'); // [필수] 사이트 정보 조회용
const LaneRepository = require('../repositories/lane.repository'); // [필수] 차선 정보 조회용
const FeeService = require('./fee.service');
const AlertService = require('./alert.service');
const logger = require('../../../logger');

class ParkingProcessService {
    constructor() {
        this.sessionRepository = new ParkingSessionRepository();
        // [추가] 리포지토리 인스턴스 생성 (이름 조회에 사용)
        this.siteRepository = new SiteRepository();
        this.laneRepository = new LaneRepository();
        
        this.feeService = FeeService;
    }

    /**
     * 입출차 통합 처리 (LPR Service에서 호출)
     * @param {Object} data - { carNumber, siteId, zoneId, laneId, eventTime, direction, ... }
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
            locationName,
            direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
            eventTime,
            imageUrl,
            isMember,
            isBlacklist,
            ip,
            port 
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

            // 1. 중복 입차(Ghost Session) 체크 및 자동 정리
            const activeSession = await this.sessionRepository.findActiveSession(siteId, carNumber);
            
            if (activeSession) {
                logger.warn(`[Process:Entry] 미출차(Ghost) 차량 재입차 감지 -> 기존 세션 강제 종료: ${activeSession.id}`);
                
                // [수정] 바로 리턴하지 않고, 기존 세션을 강제 종료 처리함
                await this.sessionRepository.updateExit(activeSession.id, {
                    exitTime: new Date(), 
                    status: 'FORCE_COMPLETED',
                    
                    // [중요] 아까 발생했던 SQL 에러 방지를 위해 컬럼명 통일 (totalFee)
                    totalFee: 0, 
                    discountFee: 0,
                    paidFee: 0,
                    
                    note: `[System] 재입차로 인한 자동 강제 종료 (Ghost Session Cleanup)`
                });

                // ★ 여기서 return을 하지 않습니다! 그래야 아래 '새 세션 생성'으로 넘어갑니다.
            }

            // 2. 입차 세션 생성 (새로운 기록)
            const newSession = await this.sessionRepository.create({
                siteId,
                siteName: site.name,
                siteCode: site.code,
                zoneId,
                entryLaneId: laneId,
                entryLaneName: laneName,
                carNumber,
                
                // [추가] vehicleType 처리 (Controller에서 넘겨준다고 가정, 없으면 NORMAL)
                vehicleType: data.vehicleType || (isMember ? 'MEMBER' : 'NORMAL'),
                
                entryTime: eventTime,
                entryImageUrl: imageUrl,
                entrySource: 'SYSTEM', // LPR 등 자동 입차
                
                status: 'PENDING',
                note: activeSession ? '재입차(Ghost 처리됨)' : null
            });

            // 3. 차단기 개방
            const shouldOpenGate = true; 

            logger.info(`[Process:Entry] 세션 생성 완료: ${carNumber} (ID: ${newSession.id})`);

            const socketPayload = {
                direction: 'IN',
                site_id: siteId,
                device_ip: ip || null,     // 차단기/LPR IP
                device_port: port || null, // 포트
                image_url: imageUrl,
                loop_event_time: eventTime,      // 입차 인식 시각
                
                location: locationName,
                
                carnumber: carNumber,
                
                // 입차 시점 금액 정보 (0원)
                totalFee: 0,
                discountPolicyIds: [],
                discountFee: 0,
                preSettledFee: 0,
                
                isBlacklist: isBlacklist 
            };

            // 
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { parkingSession: { 'data': socketPayload }});
            }

            return {
                success: true,
                shouldOpenGate,
                message: 'Entry Processed',
                session: newSession
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
            locationName,
            direction, // "IN" or "OUT" (LPR 데이터에 포함되어 있다고 가정)
            eventTime,
            imageUrl,
            isMember,
            isBlacklist,
            ip,
            port  
        } = data;

        logger.info(`[Process:Exit] 출차 시도: ${carNumber}`);

        try {
            // 0. 출차 차선 이름 조회
            let exitLaneName = null;
            if (laneId) {
                const lane = await this.laneRepository.findById(laneId);
                if (lane) exitLaneName = lane.name;
            }

            // 1. 활성 세션(입차 기록) 조회
            let session = await this.sessionRepository.findActiveSession(siteId, carNumber);

            // 2. [GHOST EXIT] 미입차 차량 출차 시도 처리
            if (!session) {
                logger.warn(`[Process:Exit] 입차 기록 없음(Ghost): ${carNumber}`);
                
                // [Alert] 관리자에게 즉시 알림
                await AlertService.sendAlert({
                    type: AlertService.Types.GHOST_EXIT,
                    message: `👻 미입차 차량 출차 시도: ${carNumber}`,
                    siteId,
                    data: { carNumber, location: laneId, imageUrl, eventTime }
                });

                // Ghost Session 생성을 위해 사이트 이름 조회
                const site = await this.siteRepository.findById(siteId);

                // 기록용 세션 생성 (상태: GHOST_EXIT)
                session = await this.sessionRepository.create({
                    siteId,
                    siteName: site ? site.name : 'Unknown Site', // 필수
                    
                    exitLaneId: laneId,
                    exitLaneName: exitLaneName,
                    
                    carNumber,
                    entryTime: eventTime, // 입차 시간 불명이므로 출차 시간으로 기록
                    exitTime: eventTime,
                    
                    status: 'GHOST_EXIT',
                    description: '입차 기록 없이 출차 시도됨'
                });
                
                return {
                    success: false,
                    shouldOpenGate: false, // [중요] 절대 열어주지 않음 (보안)
                    message: 'No Entry Record found (Ghost Exit)',
                    session
                };
            }

            // 3. 요금 계산 (Fee Service 위임)
            const feeResult = await this.feeService.calculate({
                entryTime: session.entryTime,
                exitTime: eventTime,
                isMember: session.isMember,
                siteId: siteId
            });

            // 4. 세션 업데이트 (출차 정보 및 요금 기록)
            const updatedSession = await this.sessionRepository.updateExit(session.id, {
                exitTime: eventTime,
                exitImageUrl: imageUrl,
                
                exitLaneId: laneId,
                exitLaneName: exitLaneName, // 출차 차선명 업데이트
                
                totalFee: feeResult.totalFee,
                discountFee: feeResult.discountAmount,
                // [수정 후] 
                // 무료(0원)라면 '0원 결제완료'로 봅니다.
                // 유료(>0원)라면 아직 결제 전이므로 '0원'으로 기록합니다.
                paidFee: 0,
                duration: feeResult.durationMinutes,
                
                // 0원이면 바로 완료(COMPLETED), 요금이 있으면 결제 대기(PAYMENT_PENDING)
                status: feeResult.finalFee === 0 ? 'COMPLETED' : 'PAYMENT_PENDING' 
            });

            // 5. 차단기 개방 여부 판단 (0원일 때만 자동 개방)
            const shouldOpenGate = (feeResult.finalFee === 0);

            if (shouldOpenGate) {
                logger.info(`[Process:Exit] 무료/회차 출차: ${carNumber} (요금 0원)`);
            } else {
                logger.info(`[Process:Exit] 과금 출차 대기: ${carNumber} (요금 ${feeResult.finalFee}원)`);
                // 여기서 정산기 화면에 요금을 띄우는 명령을 보낼 수도 있음 (PlsService 레벨에서 처리 권장)
            }

            const socketPayload = {
                direction: 'OUT',
                site_id: siteId,
                device_ip: ip || null,     // 차단기/LPR IP
                device_port: port || null, // 포트
                image_url: imageUrl,
                loop_event_time: eventTime,      // 입차 인식 시각
                
                location: locationName,
                
                carnumber: carNumber,
                
                // 입차 시점 금액 정보 (0원)
                totalFee: 0,
                discountPolicyIds: [],
                discountFee: 0,
                preSettledFee: 0,
                
                isBlacklist: isBlacklist 
            };

            // 
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { parkingSession: { 'data': socketPayload }});
            }


            return {
                success: true,
                shouldOpenGate,
                message: 'Exit Processed',
                data: {
                    fee: feeResult.finalFee,
                    session: updatedSession
                }
            };

        } catch (error) {
            logger.error(`[Process:Exit] 실패: ${error.message}`);
            throw error;
        }
    }
}

// 싱글톤으로 내보내기
module.exports = new ParkingProcessService();