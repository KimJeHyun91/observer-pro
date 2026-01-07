const { pool } = require('../repositories/pool');
const AdapterFactory = require('../adapters/adapter.factory');
const logger = require('../utils/logger');

const ParkingSessionService = require('./parking-session.service');
const LogService = require('./log.service');
const PolicyService = require('./policy.service');
const LaneService = require('./lane.service');
const MemberService = require('./member.service');
const ParkingOutboundService = require('./parking-outbound.service'); // 요금 갱신 위임용

class ParkingManagementService {
    constructor() {
        this.parkingSessionService = new ParkingSessionService();
        this.logService = new LogService();
        this.policyService = new PolicyService();
        this.laneService = new LaneService();
        this.memberService = new MemberService();
        this.outboundService = new ParkingOutboundService();
    }

    // ===================================
    // 1. 장비 제어 및 이벤트 (Device Control & Events)
    // ===================================

    /**
     * 차단기(게이트) 수동 제어
     * @param {string} command - 'OPEN' | 'CLOSE'
     */
    async controlGate(client, siteId, laneId, operatorId, command, reason) {
        const adapter = AdapterFactory.getAdapter(siteId);
        let actionType = '';
        
        if (command === 'OPEN') {
            await adapter.openGate(laneId);
            await adapter.sendDisplay(laneId, "수동개방", "통과하세요");
            actionType = 'FORCE_OPEN';
        } else if (command === 'CLOSE') {
            if (adapter.closeGate) {
                await adapter.closeGate(laneId);
            } else {
                logger.warn(`[ControlGate] Adapter does not support closeGate`);
            }
            await adapter.sendDisplay(laneId, "정지", "진입금지");
            actionType = 'FORCE_CLOSE';
        } else {
            throw new Error(`Invalid command: ${command}`);
        }

        await this.logService.createOperatorLog({ 
            siteId, laneId, operatorId, action: actionType, reason 
        });
        
        return { status: 'SUCCESS', action: actionType };
    }

    /**
     * 전광판 수동 메시지 전송
     */
    async sendManualDisplay(siteId, laneId, operatorId, line1, line2) {
        const adapter = AdapterFactory.getAdapter(siteId);
        await adapter.sendDisplay(laneId, line1, line2);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId, operatorId, 
            action: 'MANUAL_DISPLAY', reason: `Displayed: ${line1} / ${line2}` 
        });
        
        return { status: 'SUCCESS' };
    }

    /**
     * 긴급 전체 개방 (재난 시)
     */
    async triggerEmergencyOpen(client, siteId, operatorId) {
        const adapter = AdapterFactory.getAdapter(siteId);
        const lanes = await this.laneService.findLanesBySite(siteId);
        
        // 모든 차단기 개방 시도 (병렬 처리)
        const promises = lanes.map(l => adapter.openGate(l.id).catch(e => logger.error(`Emergency open failed for lane ${l.id}: ${e.message}`)));
        await Promise.all(promises);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: null, operatorId, 
            action: 'EMERGENCY_OPEN', reason: 'All Open Triggered' 
        });
        
        return { status: 'SUCCESS', count: lanes.length };
    }

    /**
     * 차단기 상태 이벤트 처리 (PLS -> Observer)
     */
    async processBreakerStatus(siteId, laneId, status, eventTime) {
        await this.logService.createDeviceEventLog({ 
            siteId, laneId, deviceType: 'BREAKER', type: 'STATUS_CHANGE', 
            message: status, time: eventTime || new Date() 
        });

        // 강제 개방(충돌) 등 이상 상태 감지 시 알림
        if (status === 'FORCED_OPEN' || status === 'ERROR') {
            logger.error(`[BreakerAlert] Abnormal: ${status} at Lane ${laneId}`);
            await this.logService.createOperatorLog({ 
                siteId, laneId, action: 'BREAKER_ALARM', reason: `Abnormal: ${status}` 
            });
        }
        return { status: 'SUCCESS' };
    }

    /**
     * 루프 감지 이벤트 처리
     */
    async processVehicleDetection(siteId, laneId, detectionData) {
        // 트랜잭션이 필요한 경우 Controller에서 client를 생성해 전달받거나, 여기서 생성
        // 여기선 단순 로그라 서비스 내에서 처리
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            await this.logService.createVehicleDetectionLog(client, { siteId, laneId, ...detectionData });
            await client.query('COMMIT');
            return { status: 'SUCCESS' };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * 장비 결제 요청 취소
     */
    async cancelPaymentOnDevice(client, siteId, laneId, carNum, operatorId) {
        const adapter = AdapterFactory.getAdapter(siteId);
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");

        // DB 상태 복구
        await this.parkingSessionService.updateSessionStatus(client, session.id, 'RUNNING', session.total_fee);
        
        // 장비 취소 명령
        if (adapter.cancelPayment) {
            await adapter.cancelPayment(laneId);
        }
        
        await this.logService.createOperatorLog({ 
            siteId, laneId, operatorId, action: 'CANCEL_PAYMENT_REQ', reason: 'Force cancel' 
        });
        
        return { status: 'SUCCESS' };
    }

    // ===================================
    // 2. 운영 보정 (Correction & Modification)
    // ===================================

    /**
     * 차량 번호 수정
     */
    async updateLicensePlate(client, siteId, oldCarNum, newCarNum, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, oldCarNum);
        if (!session) throw new Error(`Active session for ${oldCarNum} not found.`);
        
        // 중복 체크
        const duplicate = await this.parkingSessionService.findRunningSession(siteId, newCarNum);
        if (duplicate) throw new Error(`Vehicle ${newCarNum} is already parked.`);

        // DB 업데이트
        await this.parkingSessionService.updateCarNumber(client, session.id, newCarNum);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'UPDATE_PLATE', reason: `${oldCarNum} -> ${newCarNum}` 
        });
        
        // 정산기 화면 갱신
        const updatedSession = { ...session, car_number: newCarNum };
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, updatedSession);
        
        return { status: 'SUCCESS', sessionId: session.id };
    }

    /**
     * 입차 시간 수정
     */
    async updateEntryTime(client, siteId, carNum, newEntryTime, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");
        
        // 쿼리 직접 실행 대신 Repository 메서드 사용 권장 (여기선 예시)
        const query = `UPDATE parking_sessions SET entry_time = $1, updated_at = NOW() WHERE id = $2`;
        await client.query(query, [newEntryTime, session.id]);

        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'UPDATE_TIME', reason: `To: ${newEntryTime}` 
        });
        
        // 요금 재계산 및 갱신
        const updatedSession = { ...session, entry_time: newEntryTime };
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, updatedSession);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 수동 할인 적용
     */
    async applyManualDiscount(client, siteId, carNum, discountCode, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");
        
        await this.policyService.registerDiscount(client, session.id, discountCode);
        
        // 요금 갱신
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, session);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 할인 리셋
     */
    async resetDiscounts(client, siteId, carNum, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");
        
        await this.policyService.resetDiscounts(client, session.id);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'RESET_DISCOUNT', reason: 'Reset by Operator' 
        });
        
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, session);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 차량 유형 변경 (일반 <-> 정기권)
     */
    async updateSessionType(client, siteId, carNum, newType, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");
        
        await this.parkingSessionService.updateVehicleType(client, session.id, newType);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'UPDATE_TYPE', reason: newType 
        });
        
        const updatedSession = { ...session, vehicle_type: newType };
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, updatedSession);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 메모 수정
     */
    async updateSessionNote(client, siteId, carNum, note, operatorId) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");
        
        await this.parkingSessionService.updateNote(client, session.id, note);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'UPDATE_NOTE', reason: note 
        });
        
        return { status: 'SUCCESS' };
    }

    // ===================================
    // 3. 수동/예외 출차 및 정산 (Manual Exit & Payment)
    // ===================================

    /**
     * 수동 출차 (단순 개방)
     */
    async processManualExit(client, siteId, laneId, carNum, operatorId, reason) {
        const adapter = AdapterFactory.getAdapter(siteId);
        
        // 로그만 남기고 실제 세션 종료는 안 함 (필요시 closeSession 호출 추가)
        await this.logService.createOutboundLog(client, { 
            siteId, laneId, carNum, inTime: null, outTime: new Date(), 
            fee: 0, type: 'MANUAL_EXIT', operatorId, note: reason 
        });
        
        await adapter.openGate(laneId);
        await adapter.sendDisplay(laneId, "수동처리", "안녕히가세요");
        
        return { status: 'SUCCESS' };
    }

    /**
     * 수동 과금 출차 (정산기 이용)
     */
    async processManualFeeExit(client, siteId, laneId, carNum, manualFee, operatorId) {
        const adapter = AdapterFactory.getAdapter(siteId);
        
        if (manualFee > 0) {
            await adapter.requestPayment(laneId, carNum, manualFee);
            await this.logService.createOperatorLog({ 
                siteId, laneId, operatorId, 
                action: 'MANUAL_FEE_SET', reason: `Fee set to ${manualFee}` 
            });
            return { status: 'PAYMENT_REQUIRED', fee: manualFee };
        } else {
            return this.processManualExit(client, siteId, laneId, carNum, operatorId, "Manual Free Exit");
        }
    }

    /**
     * 현장 수납 처리 (현금 등)
     */
    async processManualPayment(client, siteId, laneId, carNum, amount, operatorId, note) {
        const adapter = AdapterFactory.getAdapter(siteId);
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");

        await this.logService.createOperatorLog({ 
            siteId, laneId, operatorId, 
            action: 'MANUAL_PAYMENT', reason: `Collected ${amount}. ${note || ''}` 
        });
        
        // OutboundService의 출차 완료 로직 재사용
        await this.outboundService.completeExit(client, adapter, siteId, laneId, session, amount);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 환불 처리
     */
    async refundPayment(client, siteId, carNum, amount, operatorId, reason) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");

        const query = `UPDATE parking_sessions SET paid_fee = paid_fee - $1, updated_at = NOW() WHERE id = $2`;
        await client.query(query, [amount, session.id]);
        
        await this.logService.createOperatorLog({ 
            siteId, laneId: session.entry_lane_id, operatorId, 
            action: 'REFUND', reason: `${amount} / ${reason}` 
        });
        
        await this.outboundService.refreshPaymentIfNeeded(client, siteId, session);
        
        return { status: 'SUCCESS' };
    }

    /**
     * 도주/미납 차량 처리
     */
    async processRunaway(client, siteId, laneId, carNum, operatorId, description) {
        const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
        if (!session) throw new Error("Session not found");

        // 미납액 확정 로직 등은 OutboundService 활용 가능
        const outTime = new Date();
        const { remainingFee } = await this.outboundService.calculateRemainingFee(siteId, session, outTime, false);

        // 세션 종료
        await this.parkingSessionService.closeSession(client, session.id, {
            outTime, laneId, fee: 0
        });

        // 상태 RUNAWAY 변경
        const query = `UPDATE parking_sessions SET status = 'RUNAWAY', total_fee = $1, paid_fee = 0 WHERE id = $2`;
        await client.query(query, [remainingFee, session.id]);

        await this.logService.createOperatorLog({ 
            siteId, laneId, operatorId, 
            action: 'REPORT_RUNAWAY', reason: `${description} (Unpaid: ${remainingFee})` 
        });

        return { status: 'SUCCESS', unpaidFee: remainingFee };
    }
}

module.exports = ParkingManagementService;