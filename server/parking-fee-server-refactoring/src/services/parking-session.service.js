const ParkingSessionRepository = require('../repositories/parking-session.repository');
const SiteRepository = require('../repositories/site.repository');
const LaneRepository = require('../repositories/lane.repository');
const PolicyRepository = require('../repositories/policy.repository');
const MemberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const FeeService = require('./fee.service');
const logger = require('../../../logger');

class ParkingSessionService {
    constructor() {
        this.repository = new ParkingSessionRepository();
        this.siteRepository = new SiteRepository();
        this.laneRepository = new LaneRepository();
        this.policyRepository = new PolicyRepository();
        this.memberHistoryRepository = new MemberPaymentHistoryRepository();
        this.feeService = FeeService;
    }

    // =================================================================
    // 1. [입차] Create Session (정기권 자동 판별 포함)
    // =================================================================
    async create(data) {
        if (!data.siteId || !data.carNumber) {
            const error = new Error('siteId와 carNumber는 필수입니다.');
            error.status = 400;
            throw error;
        }

        // 1. 메타데이터 조회 (Site Name)
        let siteName = data.siteName;
        let siteCode = data.siteCode;

        if (!siteName) {
            const site = await this.siteRepository.findById(data.siteId);
            if (!site) {
                const error = new Error(`존재하지 않는 사이트 ID입니다: ${data.siteId}`);
                error.status = 404;
                throw error;
            }
            siteName = site.name;
            siteCode = site.code;
        }

        // 2. [핵심] 정기권(Member) 여부 자동 판별
        // 요청에서 명시적으로 타입을 지정하지 않았거나 'NORMAL'인 경우 체크
        let vehicleType = data.vehicleType || 'NORMAL';

        if (vehicleType === 'NORMAL') {
            // 유효 기간 내의 정기권이 있는지 조회
            const activeMembership = await this.memberHistoryRepository.findValidMembership(data.carNumber);
            
            if (activeMembership) {
                vehicleType = 'MEMBER';
                logger.info(`[Auto-Member] 정기권 차량 인식: ${data.carNumber} (${activeMembership.memberName})`);
            }
        }

        // 3. 차선 이름 조회 (Optional)
        let laneName = data.laneName || 'Manual Entry';
        if (data.laneId && !data.laneName) {
            const lane = await this.laneRepository.findById(data.laneId);
            if (lane) laneName = lane.name;
        }

        // -----------------------------------------------------------
        // [수정된 부분] 중복 입차(미출차 세션) 발생 시 무조건 자동 해결
        // -----------------------------------------------------------
        const activeSession = await this.repository.findActiveSession(data.siteId, data.carNumber);
        
        if (activeSession) {
            // "입구에 차가 있다" = "기존 세션은 이미 출차했거나 오류다"
            // 따라서 에러를 내지 않고, 기존 세션을 '강제 종료' 처리하고 넘어갑니다.
            
            logger.warn(`[Auto-Correction] 미출차(Ghost) 차량 재입차 감지. 기존 세션 종료 처리: ${activeSession.id} / 차량: ${data.carNumber}`);
            
            await this.repository.updateExit(activeSession.id, {
                exitTime: new Date(), // 혹은 현재 시간보다 1초 전
                status: 'FORCE_COMPLETED',
                // 정산 금액 0원 처리 (혹은 미수금으로 남길지 정책 결정 필요. 보통 Ghost는 0원 처리)
                totalFee: 0,
                paidFee: 0,
                discountFee: 0,
                note: `[System] 재입차로 인한 자동 강제 종료 (Ghost Session)`
            });

            // ★ 중요: 여기서 return이나 throw를 하지 않아야 
            // 아래의 '5. 세션 생성' 코드가 실행되어 새 세션이 만들어지고 차단기가 열립니다.
        }

        // 5. 세션 생성
        return await this.repository.create({
            siteId: data.siteId,
            siteName: siteName,
            siteCode: siteCode,
            
            zoneId: data.zoneId || null,
            
            entryLaneId: data.laneId || null,
            entryLaneName: laneName,
            
            carNumber: data.carNumber,
            vehicleType: vehicleType, // 결정된 타입 저장
            
            entryTime: data.entryTime || new Date(),
            entryImageUrl: data.entryImageUrl || null,
            entrySource: data.entrySource || 'ADMIN',
            
            status: 'PENDING',
            note: data.note
        });
    }

    // =================================================================
    // 2. [출차] Process Exit (요금 정산 포함)
    // =================================================================
    async processExit(id, data) {
        const session = await this.repository.findById(id);
        if (!session) {
            const error = new Error('주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        if (['COMPLETED', 'FORCE_COMPLETED', 'GHOST_EXIT'].includes(session.status)) {
            const error = new Error('이미 종료된 세션입니다.');
            error.status = 400;
            throw error;
        }

        const exitTime = data.exitTime ? new Date(data.exitTime) : new Date();

        // 1. 최종 요금 계산
        const feeResult = await this.feeService.calculate({
            entryTime: session.entryTime,
            exitTime: exitTime,
            vehicleType: session.vehicleType, // MEMBER라면 0원 반환
            siteId: session.siteId
        });

        // 2. 미결제 금액 확인
        // (할인은 applyDiscount에서 이미 discountFee에 누적되어 있다고 가정)
        const currentTotalDiscount = session.discountFee || 0;
        
        // 실제 청구할 금액 = (계산된 요금 - 할인 금액) - (이미 부분 결제한 금액 등은 여기선 고려 X, 필요시 paidFee 활용)
        // 음수가 되지 않도록 방어
        const finalPaidAmount = Math.max(0, feeResult.totalFee - currentTotalDiscount);

        // 3. 결제 여부 체크 (강제 출차가 아닐 경우)
        if (finalPaidAmount > 0 && !data.force) {
            const error = new Error(`미결제 금액이 있습니다: ${finalPaidAmount}원`);
            error.code = 'PAYMENT_REQUIRED';
            error.status = 402; // Payment Required
            error.data = { 
                totalFee: feeResult.totalFee,
                discountFee: currentTotalDiscount,
                remainingFee: finalPaidAmount 
            };
            throw error;
        }

        // 4. 출차 차선 정보
        let exitLaneName = data.exitLaneName || 'Manual Exit';
        if (data.exitLaneId && !data.exitLaneName) {
            const lane = await this.laneRepository.findById(data.exitLaneId);
            if (lane) exitLaneName = lane.name;
        }

        // 5. DB 업데이트 (출차 완료 처리)
        return await this.repository.updateExit(id, {
            exitTime: exitTime,
            exitLaneId: data.exitLaneId || null,
            exitLaneName: exitLaneName,
            exitSource: data.exitSource || 'ADMIN',

            // 요금 정보 확정 저장
            totalFee: feeResult.totalFee,        // (기존) parkingFee -> (수정) totalFee
            discountFee: currentTotalDiscount,   // (기존) discountAmount -> (수정) discountFee
            paidFee: data.force ? 0 : finalPaidAmount, // (기존) paidAmount -> (수정) paidFee
            duration: feeResult.durationMinutes,

            status: data.force ? 'FORCE_COMPLETED' : 'COMPLETED',
            note: data.note || (data.force ? '관리자 강제 출차' : '정상 출차')
        });
    }

    // =================================================================
    // 3. [할인 적용] Apply Discount (다중 정책 지원)
    // =================================================================
    async applyDiscount(id, data) {
        // 1. 세션 조회
        const session = await this.repository.findById(id);
        if (!session) throw new Error('주차 세션을 찾을 수 없습니다.');

        if (['COMPLETED', 'FORCE_COMPLETED', 'GHOST_EXIT'].includes(session.status)) {
            throw new Error('이미 종료된 세션에는 할인을 적용할 수 없습니다.');
        }

        // 2. 현재 시점 기준 예상 요금 계산 (퍼센트 할인을 위해 기준 금액 필요)
        const currentFeeResult = await this.feeService.calculate({
            entryTime: session.entryTime,
            exitTime: new Date(), // 현재 시각
            vehicleType: session.vehicleType,
            siteId: session.siteId
        });
        const estimatedTotalFee = currentFeeResult.totalFee;

        // 3. 신규 할인 목록 생성
        const newDiscounts = [];
        let addedDiscountAmount = 0;

        // A. 정책 할인 (Policy IDs)
        if (data.policyIds && data.policyIds.length > 0) {
            for (const policyId of data.policyIds) {
                const policy = await this.policyRepository.findById(policyId);
                
                if (!policy) {
                    logger.warn(`존재하지 않는 정책 ID 무시됨: ${policyId}`);
                    continue;
                }
                
                if (policy.siteId !== session.siteId) {
                    throw new Error(`해당 주차장에 유효하지 않은 정책입니다: ${policy.name}`);
                }

                const discountValue = this._calculatePolicyDiscountValue(policy, estimatedTotalFee);

                newDiscounts.push({
                    type: 'POLICY',
                    policyId: policy.id,
                    code: policy.code,
                    name: policy.name,
                    discountType: policy.config.discountType,
                    value: policy.config.discountValue,
                    amount: discountValue,
                    appliedAt: new Date()
                });
                addedDiscountAmount += discountValue;
            }
        }

        // B. 수동 금액 할인 (Manual Amount)
        if (data.amount) {
            const manualAmount = parseInt(data.amount);
            newDiscounts.push({
                type: 'MANUAL',
                policyId: null,
                code: 'MANUAL',
                name: data.note || '관리자 수동 할인',
                discountType: 'FIXED_AMOUNT',
                value: manualAmount,
                amount: manualAmount,
                appliedAt: new Date()
            });
            addedDiscountAmount += manualAmount;
        }

        // 4. 기존 할인과 합산 및 DB 업데이트
        const previousDiscounts = session.appliedDiscounts || [];
        const previousDiscountFee = session.discountFee || 0;
        const finalDiscountFee = previousDiscountFee + addedDiscountAmount;

        return await this.repository.update(id, {
            discountFee: finalDiscountFee,
            appliedDiscounts: [
                ...previousDiscounts,
                ...newDiscounts
            ]
        });
    }

    /**
     * [Helper] 정책 설정에 따른 할인 금액 계산
     */
    _calculatePolicyDiscountValue(policy, currentTotalFee) {
        const config = policy.config || {};
        const value = parseInt(config.discountValue) || 0;
        
        switch (config.discountType) {
            case 'FIXED_AMOUNT': 
                return value;
            case 'PERCENT': 
                return Math.floor(currentTotalFee * (value / 100));
            case 'FREE_TIME': 
                // 시간 할인은 정확한 금액 계산이 복잡하므로 
                // 여기서는 0으로 처리하고 최종 정산 시 FeeService가 처리하도록 하거나,
                // 단순 추정치(시간 * 기본요금)를 넣을 수 있음.
                return 0; 
            default:
                return 0;
        }
    }

    // =================================================================
    // 4. [정보 수정] Update Info (오타 수정 등)
    // =================================================================
    async updateInfo(id, data) {
        const session = await this.repository.findById(id);
        if (!session) throw new Error('주차 세션을 찾을 수 없습니다.');

        const isCompleted = ['COMPLETED', 'FORCE_COMPLETED', 'CANCELLED', 'RUNAWAY'].includes(session.status);
        const updateData = {};

        // 메모는 언제나 수정 가능
        if (data.note !== undefined) updateData.note = data.note;

        // 핵심 정보는 진행 중에만 수정 가능
        if (!isCompleted) {
            if (data.carNumber) updateData.carNumber = data.carNumber;
            if (data.vehicleType) updateData.vehicleType = data.vehicleType;
            if (data.entryTime) updateData.entryTime = new Date(data.entryTime);
        } else {
            // 완료된 세션의 핵심 정보 수정 시도 차단
            if (data.carNumber || data.vehicleType || data.entryTime) {
                const error = new Error('완료된 세션의 핵심 정보는 수정할 수 없습니다.');
                error.status = 403;
                throw error;
            }
        }

        if (Object.keys(updateData).length === 0) return session;

        return await this.repository.update(id, updateData);
    }

    // =================================================================
    // 5. [목록 조회] Find All
    // =================================================================
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20;
        const offset = (page - 1) * limit;

        const sortOptions = {
            sortBy: params.sortBy || 'entry_time',
            sortOrder: params.sortOrder || 'DESC'
        };

        const filters = { ...params };
        delete filters.page;
        delete filters.limit;
        delete filters.sortBy;
        delete filters.sortOrder;

        const { rows, count } = await this.repository.findAll(filters, sortOptions, limit, offset);

        return {
            sessions: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    // =================================================================
    // 6. [상세 조회] Find Detail
    // =================================================================
    async findDetail(id) {
        const session = await this.repository.findById(id);
        if (!session) {
            const error = new Error('해당 주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return session;
    }
}

module.exports = new ParkingSessionService();