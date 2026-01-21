const memberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const policyRepository = require('../repositories/policy.repository');
const memberRepository = require('../repositories/member.repository');
const { decrypt } = require('../utils/crypto.util');

// [Helper] 한국 시간(KST) 기준 YYYY-MM-DD 변환 함수
const toKSTDateString = (date) => {
    // 9시간(ms) 더해서 새로운 Date 객체 생성 (UTC -> KST 보정)
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kstDate.toISOString().split('T')[0];
};

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
        // 유효하지 않은 날짜 문자열인 경우 방어
        if (isNaN(start.getTime())) {
            const error = new Error('시작일(startDate) 형식이 올바르지 않습니다.');
            error.status = 400;
            throw error;
        }
        start.setHours(0, 0, 0, 0);
    }

    // 종료일 계산
    const end = new Date(start);
    const validDuration = parseInt(durationDays, 10) || 30; // NaN 방지 및 기본값
    end.setDate(start.getDate() + validDuration);
    return { start, end };
};

// =====================================================================
// [Helper] 결제 이력 포맷터 (전화번호 복호화)
// =====================================================================
const formatHistory = (history) => {
    if (!history) return null;

    let decryptedPhone = null;
    if (history.memberPhone) {
        try {
            decryptedPhone = decrypt(history.memberPhone);
        } catch (e) {
            decryptedPhone = history.memberPhone; 
        }
    }

    return {
        ...history,
        memberPhone: decryptedPhone,
    };
};

// =====================================================================
// [Helper] 멤버십 상태 동기화 (pf_members 테이블 캐시 갱신)
// =====================================================================
const _syncMembershipStatus = async (memberId) => {
    const history = await memberPaymentHistoryRepository.findEffectiveHistory(memberId);
    
    let updateData = {
        membershipStatus: 'NONE',
        membershipStartDate: null,
        membershipEndDate: null,
        membershipPaidFee: null,
        membershipPaidMethod: null
    };

    if (history) {
        const start = new Date(history.startDate);
        const end = new Date(history.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today >= start && today <= end) {
            updateData.membershipStatus = 'ACTIVE';
        } else if (today < start) {
            updateData.membershipStatus = 'UPCOMING';
        } else {
            updateData.membershipStatus = 'EXPIRED';
        }

        updateData.membershipStartDate = start;
        updateData.membershipEndDate = end;
        updateData.membershipPaidFee = history.amount;
        updateData.membershipPaidMethod = history.paymentMethod;
    }

    await memberRepository.updateMembershipCache(memberId, updateData);
};

// =====================================================================
// [Service Methods]
// =====================================================================

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
    if (params.status)              filters.status = params.status;                         // 결제 상태 검색
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

    // 2. 정책 검증
    // [임시 하드코딩] 실제 정책 DB 연동 시에는 policyRepository.findById 사용
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

    // 4. 날짜 계산 (start, end를 여기서 먼저 구해야 함!)
    const lastHistory = await memberPaymentHistoryRepository.findLatestByMemberId(member.id);
    const { start, end } = _calculateServicePeriod(lastHistory, data.startDate, durationDays);

    // 5. [중요] 정확한 기간 충돌 체크 (계산된 start, end 사용)
    const conflictingHistory = await memberPaymentHistoryRepository.findOverlappingHistory(
        member.id,
        start,
        end
    );
    
    if (conflictingHistory) {
        const conflictStart = toKSTDateString(new Date(conflictingHistory.startDate));
        const conflictEnd = toKSTDateString(new Date(conflictingHistory.endDate));
        
        const error = new Error(
            `요청하신 기간은 기존 이용권(${conflictStart} ~ ${conflictEnd})과 겹칩니다. 날짜를 확인해주세요.`
        );
        error.status = 409; 
        throw error;
    }

    // 6. 결제 생성
    const paymentData = {
        memberId: data.memberId,
        policyId: data.membershipPolicyId,
        amount: parseInt(policyFee, 10),
        paymentMethod: data.paymentMethod,
        status: 'SUCCESS',
        note: data.note,
        startDate: start, // 계산된 시작일
        endDate: end,     // 계산된 종료일
        paidAt: new Date(),

        // Snapshot
        memberName: member.name,
        memberCode: member.code,
        memberPhone: member.phoneEncrypted,
        carNumber: member.carNumber,
        policyName: policy.name,
        policyCode: policy.code
    };

    const newMemberPaymentHistory = await memberPaymentHistoryRepository.create(paymentData);

    // 7. 상태 동기화
    await _syncMembershipStatus(data.memberId);

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

    // 3. 상태 업데이트
    // whitelist 적용은 repository 레벨에서 처리됨
    const updatedMemberPaymentHistory = await memberPaymentHistoryRepository.update(id, data);

    // 4. [핵심] 회원 테이블 멤버십 상태 재동기화
    // 취소로 인해 가장 유효한 멤버십이 변경되었을 수 있음 (예: 미래 예약 취소 -> 현재가 유효)
    if (updatedMemberPaymentHistory) {
        await _syncMembershipStatus(updatedMemberPaymentHistory.memberId);
    }

    return formatHistory(updatedMemberPaymentHistory);
};