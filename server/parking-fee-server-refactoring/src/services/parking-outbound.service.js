const { pool } = require('../repositories/pool');
const AdapterFactory = require('../adapters/adapter.factory');
const logger = require('../utils/logger');

const ParkingSessionService = require('./parking-session.service');
const LogService = require('./log.service');
const PolicyService = require('./policy.service');

class ParkingOutboundService {
    constructor() {
        this.parkingSessionService = new ParkingSessionService();
        this.logService = new LogService();
        this.policyService = new PolicyService();
    }

    /**
     * 출차 프로세스 (LPR 인식)
     */
    async processOutbound(siteId, laneId, carNum) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            logger.info(`[Outbound] Start processing: ${carNum}`);

            const adapter = AdapterFactory.getAdapter(siteId);
            const siteConfig = await this.policyService.getSiteConfig(siteId);
            const isFreeMode = siteConfig.operation_mode === 'FREE';

            // 1. 차량 조회 (Fuzzy Match 포함)
            let parkingRecord = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (!parkingRecord) {
                const similarSession = await this.parkingSessionService.findSimilarRunningSession(siteId, carNum);
                if (similarSession) parkingRecord = similarSession;
            }

            if (!parkingRecord) {
                const ghostPolicy = siteConfig.unrecognized_behavior || 'MANUAL_CONFIRM';
                
                // 무료 모드일 땐 미인식 차량도 통과
                if (isFreeMode) {
                    await adapter.openGate(laneId);
                    await adapter.sendDisplay(laneId, "무료개방", "안녕히가세요");
                    await client.query('COMMIT');
                    return { status: 'EXIT_Free', fee: 0, message: 'Free Mode Exit' };
                }

                await adapter.sendDisplay(laneId, "차량번호미확인", "정산소문의");
                await this.logService.createOperatorLog({ siteId, laneId, action: 'GHOST_VEHICLE', reason: `No entry record for ${carNum}` });
                await client.query('COMMIT');
                return { status: 'UNRECOGNIZED', policy: ghostPolicy, message: 'Entry record not found.' };
            }

            // 2. 요금 계산
            const outTime = new Date();
            const { remainingFee, isGracePeriod } = await this.calculateRemainingFee(siteId, parkingRecord, outTime, isFreeMode);
            const finalFee = isGracePeriod ? 0 : remainingFee;

            // 3. 결제 판단
            if (finalFee <= 0) {
                await this.completeExit(client, adapter, siteId, laneId, parkingRecord, 0);
                await client.query('COMMIT');
                return { status: 'EXIT_Free', fee: 0 };
            } else {
                logger.info(`[Outbound] Payment required: ${finalFee} won`);
                await adapter.requestPayment(laneId, carNum, finalFee);
                // 출차 시도 차선 업데이트
                await this.parkingSessionService.updateSessionStatus(client, parkingRecord.id, 'PAYMENT_PENDING', finalFee);
                await client.query('COMMIT');
                return { status: 'PAYMENT_REQUIRED', fee: finalFee };
            }
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[Outbound] Error: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * [공용] 요금 재계산 및 정산기 화면 갱신
     * - ManagementService 등에서 데이터를 수정한 후 호출
     */
    async refreshPaymentIfNeeded(client, siteId, parkingRecord) {
        if (parkingRecord.status !== 'PAYMENT_PENDING') return;

        try {
            const adapter = AdapterFactory.getAdapter(siteId);
            const outTime = new Date();
            const { remainingFee, isGracePeriod } = await this.calculateRemainingFee(siteId, parkingRecord, outTime, false);
            const finalFee = isGracePeriod ? 0 : remainingFee;

            // DB에 저장된 exit_lane_id가 있다고 가정 (실제로는 세션에서 관리하거나 파라미터로 받아야 함)
            // 여기서는 parkingRecord 객체에 exit_lane_id가 포함되어 있다고 가정합니다.
            const exitLaneId = parkingRecord.exit_lane_id || parkingRecord.last_active_lane_id;

            if (exitLaneId) {
                logger.info(`[Refresh] Refreshing fee for ${parkingRecord.car_number} to ${finalFee}`);
                
                if (finalFee === 0) {
                    // 0원이 되면 즉시 출차 처리
                    await this.completeExit(client, adapter, siteId, exitLaneId, parkingRecord, 0);
                } else {
                    await adapter.requestPayment(exitLaneId, parkingRecord.car_number, finalFee);
                    await this.parkingSessionService.updateSessionStatus(client, parkingRecord.id, 'PAYMENT_PENDING', finalFee);
                }
            }
        } catch (error) {
            logger.warn(`[Refresh] Failed to refresh: ${error.message}`);
        }
    }

    /**
     * [공용] 출차 완료 처리
     */
    async completeExit(client, adapter, siteId, laneId, parkingRecord, finalFee) {
        await this.parkingSessionService.closeSession(client, parkingRecord.id, {
            outTime: new Date(), laneId, fee: finalFee
        });
        await this.logService.createOutboundLog(client, {
            ...parkingRecord, outTime: new Date(), fee: finalFee, laneId
        });
        await adapter.openGate(laneId);
        await adapter.sendDisplay(laneId, "안녕히가세요", "감사합니다");
        logger.info(`[Exit] ${parkingRecord.car_number} exited. Fee: ${finalFee}`);
    }

    /**
     * [공용] 요금 계산 로직
     */
    async calculateRemainingFee(siteId, parkingRecord, targetTime, isFreeMode) {
        if (isFreeMode || parkingRecord.vehicle_type === 'MEMBER') {
            return { remainingFee: 0, isGracePeriod: true };
        }

        let totalFee = await this.policyService.calculateFee(siteId, parkingRecord.entry_time, targetTime);
        totalFee = await this.policyService.applyDiscounts(siteId, totalFee, parkingRecord);
        const paidFee = parkingRecord.paid_fee || 0;
        let remainingFee = Math.max(0, totalFee - paidFee);
        let isGracePeriod = false;

        if (parkingRecord.status === 'PRE_SETTLED') {
            const graceMinutes = await this.policyService.getPreSettlementGraceMinutes(siteId);
            const minutesAfterSettlement = (targetTime - new Date(parkingRecord.updated_at)) / (1000 * 60);
            if (minutesAfterSettlement <= graceMinutes) {
                isGracePeriod = true;
                remainingFee = 0;
            }
        }
        return { remainingFee, isGracePeriod };
    }

    // ... (이하 사전정산, 할인스캔, 결제 처리 등 기존 Outbound 로직 포함)
    
    async processDiscountScan(siteId, laneId, carNum, discountCode) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            const parkingRecord = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (!parkingRecord) throw new Error("Vehicle not found");

            await this.policyService.registerDiscount(client, parkingRecord.id, discountCode);
            await this.logService.createOperatorLog({ siteId, laneId, operatorId: 'KIOSK', action: 'SCAN_DISCOUNT', reason: `Code: ${discountCode}` });

            // 요금 갱신
            const recordWithLane = { ...parkingRecord, exit_lane_id: laneId };
            await this.refreshPaymentIfNeeded(client, siteId, recordWithLane);

            await client.query('COMMIT');
            return { status: 'SUCCESS' };
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }

    async confirmPreSettlement(siteId, parkingId, paidAmount) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            const parkingRecord = await this.parkingSessionService.getSessionById(siteId, parkingId);
            if (!parkingRecord) throw new Error("Record not found");
            await this.parkingSessionService.completePreSettlement(client, parkingId, (parkingRecord.paid_fee || 0) + paidAmount);
            await client.query('COMMIT');
            return { status: 'SUCCESS' };
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }

    async processPaymentSuccess(siteId, laneId, carNum, paidAmount) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            const adapter = AdapterFactory.getAdapter(siteId);
            const parkingRecord = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (!parkingRecord) throw new Error("Record not found");
            await this.completeExit(client, adapter, siteId, laneId, parkingRecord, paidAmount);
            await client.query('COMMIT');
            return { status: 'SUCCESS' };
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }

    async searchVehiclesForPreSettlement(siteId, carNum4Digit) {
        const records = await this.parkingSessionService.searchRunningSessionsBy4Digit(siteId, carNum4Digit);
        const results = [];
        const now = new Date();
        for (const r of records) {
            let fee = 0;
            if (r.vehicle_type !== 'MEMBER') {
                const { remainingFee } = await this.calculateRemainingFee(siteId, r, now, false);
                fee = remainingFee;
            }
            results.push({ parkingId: r.id, carNum: r.car_number, inTime: r.entry_time, fee, imageUrl: r.entry_image });
        }
        return results;
    }

    async retryPaymentSync(siteId, carNum) {
        const client = await pool.getClient();
        try {
            const parkingRecord = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (!parkingRecord) throw new Error("Vehicle not found");
            if (parkingRecord.status !== 'PAYMENT_PENDING') throw new Error("Not in payment pending");
            await this.refreshPaymentIfNeeded(client, siteId, parkingRecord);
            return { status: 'SUCCESS' };
        } finally { client.release(); }
    }

    async processPaymentFailure(siteId, laneId, carNum, reason) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            const session = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (!session) throw new Error("Session not found");
            await this.parkingSessionService.updateSessionStatus(client, session.id, 'RUNNING', session.total_fee);
            logger.info(`[PaymentFailure] ${carNum}: ${reason}`);
            await client.query('COMMIT');
            return { status: 'SUCCESS' };
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
}

module.exports = ParkingOutboundService;