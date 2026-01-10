const ParkingSessionRepository = require('../repositories/parking-session.repository');
const SiteRepository = require('../repositories/site.repository');
const ZoneRepository = require('../repositories/zone.repository');
const LaneRepository = require('../repositories/lane.repository');
const PolicyRepository = require('../repositories/policy.repository'); // 모든 정책 조회용
const FeeService = require('./fee.service'); // 오타 수정 (.serivce -> .service)
const { pool } = require('../../../db/postgresqlPool'); 

class ParkingSessionService {
    constructor() {
        this.parkingSessionRepository = new ParkingSessionRepository();
        this.siteRepository = new SiteRepository();
        this.zoneRepository = new ZoneRepository();
        this.laneRepository = new LaneRepository();
        // DiscountPolicyRepository 제거됨 -> policyRepository로 통합
        this.policyRepository = new PolicyRepository();
        this.feeService = new FeeService();
    }

    /**
     * 주차 세션 생성 (입차)
     * - Transaction 적용
     * - ID 기반 정보 자동 조회 (이름/코드 강제 덮어쓰기)
     * - 출처(Source) 기반 이중 입차 처리 정책 적용
     */
    async create(data) {
        const client = await pool.connect(); // Transaction 시작
        try {
            await client.query('BEGIN');

            if (!data.siteId || !data.carNumber) {
                const error = new Error('siteId와 carNumber는 필수입니다.');
                error.status = 400;
                throw error;
            }

            // --- [1. 출처(Source) 정의] ---
            // entrySource: 'SYSTEM'(기본값, LPR/키오스크), 'ADMIN'(관리자 수동)
            let source = data.entrySource || data.source || 'SYSTEM';
            if (source !== 'ADMIN') source = 'SYSTEM';
            data.entrySource = source;

            // --- [2. 정보 조회 및 데이터 무결성 보장] ---
            
            // 2-1. 사이트 정보 조회 (필수)
            const site = await this.siteRepository.findById(data.siteId);
            if (!site) {
                const error = new Error('존재하지 않는 사이트 ID입니다.');
                error.status = 404;
                throw error;
            }
            data.siteName = site.name; 
            data.siteCode = site.code; 

            // 2-2. 입차 구역(Zone) 정보 조회
            if (data.entryZoneId) {
                const zone = await this.zoneRepository.findById(data.entryZoneId);
                if (zone) {
                    data.entryZoneName = zone.name;
                    data.entryZoneCode = zone.code;
                } else {
                    console.warn(`[Warning] 유효하지 않는 Entry Zone ID: ${data.entryZoneId}`);
                    data.entryZoneName = null;
                    data.entryZoneCode = null;
                }
            } else {
                data.entryZoneName = null;
                data.entryZoneCode = null;
            }

            // 2-3. 입차 차선(Lane) 정보 조회
            if (data.entryLaneId) {
                const lane = await this.laneRepository.findById(data.entryLaneId);
                if (lane) {
                    data.entryLaneName = lane.name;
                    data.entryLaneCode = lane.code;
                } else {
                    console.warn(`[Warning] 유효하지 않는 Entry Lane ID: ${data.entryLaneId}`);
                    data.entryLaneName = null;
                    data.entryLaneCode = null;
                }
            } else {
                data.entryLaneName = null;
                data.entryLaneCode = null;
            }

            // --- [3. 중복 입차 체크 및 Ghost Vehicle 처리] ---
            const activeSession = await this.parkingSessionRepository.findActiveSessionByCarNumber(data.siteId, data.carNumber, client);
            
            if (activeSession) {
                // [정책 A] 관리자(ADMIN) 수동 입력 시 -> 실수 방지를 위해 기본 차단
                if (source === 'ADMIN' && !data.forceEntry) {
                    const error = new Error(`이미 주차 중인 차량입니다. (차량번호: ${data.carNumber}, 입차시간: ${activeSession.entryTime})`);
                    error.status = 409; // Conflict
                    error.code = 'DUPLICATE_ENTRY'; 
                    throw error;
                }

                // [정책 B] SYSTEM(LPR) 또는 관리자 강제 입차 -> 기존 세션 자동 종료
                const exitSource = (source === 'ADMIN') ? 'ADMIN' : 'SYSTEM';
                
                console.warn(`[Auto-Correction] 차량(${data.carNumber}) 재입차로 인한 기존 세션(${activeSession.id}) 자동 종료 처리. (Source: ${source})`);
                
                await this.parkingSessionRepository.update(activeSession.id, {
                    status: 'FORCE_COMPLETED',
                    exitTime: new Date(),
                    exitSource: exitSource,
                    note: `[재입차 자동보정] 신규 입차(${source})로 인한 기존 세션 종료`
                }, client);
            }

            // 4. 신규 입차 생성
            const newSession = await this.parkingSessionRepository.create(data, client);

            await client.query('COMMIT');
            return newSession;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'entryTime',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.parkingSessionRepository.findAll(filters, sortOptions, limit, offset);

        return {
            sessions: rows,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    async findDetail(id) {
        return await this.parkingSessionRepository.findById(id);
    }

    /**
     * 주차 세션 수정 (정책 기반 업데이트)
     * - [기능 추가] 출차 시간 입력 시 자동으로 요금(TotalFee) 계산 로직 수행
     */
    async update(id, data) {
        const session = await this.parkingSessionRepository.findById(id);
        if (!session) {
            const error = new Error('주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // [STEP 1] 수정 가능한 기본 필드 정의
        let allowedFields = [
            'carNumber', 'vehicleType',             
            'entryTime', 'exitTime',                
            'entryZoneId', 'entryLaneId',           
            'exitZoneId', 'exitLaneId',
            'status',                               
            'note',                                 
            'preSettledAt',
            'discountPolicyId'
        ];

        // [STEP 2] 상황별 필드 제한
        const closedStatuses = ['COMPLETED', 'CANCELLED', 'FORCE_COMPLETED', 'RUNAWAY'];

        if (closedStatuses.includes(session.status)) {
            allowedFields = ['note'];
        }

        if (session.paidFee > 0) {
            allowedFields = allowedFields.filter(field => !['carNumber', 'entryTime'].includes(field));
        }

        // [STEP 3] 입력 데이터 필터링
        const updateData = {};
        const attemptedFields = Object.keys(data);
        let targetPolicyId = null;

        for (const field of attemptedFields) {
            if (data[field] === undefined) continue;

            if (allowedFields.includes(field)) {
                if (field === 'discountPolicyId') {
                    targetPolicyId = data[field];
                } else {
                    updateData[field] = data[field];
                }
            } else {
                throw new Error(`현재 상태에서는 '${field}' 필드를 수정할 수 없습니다.`);
            }
        }

        // [중요] 업데이트할 데이터 병합 (계산을 위해)
        const mergedData = { ...session, ...updateData };

        // [STEP 4] 주차 시간 및 기본 요금 자동 계산 (FeeService 활용)
        if (updateData.exitTime) {
            const entryTime = new Date(mergedData.entryTime);
            const exitTime = new Date(updateData.exitTime);

            if (entryTime >= exitTime) {
                throw new Error(`논리적 오류: 출차 시간(${exitTime.toISOString()})이 입차 시간보다 빠를 수 없습니다.`);
            }

            const diffMs = exitTime - entryTime;
            const duration = Math.floor(diffMs / 1000 / 60);
            
            updateData.duration = duration;
            mergedData.duration = duration;

            // ★ 요금 자동 계산 (완료 상태가 아닐 때만)
            if (!closedStatuses.includes(session.status)) {
                // 1. 해당 사이트의 기본 요금 정책(FEE) 조회
                const { rows: feePolicies } = await this.policyRepository.findAll(
                    { siteId: session.siteId, type: 'FEE' },
                    { sortBy: 'created_at', sortOrder: 'DESC' },
                    1, 0
                );
                
                const feeConfig = feePolicies.length > 0 ? feePolicies[0].config : null;

                // 2. FeeService를 통해 요금 계산
                const calculatedFee = this.feeService.calculateFee(duration, feeConfig);
                updateData.totalFee = calculatedFee;
                mergedData.totalFee = calculatedFee;
            }
            
            // 상태 자동 전환
            if (!updateData.status && !closedStatuses.includes(session.status)) {
                updateData.status = 'COMPLETED';
            }
        }

        // [STEP 5] 정책 기반 할인 계산 (FeeService 활용)
        if (targetPolicyId) {
            // [수정] discountPolicyRepository 제거 -> policyRepository 사용
            const policy = await this.policyRepository.findById(targetPolicyId);
            if (!policy) throw new Error('존재하지 않는 정책 ID입니다.');

            // [검증] 할인 정책인지 확인
            if (policy.type !== 'DISCOUNT') {
                throw new Error('선택하신 정책은 할인 정책이 아닙니다.');
            }

            // 현재 총 요금
            const currentTotal = mergedData.totalFee; 
            const currentDiscount = session.discountFee; 
            const paid = session.paidFee;

            const remaining = currentTotal - currentDiscount - paid;

            if (remaining <= 0) {
                 throw new Error('잔여 요금이 없어 할인을 적용할 수 없습니다.');
            }

            // FeeService를 통해 할인 금액 계산 (policy.config 전달)
            let discountAmount = this.feeService.calculateDiscountAmount(currentTotal, policy.config);

            // 잔여 금액 초과 방지
            if (discountAmount > remaining) discountAmount = remaining;

            updateData.discountFee = currentDiscount + discountAmount;
            
            const newDiscountLog = {
                policyId: policy.id,
                name: policy.name,
                type: policy.type,
                value: policy.config.discountValue, 
                amount: discountAmount,
                appliedAt: new Date(),
                method: 'MANUAL_ADMIN'
            };

            const currentDiscounts = session.appliedDiscounts || [];
            updateData.appliedDiscounts = [...currentDiscounts, newDiscountLog];
            
            // 병합 데이터 갱신
            mergedData.discountFee = updateData.discountFee;
        }

        // [STEP 6] 최종 논리 검증 및 미납 체크
        if (Object.keys(updateData).length === 0 && !targetPolicyId) {
             return session;
        }

        // 요금 정합성 체크
        if (mergedData.totalFee < (mergedData.discountFee + mergedData.paidFee)) {
             throw new Error(`데이터 오류: 할인과 결제액의 합이 총 요금을 초과합니다.`);
        }

        // 출처 기록
        if (['COMPLETED', 'FORCE_COMPLETED', 'CANCELLED', 'RUNAWAY'].includes(updateData.status || mergedData.status)) {
            if (!closedStatuses.includes(session.status)) {
                updateData.exitSource = 'ADMIN';
            }
        }

        // 미납 체크
        const finalStatus = updateData.status || mergedData.status;
        if (finalStatus === 'COMPLETED') {
            const balance = mergedData.totalFee - (mergedData.discountFee + mergedData.paidFee);
            if (balance > 0) {
                 throw new Error(`미납금(${balance}원)이 존재하여 정상 출차(COMPLETED) 처리가 불가능합니다. 강제 출차(FORCE_COMPLETED)를 이용하세요.`);
            }
        }

        // [STEP 7] DB 업데이트
        const result = await this.parkingSessionRepository.update(id, updateData, pool);
        if (!result) {
             throw new Error('업데이트에 실패했습니다.');
        }
        return result;
    }
}

module.exports = ParkingSessionService;