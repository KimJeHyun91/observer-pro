const MemberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const PolicyRepository = require('../repositories/policy.repository');
const MemberRepository = require('../repositories/member.repository');

class MemberPaymentHistoryService {
    constructor() {
        this.memberPaymentHistoryRepository = new MemberPaymentHistoryRepository();
        this.policyRepository = new PolicyRepository();
        this.memberRepository = new MemberRepository();
    }

    /**
     * 결제 내역 생성 (Create)
     * - 클라이언트 입력과 무관하게 paymentStatus = 'SUCCESS' 자동 입력
     * - 회원/정책 스냅샷 저장
     * - 기간 자동 연장 및 중복 체크 수행
     */
    async create(data) {
        // 1. 회원 검증
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            const error = new Error('존재하지 않는 회원입니다.');
            error.status = 404;
            throw error;
        }

        // 2. 정책 검증
        const policy = await this.policyRepository.findById(data.membershipPolicyId);
        if (!policy || policy.type !== 'MEMBERSHIP') {
            const error = new Error('유효하지 않은 멤버십 정책입니다.');
            error.status = 400;
            throw error;
        }

        const durationDays = policy.config?.membershipValidityDays;
        const policyFee = policy.config?.membershipFee;

        // 3. 금액 검증 (클라이언트 요청 금액 vs 정책 금액)
        if (data.amount !== undefined && parseInt(data.amount, 10) !== parseInt(policyFee, 10)) {
            const error = new Error('결제 금액이 올바르지 않습니다.');
            error.status = 400;
            throw error;
        }

        // 4. 날짜 계산 (취소된 건 무시, 성공한 기록 기준)
        // 회원의 가장 최근 유효한(SUCCESS) 종료일을 가져옴
        const lastHistory = await this.memberPaymentHistoryRepository.findLatestByMemberId(member.id);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let start = null;

        if (!data.startDate) {
            // [Case A] 시작일 미지정 -> 자동 설정 (연장 로직)
            if (lastHistory) {
                const lastEndDate = new Date(lastHistory.endDate);
                lastEndDate.setHours(0, 0, 0, 0);

                if (lastEndDate >= today) {
                    // 아직 기간이 남았거나 오늘 끝난다면 -> 그 다음날부터 시작 (끊김 없는 연장)
                    start = new Date(lastEndDate);
                    start.setDate(start.getDate() + 1);
                } else {
                    // 이미 기간이 지났다면 -> 오늘부터 새로 시작
                    start = new Date(today);
                }
            } else {
                // 기록이 아예 없으면 -> 오늘부터 시작
                start = new Date(today);
            }
        } else {
            // [Case B] 시작일 지정 -> 수동 예약 (과거 날짜 차단)
            start = new Date(data.startDate);
            start.setHours(0, 0, 0, 0);

            if (start < today) {
                const error = new Error('결제 시작일은 오늘 이후여야 합니다.');
                error.status = 400;
                throw error;
            }
        }

        // 종료일 계산 (시작일 + 정책기간)
        const end = new Date(start);
        end.setDate(start.getDate() + parseInt(durationDays));

        // 5. 중복 체크 (유효한 기록끼리만)
        const isOverlapping = await this.memberPaymentHistoryRepository.existsOverlapping(member.id, start, end);
        if (isOverlapping) {
            const error = new Error('해당 기간에는 이미 유효한 이용권이 있습니다.');
            error.status = 409;
            throw error;
        }

        // 6. 데이터 구성 및 저장 (SUCCESS 자동 입력)
        const paymentData = {
            memberId: data.memberId,
            policyId: data.membershipPolicyId,
            amount: parseInt(policyFee, 10),
            paymentMethod: data.paymentMethod,
            paymentStatus: 'SUCCESS', // [자동 설정]
            note: data.note,
            startDate: start,
            endDate: end,
            paidAt: new Date(),

            // [Snapshot] 변경 가능한 회원 정보 저장
            memberName: member.name,
            memberCode: member.code,
            memberPhone: member.phone,
            carNumber: member.carNumber,
            
            // [Snapshot] 정책 정보 저장
            policyName: policy.name,
            policyCode: policy.code
        };

        return await this.memberPaymentHistoryRepository.create(paymentData);
    }

    /**
     * 목록 조회 (Find All)
     */
    async findAll(params) {
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

        const { rows, count } = await this.memberPaymentHistoryRepository.findAll(filters, sortOptions, limit, offset);

        return {
            paymentHistories: rows,
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
        const history = await this.memberPaymentHistoryRepository.findById(id);
        if (!history) {
            const error = new Error('결제 내역을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return history;
    }

    /**
     * 수정 (Update) -> 사실상 '취소(Cancel)' 기능
     * - 클라이언트 입력값 무시 (상태값 안 받음)
     * - 호출 시 무조건 CANCLED 상태로 변경
     */
    async update(id) {
        // 1. 기존 이력 조회
        const history = await this.memberPaymentHistoryRepository.findById(id);
        if (!history) {
            const error = new Error('결제 내역을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // 2. [방어 로직] 이미 취소된 건인지 확인
        if (history.paymentStatus === 'CANCLED') {
            const error = new Error('이미 취소된 결제 내역입니다.');
            error.status = 400;
            throw error;
        }

        // 3. 업데이트 수행 (CANCLED 자동 입력)
        // Repository에서 status 외의 다른 필드는 변경되지 않도록 처리됨
        return await this.memberPaymentHistoryRepository.update(id, {
            paymentStatus: 'CANCLED' // [자동 설정]
        });
    }

}

module.exports = MemberPaymentHistoryService;