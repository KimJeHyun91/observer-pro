const memberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const policyRepository = require('../repositories/policy.repository');
const memberRepository = require('../repositories/member.repository');
const { decrypt } = require('../utils/crypto.util');

// =====================================================================
// [Helper] 기간 계산 로직 (연장 vs 신규)
// =====================================================================
const _calculateServicePeriod = (lastHistory, reqStartDate, durationDays) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = null;

    if (!reqStartDate) {
        // [Case A] 자동 연장 (시작일 미지정)
        if (lastHistory) {
            const lastEndDate = new Date(lastHistory.endDate);
            lastEndDate.setHours(0, 0, 0, 0);

            if (lastEndDate >= today) {
                // 아직 기간이 남았거나 오늘 끝남 -> 끊김 없이 다음날부터 시작
                start = new Date(lastEndDate);
                start.setDate(start.getDate() + 1);
            } else {
                // 이미 만료됨 -> 오늘부터 시작
                start = new Date(today);
            }
        } else {
            // 기록 없음 -> 오늘부터 시작
            start = new Date(today);
        }
    } else {
        // [Case B] 수동 지정
        start = new Date(reqStartDate);
        start.setHours(0, 0, 0, 0);

        if (start < today) {
            const error = new Error('결제 시작일은 오늘 이후여야 합니다.');
            error.status = 400;
            throw error;
        }
    }

    // 종료일 계산
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(durationDays));

    return { start, end };
};

// =====================================================================
// [Helper] 결제 이력 포맷터 (전화번호 복호화)
// =====================================================================
const formatHistory = (history) => {
    if (!history) return null;

    // memberPhone이 있을 때만 복호화 시도, 없으면 null 반환
    // (try-catch로 감싸면 더 안전하지만, decrypt 함수 내부 구현에 따라 다름)
    let decryptedPhone = null;
    if (history.memberPhone) {
        try {
            decryptedPhone = decrypt(history.memberPhone);
        } catch (e) {
            console.error('Phone decryption failed:', e);
            decryptedPhone = 'Error'; // 혹은 history.memberPhone 그대로 노출 방지
        }
    }

    return {
        ...history,
        memberPhone: decryptedPhone, // 복호화된 번호 덮어쓰기
    };
};

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (params) => {
    // 1. 페이징 처리
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const offset = (page - 1) * limit;

    const filters = {};

    if (params.memberId)            filters.memberId = params.memberId;                     // 회원 ID 검색
    if (params.membershipPolicyId)  filters.policyId = params.membershipPolicyId;           // 회원 정책 ID 검색
    if (params.amount)              filters.amount = params.amount;                         // 금액 검색
    if (params.paymentMethod)       filters.paymentMethod = params.paymentMethod;           // 결제 방식 검색
    if (params.paymentStatus)       filters.paymentStatus = params.paymentStatus;           // 결제 상태 검색
    if (params.paidAtStart)         filters.paidAtStart = params.paidAtStart;               // 결제일 시작 검색
    if (params.paidAtEnd)           filters.paidAtEnd = params.paidAtEnd;                   // 결제일 종료 검색   
    if (params.code)                filters.code = params.code;                             // 코드 검색   

    // 3. 정렬 옵션 (Allowlist 적용)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'paidAt', 'amount'];
    let sortBy = params.sortBy || 'createdAt';
    
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    const { rows, count } = await memberPaymentHistoryRepository.findAll(filters, sortOptions, limit, offset);

    const formattedRows = rows.map(history => formatHistory(history));

    return {
        memberPaymentHistories: formattedRows,
        meta: {
            totalItems: parseInt(count),
            totalPages: Math.ceil(parseInt(count) / limit),
            currentPage: page,
            itemsPerPage: limit
        }
    };
};

/**
 * 상세 조회
 */
exports.findDetail = async (id) => {
    const history = await memberPaymentHistoryRepository.findById(id);
    if (!history) {
        const error = new Error('결제 내역을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }
    return formatHistory(history);
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // 1. 회원 검증
    const member = await memberRepository.findById(data.memberId);
    if (!member) {
        const error = new Error('존재하지 않는 회원입니다.');
        error.status = 404;
        throw error;
    }

    // 2. 정책 검증 (PolicyRepo가 있다고 가정)
    const policy = await policyRepository.findById(data.membershipPolicyId);

    if (!policy || policy.type !== 'MEMBERSHIP') {
        const error = new Error('유효하지 않은 멤버십 정책입니다.');
        error.status = 400;
        throw error;
    }

    const durationDays = policy.config?.membershipValidityDays || 30;
    const policyFee = policy.config?.membershipFee || 0;

    // 3. 금액 검증
    if (data.amount !== undefined && parseInt(data.amount, 10) !== parseInt(policyFee, 10)) {
        const error = new Error('결제 금액이 올바르지 않습니다.');
        error.status = 400;
        throw error;
    }

    // 4. 날짜 계산 (Helper 사용)
    const lastHistory = await memberPaymentHistoryRepository.findLatestByMemberId(member.id);
    const { start, end } = _calculateServicePeriod(lastHistory, data.startDate, durationDays);

    // 5. 중복 체크 (로직 변경)
    // 단순히 true/false가 아니라, 겹치는 기록 객체를 가져옵니다.
    const conflictingHistory = await memberPaymentHistoryRepository.findOverlappingHistory(member.id, start, end);
    
    if (conflictingHistory) {
        // 겹치는 기록의 종료일 가져오기
        const conflictEndDate = new Date(conflictingHistory.endDate);
        
        // 다음 가능한 시작일 계산 (종료일 + 1일)
        const nextAvailableDate = new Date(conflictEndDate);
        nextAvailableDate.setDate(conflictEndDate.getDate() + 1);

        // 날짜 포맷팅 (YYYY-MM-DD)
        const formattedDate = nextAvailableDate.toISOString().split('T')[0];

        const error = new Error(`해당 날짜에는 이미 결제 기록이 있습니다. 기존 이용권이 만료된 다음 날인 ${formattedDate}부터 등록 가능합니다.`);
        error.status = 409; 
        throw error;
    }

    // 6. 저장 데이터 구성 (스냅샷 포함)
    const paymentData = {
        memberId: data.memberId,
        policyId: data.membershipPolicyId,
        amount: parseInt(policyFee, 10),
        paymentMethod: data.paymentMethod,
        paymentStatus: 'SUCCESS', // 자동 설정
        note: data.note,
        startDate: start,
        endDate: end,
        paidAt: new Date(),

        // [Snapshot] 회원 정보
        memberName: member.name,
        memberCode: member.code,
        memberPhone: member.phoneEncrypted,
        carNumber: member.carNumber,
        
        // [Snapshot] 정책 정보
        policyName: policy.name,
        policyCode: policy.code
    };

    const newMemberPaymentHistory = await memberPaymentHistoryRepository.create(paymentData);

    return formatHistory(newMemberPaymentHistory);
};

/**
 * 수정 (Update)
 * - 결제 취소
 * - 메모 수정
 */
exports.update = async (id, data) => {
    // 1. 기존 이력 조회
    const history = await memberPaymentHistoryRepository.findById(id);
    if (!history) {
        const error = new Error('결제 내역을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }

    // 2. 이미 취소되었는지 확인
    if (history.status === 'CANCELED') {
        const error = new Error('이미 취소된 결제 내역입니다.');
        error.status = 400;
        throw error;
    }

    // 3. 상태 업데이트 (취소 처리)
    const updatedMemberPaymentHistory = await memberPaymentHistoryRepository.update(id, data);

    return formatHistory(updatedMemberPaymentHistory);
};