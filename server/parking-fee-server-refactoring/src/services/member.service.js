const MemberRepository = require('../repositories/member.repository');
const MemberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');

class MemberService {
    constructor() {
        this.memberRepository = new MemberRepository();
        this.memberPaymentHistoryRepository = new MemberPaymentHistoryRepository();
    }

    /**
     * 회원 생성 (Create)
     * - 생성 직후에는 결제 내역이 없으므로 'EXPIRED'(또는 NONE) 상태로 반환
     */
    async create(data) {
        // 1. 중복 가입 방지
        const existingMember = await this.memberRepository.findByCarNumber(data.siteId, data.carNumber);
        if (existingMember) {
            const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
            error.status = 409;
            throw error;
        }

        // 2. 회원 생성
        const newMember = await this.memberRepository.create(data);

        // 3. 멤버십 정보 포함하여 반환 (신규 회원이므로 이력 없음 -> [] 전달)
        return this._enrichMemberWithStatus(newMember, []);
    }

    /**
     * 목록 조회 (Find All)
     * - N+1 방지 로직 유지
     */
    async findAll(params) {
        // 1. 회원 목록 조회
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 100;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows: members, count } = await this.memberRepository.findAll(filters, sortOptions, limit, offset);

        // 2. 조회된 회원들의 ID 추출 및 결제 이력 일괄 조회
        const memberIds = members.map(m => m.id);
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds(memberIds);

        // 3. 각 회원에 멤버십 정보 결합
        const membersWithMembership = members.map(member => {
            const memberHistories = histories.filter(h => h.memberId === member.id);
            return this._enrichMemberWithStatus(member, memberHistories);
        });

        return {
            members: membersWithMembership,
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
     * - 멤버십 정보 포함
     */
    async findDetail(id) {
        // 1. 회원 조회
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('존재하지 않는 회원입니다.');
            error.status = 404;
            throw error;
        }

        // 2. 해당 회원의 결제 이력 조회
        // (findAllByMemberIds는 배열을 받으므로 [id]로 전달)
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds([id]);

        // 3. 정보 결합 후 반환
        return this._enrichMemberWithStatus(member, histories);
    }

    /**
     * 정보 수정 (Update)
     * - 수정 후 최신 멤버십 정보 포함하여 반환
     */
    async update(id, data) {
        // 1. 존재 여부 확인
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('존재하지 않는 회원입니다.');
            error.status = 404;
            throw error;
        }

        // 2. 차량 번호 중복 체크
        if (data.carNumber && data.carNumber !== member.carNumber) {
            const duplicate = await this.memberRepository.findByCarNumber(member.siteId, data.carNumber);
            if (duplicate) {
                const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
                error.status = 409;
                throw error;
            }
        }

        // 3. 업데이트 수행
        const updatedMember = await this.memberRepository.update(id, data);

        // 4. 결제 이력 조회 및 결합
        // (회원 정보만 바뀌었지 결제 내역은 그대로지만, 응답 포맷 통일을 위해 조회)
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds([id]);

        return this._enrichMemberWithStatus(updatedMember, histories);
    }

    /**
     * 삭제 (Delete)
     */
    async delete(id) {
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('삭제할 회원을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return await this.memberRepository.delete(id);
    }

    // =====================================================================
    // [Private Helper] 멤버십 상태 계산 및 객체 병합
    // =====================================================================
    _enrichMemberWithStatus(member, histories) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let targetHistory = null;
        let status = 'EXPIRED';

        // 1) 현재 활성 상태 (ACTIVE / EXPIRING)
        const activeHistory = histories.find(h => {
            const start = new Date(h.startDate);
            const end = new Date(h.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return start <= today && end >= today;
        });

        // 2) 미래 예정 상태 (UPCOMING)
        const upcomingHistory = histories.find(h => {
            const start = new Date(h.startDate);
            start.setHours(0, 0, 0, 0);
            return start > today;
        });

        if (activeHistory) {
            targetHistory = activeHistory;

            const endDate = new Date(activeHistory.endDate);
            endDate.setHours(0, 0, 0, 0);
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) {
                status = 'EXPIRING';
            } else {
                status = 'ACTIVE';
            }
        } else if (upcomingHistory) {
            targetHistory = upcomingHistory;
            status = 'UPCOMING';
        } else {
            // EXPIRED 상태
            status = 'EXPIRED';
            if (histories.length > 0) {
                targetHistory = histories[0]; 
            }
        }

        let currentMembership = null;

        if (targetHistory) {
            // [수정된 부분] 상태에 따른 남은 일수(remainingDays) 계산 로직 분기
            let remainingDays = 0;
            const startDate = new Date(targetHistory.startDate);
            const endDate = new Date(targetHistory.endDate);
            
            // 시간 초기화 (날짜 차이만 계산하기 위함)
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (status === 'UPCOMING') {
                // UPCOMING: 아직 시작 안 했으므로, '총 이용 가능 기간(종료일 - 시작일)'을 표시
                // 예: 1년권이면 365일 표시
                const diffTime = endDate - startDate;
                remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                // ACTIVE, EXPIRING, EXPIRED: '오늘' 기준으로 남은 기간 계산 (종료일 - 오늘)
                const diffTime = endDate - today;
                remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            currentMembership = {
                status: status,
                startDate: targetHistory.startDate,
                endDate: targetHistory.endDate,
                remainingDays: remainingDays, 
                paidFee: targetHistory.amount,
                paidMethod: targetHistory.paymentMethod,
                policyName: targetHistory.policyName
            };
        } else {
            // 결제 이력이 아예 없는 경우
            currentMembership = {
                status: 'EXPIRED',
                startDate: null,
                endDate: null,
                remainingDays: 0,
                paidFee: 0,
                paidMethod: null
            };
        }

        return {
            ...member,
            currentMembership
        };
    }
}

module.exports = MemberService;