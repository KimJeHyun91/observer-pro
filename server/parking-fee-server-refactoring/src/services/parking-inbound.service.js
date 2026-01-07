const { pool } = require('../repositories/pool');
const AdapterFactory = require('../adapters/adapter.factory');
const logger = require('../utils/logger');

const ParkingSessionService = require('./parking-session.service');
const LogService = require('./log.service');
const BlacklistService = require('./blacklist.service');
const MemberService = require('./member.service');
const PolicyService = require('./policy.service');
const SiteService = require('./site.service');

class ParkingInboundService {
    constructor() {
        this.parkingSessionService = new ParkingSessionService();
        this.logService = new LogService();
        this.blacklistService = new BlacklistService();
        this.memberService = new MemberService();
        this.policyService = new PolicyService();
        this.siteService = new SiteService();
    }

    /**
     * 입차 프로세스 (LPR 인식)
     */
    async processInbound(siteId, laneId, carNum, imageUrl) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            logger.info(`[Inbound] Start processing: ${carNum} at Site ${siteId}, Lane ${laneId}`);

            const adapter = AdapterFactory.getAdapter(siteId);
            const siteConfig = await this.policyService.getSiteConfig(siteId);
            const blacklistPolicy = siteConfig.blacklist_behavior || 'BLOCK';
            const isFreeMode = siteConfig.operation_mode === 'FREE';

            // 1. 블랙리스트 체크
            const isBlacklisted = await this.blacklistService.checkBlacklist(carNum);
            if (isBlacklisted) {
                if (blacklistPolicy === 'BLOCK') {
                    logger.warn(`[Inbound] Blacklisted (BLOCK): ${carNum}`);
                    await adapter.sendDisplay(laneId, "출입제한차량", "관리실문의");
                    await this.logService.createOperatorLog({ siteId, laneId, action: 'BLACKLIST_ALERT', reason: `Blocked entry for ${carNum}` });
                    await client.query('COMMIT');
                    return { status: 'BLOCKED', message: 'Blacklisted vehicle blocked' };
                } else if (blacklistPolicy === 'WARN') {
                    logger.warn(`[Inbound] Blacklisted (WARN): ${carNum}`);
                    await this.logService.createOperatorLog({ siteId, laneId, action: 'BLACKLIST_WARN', reason: `Allowed entry for blacklisted ${carNum}` });
                    await adapter.sendDisplay(laneId, "방문환영", "관리실문의");
                }
            }

            // 2. 정기권 및 중복 체크
            const memberInfo = await this.memberService.findMemberByCarNum(siteId, carNum);
            const isMember = !!memberInfo;

            const existingParking = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (existingParking) {
                logger.warn(`[Inbound] Duplicate entry detected: ${carNum}`);
                await adapter.sendDisplay(laneId, "입차중인차량", "관리실문의");
                await client.query('COMMIT');
                return { status: 'DUPLICATE', message: 'Vehicle already inside' };
            }

            // 3. 재입차 제한 (Anti-Passback)
            if (!isMember) {
                const lastSession = await this.parkingSessionService.findLastExitSession(siteId, carNum);
                const reEntryLimitMinutes = siteConfig.re_entry_limit_minutes || 0;
                if (lastSession && reEntryLimitMinutes > 0) {
                    const minutesSinceExit = (new Date() - new Date(lastSession.exit_time)) / (1000 * 60);
                    if (minutesSinceExit < reEntryLimitMinutes) {
                        logger.info(`[Inbound] Re-entry restricted: ${carNum}`);
                        // 정책에 따라 차단 또는 로깅 (여기선 로깅만 수행)
                    }
                }
            }

            // 4. 만차 체크
            if (!isMember && !isFreeMode) {
                const isFull = await this.siteService.checkIsFull(siteId);
                if (isFull) {
                    logger.info(`[Inbound] Site is full. Blocking: ${carNum}`);
                    await adapter.sendDisplay(laneId, "만차", "진입불가");
                    await client.query('COMMIT');
                    return { status: 'FULL', message: 'Parking lot is full' };
                }
            }

            // 5. 세션 생성
            const parkingData = {
                siteId, laneId, carNum, inTime: new Date(), imageUrl,
                isMember, type: isMember ? 'MEMBER' : 'GENERAL'
            };
            const parkingRecord = await this.parkingSessionService.createSession(client, parkingData);
            await this.logService.createInboundLog(client, parkingData);

            // 6. 장비 제어
            let displayMsg1 = "어서오세요";
            let displayMsg2 = isMember ? `정기권회원` : `일반차량`;
            if (isFreeMode) displayMsg2 = "무료개방";

            await adapter.openGate(laneId);
            await adapter.sendDisplay(laneId, displayMsg1, displayMsg2);

            await client.query('COMMIT');
            logger.info(`[Inbound] Success: ${carNum}`);
            return { status: 'SUCCESS', data: parkingRecord };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[Inbound] Error processing ${carNum}: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 수동 입차 처리
     */
    async processManualInbound(siteId, laneId, carNum, operatorId, reason) {
        const client = await pool.getClient();
        try {
            await client.query('BEGIN');
            const adapter = AdapterFactory.getAdapter(siteId);

            const existingParking = await this.parkingSessionService.findRunningSession(siteId, carNum);
            if (existingParking) throw new Error(`Vehicle ${carNum} is already inside.`);

            const parkingData = {
                siteId, laneId, carNum, inTime: new Date(), imageUrl: null,
                isMember: false, type: 'GENERAL_MANUAL'
            };
            const parkingRecord = await this.parkingSessionService.createSession(client, parkingData);

            await this.logService.createInboundLog(client, { ...parkingData, note: `Manual entry by ${operatorId}: ${reason}` });
            await this.logService.createOperatorLog({ siteId, laneId, operatorId, action: 'MANUAL_INBOUND', reason });

            await adapter.openGate(laneId);
            await adapter.sendDisplay(laneId, "수동입차", "어서오세요");

            await client.query('COMMIT');
            return { status: 'SUCCESS', data: parkingRecord };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = ParkingInboundService;