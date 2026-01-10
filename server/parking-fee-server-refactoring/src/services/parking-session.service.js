const ParkingSessionRepository = require('../repositories/parking-session.repository');
const SiteRepository = require('../repositories/site.repository');

/**
 * Parking Session Service
 * - 입차, 출차, 정산 등 주차 세션의 라이프사이클을 관리합니다.
 */
class ParkingSessionService {
    constructor() {
        this.parkingSessionRepository = new ParkingSessionRepository();
        this.siteRepository = new SiteRepository();
    }

    /**
     * 주차 세션 생성 (입차)
     * - 기존의 enter 로직과 동일 (중복 방지 및 자동 보정 포함)
     */
    async create(data) {
        if (!data.siteId || !data.carNumber) {
            const error = new Error('siteId와 carNumber는 필수입니다.');
            error.status = 400;
            throw error;
        }

        if (!data.siteName) {
            const site = await this.siteRepository.findById(data.siteId);
            if (!site) {
                const error = new Error('존재하지 않는 사이트 ID입니다.');
                error.status = 404;
                throw error;
            }
            data.siteName = site.name;
            // 필요하다면 siteCode도 같이 채울 수 있음
            if (!data.siteCode) data.siteCode = site.code;
        }

        // Ghost Vehicle 자동 보정 (기존 로직 유지)
        const activeSession = await this.parkingSessionRepository.findActiveSessionByCarNumber(data.siteId, data.carNumber);
        if (activeSession) {
            console.warn(`[Auto-Correction] 차량(${data.carNumber})의 미출차 세션(ID: ${activeSession.id})을 강제 종료합니다.`);
            await this.parkingSessionRepository.update(activeSession.id, {
                status: 'CANCELLED', 
                exitTime: new Date(),
                note: '재입차 시도로 인한 시스템 강제 종료'
            });
        }

        return await this.parkingSessionRepository.create(data);
    }

    /**
     * 주차 세션 수정 (통합 기능)
     * - 단순 정보 수정 (오인식 번호판 수정 등)
     * - 출차 처리 (exitTime이 들어오면 주차 시간 계산)
     * - 정산 처리 (fee 정보 수정)
     * 위 모든 기능을 이 메서드 하나로 처리합니다.
     */
    async update(id, data) {
        const session = await this.parkingSessionRepository.findById(id);
        if (!session) {
            const error = new Error('주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // --- 1. 상태 전이 방어 ---
        const finalStatuses = ['COMPLETED', 'CANCELLED', 'FORCE_COMPLETED'];
        
        // 이미 종료된 세션인데 상태를 바꾸려고 하는 경우 차단
        if (finalStatuses.includes(session.status) && data.status && data.status !== session.status) {
            const error = new Error(`이미 ${session.status} 상태로 종료된 세션은 상태를 변경할 수 없습니다.`);
            error.status = 400;
            throw error;
        }

        // --- 2. 차량 번호 수정 시 중복 체크 ---
        if (data.carNumber && data.carNumber !== session.carNumber) {
            const activeOther = await this.parkingSessionRepository.findActiveSessionByCarNumber(session.siteId, data.carNumber);
            if (activeOther) {
                const error = new Error(`해당 차량번호(${data.carNumber})는 이미 주차장 내에 활성 세션이 존재합니다.`);
                error.status = 409;
                throw error;
            }
        }

        // --- 3. 금액 및 정산 정합성 체크 ---
        const total = data.totalFee !== undefined ? data.totalFee : session.totalFee;
        const discount = data.discountFee !== undefined ? data.discountFee : session.discountFee;
        const paid = data.paidFee !== undefined ? data.paidFee : session.paidFee;

        // 결제 금액이 요금을 초과하거나, 할인이 요금을 초과하는 비상식적 상황 차단
        if (total < discount) {
            const error = new Error('할인 금액이 전체 요금을 초과할 수 없습니다.');
            error.status = 400;
            throw error;
        }

        // 출차 완료(COMPLETED) 요청 시 미납금이 있는지 확인
        if (data.status === 'COMPLETED' || (!data.status && session.status !== 'COMPLETED' && data.exitTime)) {
            if (total > (discount + paid)) {
                const error = new Error(`미납금이 존재합니다. (잔액: ${total - (discount + paid)}원). 출차 처리가 불가능합니다.`);
                error.status = 400;
                throw error;
            }
        }

        // --- 4. 시간 순서 검증 (이전 로직 포함) ---
        const entryTime = new Date(data.entryTime || session.entryTime);
        const exitTime = data.exitTime ? new Date(data.exitTime) : (session.exitTime ? new Date(session.exitTime) : null);
        const preSettledAt = data.preSettledAt ? new Date(data.preSettledAt) : (session.preSettledAt ? new Date(session.preSettledAt) : null);

        if (exitTime && entryTime >= exitTime) {
            throw new Error('출차 시각은 입차 시각보다 늦어야 합니다.');
        }
        
        // 사전 정산 시각 범위 체크
        if (preSettledAt) {
            if (preSettledAt < entryTime || (exitTime && preSettledAt > exitTime)) {
                throw new Error('사전 정산 시각은 입차와 출차 시각 사이여야 합니다.');
            }
        }

        // --- 5. 데이터 업데이트 ---
        let updateData = { ...data };

        // 출차 시간 포함 시 자동 계산
        if (data.exitTime) {
            const diffMs = new Date(data.exitTime) - entryTime;
            updateData.duration = Math.floor(diffMs / 1000 / 60);
            if (!updateData.status) updateData.status = 'COMPLETED';
        }

        return await this.parkingSessionRepository.update(id, updateData);
    }

    /**
     * 목록 조회 (Find All)
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20; // 주차 이력은 데이터가 많으므로 기본 20개
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        // 기본 정렬: 최신 입차순
        const sortOptions = {
            sortBy: params.sortBy || 'entryTime',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.parkingSessionRepository.findAll(filters, sortOptions, limit, offset);

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

    /**
     * 상세 조회 (Find Detail)
     */
    async findDetail(id) {
        const session = await this.parkingSessionRepository.findById(id);
        if (!session) {
            const error = new Error('주차 세션을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return session;
    }
}

module.exports = ParkingSessionService;