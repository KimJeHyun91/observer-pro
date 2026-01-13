const ParkingSessionRepository = require('../repositories/parking-session.repository');
const SiteRepository = require('../repositories/site.repository');
const LaneRepository = require('../repositories/lane.repository');
const PolicyRepository = require('../repositories/policy.repository');
const MemberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const FeeService = require('./fee.service');
const logger = require('../../../logger');
const AdapterFactory = require('../adapters/adapter.factory');

class ParkingSessionService {
    constructor() {
        this.repository = new ParkingSessionRepository();
        this.siteRepository = new SiteRepository();
        this.laneRepository = new LaneRepository();
        this.policyRepository = new PolicyRepository();
        this.memberHistoryRepository = new MemberPaymentHistoryRepository();
        this.feeService = FeeService;
    }

    // 생성
    async create(data) {
        if (!data.siteId || !data.carNumber) {
            const error = new Error('siteId와 carNumber는 필수입니다.');
            error.status = 400;
            throw error;
        }

        // 1. 메타데이터 조회 (Site Name)
        let siteName = data.siteName;
        let siteCode = data.siteCode;

        const source = data.entrySource || 'SYSTEM';

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

        let vehicleType = data.vehicleType || 'NORMAL';

        const activeSession = await this.repository.findActiveSession(data.siteId, data.carNumber);
        
        if (activeSession) {
            // "입구에 차가 있다" = "기존 세션은 이미 출차했거나 오류다"
            // 따라서 에러를 내지 않고, 기존 세션을 '강제 종료' 처리하고 넘어갑니다.

            if (!data.force && source === 'ADMIN') {
                const error = new Error(`이미 입차된 차량입니다: ${data.carNumber} (입차시간: ${activeSession.entryTime})`);
                error.code = 'ALREADY_IN_SESSION';
                error.status = 409; // Conflict
                error.data = { activeSessionId: activeSession.id };
                throw error;
            }
            
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

        const newSession = await this.repository.create({
            siteId: data.siteId,
            siteName: siteName,
            siteCode: siteCode,
            
            entryZoneId: data.entryZoneId || null,
            
            entryLaneId: data.entryLaneId || null,
            entryLaneName: null,
            
            carNumber: data.carNumber,
            vehicleType: vehicleType, // 결정된 타입 저장
            
            entryTime: data.entryTime || new Date(),
            entryImageUrl: data.entryImageUrl || null,
            entrySource: data.entrySource || 'ADMIN',
            
            status: 'PENDING',
            note: data.note
        });

        if (data.isMain) {
            await this._attachGateLocation(newSession, data.direction);
        }
        return newSession;
    }

    // =================================================================
    // 1. [입차] entry Session (정기권 자동 판별 포함)
    // =================================================================
    async entry(data) {
        if (!data.siteId || !data.carNumber) {
            const error = new Error('siteId와 carNumber는 필수입니다.');
            error.status = 400;
            throw error;
        }
        const source = data.entrySource || 'SYSTEM';

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

            if (!data.force && source === 'ADMIN') {
                const error = new Error(`이미 입차된 차량입니다: ${data.carNumber} (입차시간: ${activeSession.entryTime})`);
                error.code = 'ALREADY_IN_SESSION';
                error.status = 409; // Conflict
                error.data = { activeSessionId: activeSession.id };
                throw error;
            }
            
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
        const newSession = await this.repository.create({
            siteId: data.siteId,
            siteName: siteName,
            siteCode: siteCode,
            
            entryZoneId: data.entryZoneId || null,
            
            entryLaneId: data.entryLaneId || null,
            entryLaneName: laneName,
            
            carNumber: data.carNumber,
            vehicleType: vehicleType, // 결정된 타입 저장
            
            entryTime: data.entryTime || new Date(),
            entryImageUrl: data.entryImageUrl || null,
            entrySource: data.entrySource || 'ADMIN',
            
            status: 'PENDING_ENTRY',
            note: data.note
        });

        if (data.entryLaneId) {
             await this._triggerOpenGateByLane(data.entryLaneId);
        }

        // [추가] 생성된 세션에 IN 방향 위치 정보 주입
        if (data.isMain) { // 최적화: 필요한 경우에만 조회 (Controller에서 넘겨준 플래그 활용하거나 항상 조회)
             await this._attachGateLocation(newSession, data.direction);
        }

        return newSession;
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
        const alreadyPaid = session.paidFee || 0;
        
        // 실제 청구할 금액 = (계산된 요금 - 할인 금액) - (이미 부분 결제한 금액 등은 여기선 고려 X, 필요시 paidFee 활용)
        // 음수가 되지 않도록 방어
        const finalPaidAmount = Math.max(0, feeResult.totalFee - currentTotalDiscount - alreadyPaid);

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

        const finalTotalPaid = data.force ? alreadyPaid : (alreadyPaid + finalPaidAmount);

        // 4. 출차 차선 정보
        let exitLaneName = data.exitLaneName || 'Manual Exit';
        if (data.exitLaneId && !data.exitLaneName) {
            const lane = await this.laneRepository.findById(data.exitLaneId);
            if (lane) exitLaneName = lane.name;
        }

        const isPaid = (finalPaidAmount === 0);
        const nextStatus = (isPaid || data.force) ? 'PENDING_EXIT' : 'PAYMENT_PENDING';

        if ((isPaid || data.force) && data.exitLaneId) {
            if (data.exitLaneId) {
                await this._triggerOpenGateByLane(data.exitLaneId);
            }
        }

        // 5. DB 업데이트 (출차 완료 처리)
        const updatedSession = await this.repository.updateExit(id, {
            exitTime: exitTime,
            exitLaneId: data.exitLaneId || null,
            exitLaneName: exitLaneName,
            exitSource: data.exitSource || 'ADMIN',

            // 요금 정보 확정 저장
            totalFee: feeResult.totalFee,        // (기존) parkingFee -> (수정) totalFee
            discountFee: currentTotalDiscount,   // (기존) discountAmount -> (수정) discountFee
            paidFee: data.force ? 0 : finalTotalPaid, // (기존) paidAmount -> (수정) paidFee
            duration: feeResult.durationMinutes,

            status: data.force ? 'FORCE_COMPLETED' : nextStatus,
            note: data.note || (data.force ? '관리자 강제 출차' : '정상 출차')
        });

        // [추가] 출차이므로 OUT 방향 위치 정보 주입
        if (data.isMain) {
            await this._attachGateLocation(updatedSession, data.direction);
        }        
        return updatedSession;
    }

    // =================================================================
    // 3. [할인 적용/해제] Toggle Discount (단일 정책 토글 + 요금/시간 동기화)
    // =================================================================
    async applyDiscount(id, data) {
        // 1. 세션 조회
        const session = await this.repository.findById(id);
        if (!session) throw new Error('주차 세션을 찾을 수 없습니다.');

        if (['COMPLETED', 'FORCE_COMPLETED', 'GHOST_EXIT'].includes(session.status)) {
            throw new Error('이미 종료된 세션에는 할인을 변경할 수 없습니다.');
        }

        // 2. 정책 조회 및 검증
        const policy = await this.policyRepository.findById(data.policyId);
        if (!policy) {
            const error = new Error(`존재하지 않는 할인 정책입니다: ${data.policyId}`);
            error.status = 404;
            throw error;
        }

        if (policy.siteId !== session.siteId) {
            const error = new Error(`해당 주차장에 유효하지 않은 정책입니다: ${policy.name}`);
            error.status = 400;
            throw error;
        }

        // 3. [중요] 현재 시점 기준 요금 및 시간 재계산
        const currentFeeResult = await this.feeService.calculate({
            entryTime: session.entryTime,
            exitTime: new Date(), // 현재 시각 기준
            vehicleType: session.vehicleType,
            siteId: session.siteId
        });
        
        const currentTotalFee = currentFeeResult.totalFee;
        const currentDuration = currentFeeResult.durationMinutes; // [추가] 계산된 주차 시간(분)

        // 4. 토글(Toggle) 로직 수행
        let currentDiscounts = session.appliedDiscounts || [];
        const existingIndex = currentDiscounts.findIndex(d => d.policyId === policy.id);
        let action = '';

        if (existingIndex !== -1) {
            // [CASE A] 이미 존재함 -> 제거
            currentDiscounts.splice(existingIndex, 1);
            action = 'REMOVED';
        } else {
            // [CASE B] 존재하지 않음 -> 추가
            const discountValue = this._calculatePolicyDiscountValue(policy, currentTotalFee);

            currentDiscounts.push({
                type: 'POLICY',
                policyId: policy.id,
                code: policy.code,
                name: policy.name,
                discountType: policy.config.discountType,
                value: policy.config.discountValue,
                amount: discountValue,
                note: data.note || null,
                appliedAt: new Date()
            });
            action = 'APPLIED';
        }

        // 5. 전체 할인 금액 재계산
        const newTotalDiscountFee = currentDiscounts.reduce((sum, item) => sum + (item.amount || 0), 0);

        // 6. DB 업데이트 (totalFee와 함께 duration도 저장)
        const updatedSession = await this.repository.update(id, {
            totalFee: currentTotalFee,        // 현재 요금 업데이트
            duration: currentDuration,        // [추가] 현재 주차 시간 업데이트 (0 -> 실제 시간)
            discountFee: newTotalDiscountFee, // 재계산된 할인 총액
            appliedDiscounts: currentDiscounts
        });

        if (updatedSession) {
            updatedSession._action = action;
        }

        if (data.isMain) {
            await this._attachGateLocation(updatedSession, data.direction);
        }

        return updatedSession;
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
    // 4. [정보 수정] Update Info
    // - 차량 정보, 입차 시간 수정 및 그에 따른 실시간 요금/할인 DB 반영
    // =================================================================
    async updateInfo(id, data) {
        // 1. 기존 세션 조회
        const session = await this.repository.findById(id);
        if (!session) {
            const error = new Error('주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // 완료된 세션인지 확인 (완료된 경우 핵심 정보 수정 불가)
        const isCompleted = ['COMPLETED', 'FORCE_COMPLETED', 'CANCELLED', 'RUNAWAY', 'GHOST_EXIT'].includes(session.status);
        
        // 업데이트할 데이터를 담을 객체
        const updatePayload = {};

        // -------------------------------------------------------------
        // A. 메모(Note) 수정 - 상태와 무관하게 언제나 가능
        // -------------------------------------------------------------
        if (data.note !== undefined) {
            updatePayload.note = data.note;
        }

        // -------------------------------------------------------------
        // B. 핵심 정보 수정 (차량번호, 차종, 입차시간) - 진행 중에만 가능
        // -------------------------------------------------------------
        if (!isCompleted) {
            if (data.carNumber) updatePayload.carNumber = data.carNumber;
            
            // 변경 사항이 있는지 체크 (요금 재계산 트리거 여부 확인)
            const isEntryTimeChanged = data.entryTime && (new Date(data.entryTime).getTime() !== new Date(session.entryTime).getTime());
            const isVehicleTypeChanged = data.vehicleType && (data.vehicleType !== session.vehicleType);

            if (isEntryTimeChanged) updatePayload.entryTime = new Date(data.entryTime);
            if (isVehicleTypeChanged) updatePayload.vehicleType = data.vehicleType;

            // ---------------------------------------------------------
            // [중요] 입차 시간이나 차종이 바뀌었다면 -> 요금 및 할인 재계산 후 DB 저장
            // ---------------------------------------------------------
            if (isEntryTimeChanged || isVehicleTypeChanged) {
                
                // 1) 변경된 기준값 설정
                const newEntryTime = updatePayload.entryTime || session.entryTime;
                const newVehicleType = updatePayload.vehicleType || session.vehicleType;

                // 2) 요금 재계산 (FeeService 호출)
                //    * exitTime은 '현재 시각'을 기준으로 계산하여 중간 정산 금액을 맞춤
                const feeResult = await this.feeService.calculate({
                    entryTime: newEntryTime,
                    exitTime: new Date(), 
                    vehicleType: newVehicleType,
                    siteId: session.siteId
                });

                updatePayload.totalFee = feeResult.totalFee;
                updatePayload.duration = feeResult.durationMinutes;

                // 3) 할인 금액 재계산 (Cascade Update)
                //    * 요금(TotalFee)이 변했으므로, '퍼센트(%)' 할인들의 금액도 달라져야 함
                if (session.appliedDiscounts && session.appliedDiscounts.length > 0) {
                    let newTotalDiscountFee = 0;
                    
                    const recalculatedDiscounts = session.appliedDiscounts.map(discount => {
                        let amount = discount.amount;

                        // 정책 할인 중 'PERCENT' 타입은 변경된 요금 기준으로 다시 계산
                        if (discount.type === 'POLICY' && discount.discountType === 'PERCENT') {
                            amount = Math.floor(updatePayload.totalFee * (discount.value / 100));
                        }
                        
                        newTotalDiscountFee += amount;

                        return {
                            ...discount,
                            amount: amount
                        };
                    });

                    updatePayload.appliedDiscounts = recalculatedDiscounts;
                    updatePayload.discountFee = newTotalDiscountFee;
                }
            }

        } else {
            // 완료된 세션인데 핵심 정보를 수정하려 할 경우 차단
            if (data.carNumber || data.vehicleType || data.entryTime) {
                const error = new Error('이미 출차 완료된 세션의 핵심 정보(차량번호, 시간 등)는 수정할 수 없습니다.');
                error.status = 403;
                throw error;
            }
        }

        // -------------------------------------------------------------
        // C. DB 업데이트 실행
        // -------------------------------------------------------------
        // 수정할 필드가 없다면 원본 그대로 반환
        if (Object.keys(updatePayload).length === 0) {
            return session; 
        }

        const updatedSession = await this.repository.update(id, updatePayload);

        // -------------------------------------------------------------
        // D. 응답 포맷팅
        // -------------------------------------------------------------
        // 요금은 위에서 DB에 저장했으므로, 굳이 다시 _recalculateRealtimeSession을 
        // 호출할 필요는 없으나, 미세한 시간 차이(ms) 보정을 위해 호출해도 무방함.
        // 여기서는 DB 저장값을 신뢰하고 그대로 반환합니다.

        if (data.isMain) {
            await this._attachGateLocation(updatedSession, data.direction);
        }

        return updatedSession;
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
    // 6. [상세 조회] Find Detail (실시간 요금 및 할인 재계산)
    // =================================================================
    async findDetail(id, direction, isMain) {
        // 1. DB에서 세션 조회
        const session = await this.repository.findById(id);
        
        if (!session) {
            const error = new Error('해당 주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // 2. 실시간 요금/할인 재계산 적용
        // (진행 중인 세션일 경우 메모리 상에서 값을 갱신하여 반환)

        if (isMain) {
            await this._attachGateLocation(session, direction);
        }
        return await this._recalculateRealtimeSession(session);
    }

    // =================================================================
    // [Private Helper] 실시간 요금 및 할인 재계산 로직
    // - 조회 시점(현재) 기준으로 totalFee와 퍼센트 할인을 다시 계산합니다.
    // - DB를 업데이트하지 않고, 반환할 객체(session)만 수정합니다.
    // =================================================================
    async _recalculateRealtimeSession(session) {
        // 이미 종료된 세션은 계산할 필요 없이 그대로 반환
        if (['COMPLETED', 'FORCE_COMPLETED', 'GHOST_EXIT'].includes(session.status)) {
            return session;
        }

        try {
            // 1. 현재 시간 기준 총 요금 계산
            const currentFeeResult = await this.feeService.calculate({
                entryTime: session.entryTime,
                exitTime: new Date(), // 현재 시각
                vehicleType: session.vehicleType,
                siteId: session.siteId
            });

            // 값 갱신
            session.totalFee = currentFeeResult.totalFee;
            session.duration = currentFeeResult.durationMinutes;

            // 2. 할인 금액 재계산 (퍼센트 할인이 있을 경우 요금 변동에 따라 할인액도 변해야 함)
            if (session.appliedDiscounts && session.appliedDiscounts.length > 0) {
                let newTotalDiscountFee = 0;

                // 할인 목록 순회하며 금액 갱신
                session.appliedDiscounts = session.appliedDiscounts.map(discount => {
                    let newAmount = discount.amount; // 기본은 기존 금액 유지

                    // 정책 할인 중 'PERCENT' 타입은 요금 변동에 따라 다시 계산
                    if (discount.type === 'POLICY' && discount.discountType === 'PERCENT') {
                        // 예: 5000원 * 50% = 2500원
                        newAmount = Math.floor(session.totalFee * (discount.value / 100));
                    }
                    
                    // (참고: FIXED_AMOUNT나 MANUAL 금액은 시간이 지나도 변하지 않으므로 그대로 둠)

                    newTotalDiscountFee += newAmount;

                    // 갱신된 객체 반환
                    return {
                        ...discount,
                        amount: newAmount,
                        // appliedAt 등은 그대로 유지
                    };
                });

                // 총 할인 금액 갱신
                session.discountFee = newTotalDiscountFee;
            }

        } catch (error) {
            // 계산 중 에러 발생 시(요금 정책 오류 등), DB에 있는 기존 값을 보여주도록 에러를 삼킴
            // 다만 서버 로그에는 남겨서 확인 필요
            console.error(`[Realtime Calc Error] Session ID ${session.id}:`, error.message);
        }

        return session;
    }

    /**
     * [Helper] 차선 ID를 이용해 차단기 개방
     * - Lane 정보에 포함된 Devices 중 'INTEGRATED_GATE'를 찾아 제어
     */
    async _triggerOpenGateByLane(laneId) {
        try {
            logger.info(`[Manual] 차단기 개방 시도 - LaneID: ${laneId}`);

            // 1. 차선 정보 조회 (여기에 Devices 정보가 포함됨)
            const lane = await this.laneRepository.findById(laneId);
            
            if (!lane) {
                logger.warn(`[Manual] 차단기 개방 실패: 차선 정보 없음 (${laneId})`);
                return;
            }

            // 2. 차선에 연결된 장비들 중 'INTEGRATED_GATE'(차단기) 찾기
            // (장비 타입명이 DB에 어떻게 저장되는지 확인 필요: 'GATE', 'BREAKER', 'INTEGRATED_GATE' 등)
            const gateDevice = lane.pfDevices.find(device => 
                ['INTEGRATED_GATE'].includes(device.type)
            );

            if (!gateDevice) {
                logger.warn(`[Manual] 차단기 개방 실패: 해당 차선(${lane.name})에 매핑된 차단기 장비가 없습니다.`);
                return;
            }

            // 3. 제어에 필요한 정보 추출 (Repository에서 추가한 필드 사용)
            const controllerId = gateDevice.deviceControllerId;
            const locationName = gateDevice.location; // 장비가 아는 위치 이름

            if (!controllerId || !locationName) {
                logger.warn(`[Manual] 차단기 개방 실패: 장비 설정 불충분 (ID: ${gateDevice.id})`);
                return;
            }

            logger.info(`[Manual] 타겟 차단기 발견: ${locationName} (Controller: ${controllerId})`);

            // 4. 어댑터 호출
            const adapter = await AdapterFactory.getAdapter(controllerId);
            await adapter.openGate(locationName);
            
            logger.info(`[Manual] 차단기 개방 명령 전송 완료 -> ${locationName}`);

        } catch (error) {
            logger.error(`[Manual] 차단기 개방 오류: ${error.message}`);
        }
    }

    // =================================================================
    // [NEW] 차단기 닫힘(Down) 신호 처리 -> 상태 확정
    // =================================================================
    async confirmGatePassage(laneId, eventTime) {
        // 1. 해당 차선에서 상태 변경 대기 중인 세션 찾기
        const session = await this.repository.findLatestTransitioningSession(laneId);
        
        if (!session) {
            logger.warn(`[Gate] 차단기 닫힘 신호 수신(Lane: ${laneId})하였으나, 대기 중인 세션이 없습니다.`);
            return;
        }

        let nextStatus = null;
        let noteAppend = '';

        // 2. 현재 상태에 따라 다음 상태 결정
        if (session.status === 'PENDING_ENTRY') {
            // 입차 완료 처리
            nextStatus = 'PENDING'; // 정상 주차 중 상태
            noteAppend = ' (입차 완료 확인됨)';
            logger.info(`[Gate] 입차 완료 확정: ${session.carNumber}`);
        } 
        else if (session.status === 'PENDING_EXIT') {
            // 출차 완료 처리
            nextStatus = 'COMPLETED'; // 정상 종료 상태
            noteAppend = ' (출차 완료 확인됨)';
            logger.info(`[Gate] 출차 완료 확정: ${session.carNumber}`);
        }

        // 3. 상태 업데이트
        if (nextStatus) {
            await this.repository.update(session.id, {
                status: nextStatus,
                note: (session.note || '') + noteAppend,
                updatedAt: eventTime || new Date()
            });
        }
    }

    // =================================================================
    // [공통 Helper] 세션 객체에 실제 장비 위치(location) 정보 주입
    // =================================================================
    async _attachGateLocation(session, direction = 'IN') {
        if (!session) return session;

        let laneId = null;
        
        // 방향에 따라 조회할 차선 결정
        if (direction === 'IN') {
            laneId = session.entryLaneId;
        } else if (direction === 'OUT') {
            laneId = session.exitLaneId;
        }

        // 1. Repository를 통해 장비 위치 조회
        const realLocation = await this.repository.findGateLocationByLaneId(laneId);

        // 2. 세션 객체에 임시 필드로 주입 (Controller에서 사용)
        // 조회된 장비 위치가 없으면 기존의 LaneName을 fallback으로 사용
        session.gateLocation = realLocation || (direction === 'IN' ? session.entryLaneName : session.exitLaneName);

        return session;
    }
}

module.exports = new ParkingSessionService();