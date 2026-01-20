const memberRepository = require('../repositories/member.repository');
const memberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const { encrypt, decrypt, createSHA256Hash } = require('../utils/crypto.util');

// =====================================================================
// [Helper] 날짜 기반 멤버십 상태 계산 (공통 로직)
// =====================================================================
const calculateMembershipStatus = (startDateStr, endDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;

    // 데이터가 없으면 만료 처리
    if (!start || !end) {
        return { status: 'EXPIRED', remainingDays: 0 };
    }

    // 날짜 정규화
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let status = 'EXPIRED';
    let remainingDays = 0;

    if (start > today) {
        status = 'UPCOMING';
        remainingDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } else if (end >= today) {
        status = 'ACTIVE';
        // (옵션) 종료 7일 전이면 'EXPIRING' 등 추가 상태 로직 가능
        const diffTime = end - today;
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 종료 7일 전
        if (remainingDays <= 7) status = 'EXPIRING';
    } else {
        status = 'EXPIRED';
        remainingDays = 0;
    }

    return { status, remainingDays };
};

// =====================================================================
// [Helper 1] findAll용 포맷터 (Repository의 JOIN 결과를 변환)
// =====================================================================
const formatMemberFromJoin = (row) => {
    // 1. 공통 상태 계산 함수 호출
    const { status, remainingDays } = calculateMembershipStatus(row.membershipStartDate, row.membershipEndDate);

    // 2. currentMembership 객체 조립
    const currentMembership = {
        status,
        startDate: row.membershipStartDate || null,
        endDate: row.membershipEndDate || null,
        remainingDays,
        paidFee: row.membershipPaidFee || 0,
        paidMethod: row.membershipPaidMethod || null,
        policyName: row.membershipPolicyName || null
    };

    // 3. 내부 필드 제거 및 복호화
    const { 
        phoneEncrypted, phoneHash, phoneLastDigits, 
        membershipStartDate, membershipEndDate, membershipPaidFee, membershipPaidMethod, membershipPolicyName, // Join된 컬럼들 제거
        ...cleanMember 
    } = row;

    return {
        ...cleanMember,
        phone: phoneEncrypted ? decrypt(phoneEncrypted) : null, // 복호화
        currentMembership
    };
};

// =====================================================================
// [Helper 2] 상세/수정용 포맷터 (History 배열을 기반으로 변환)
// =====================================================================
const enrichMemberWithHistory = (member, histories) => {
    // 최신 성공 이력 찾기
    const validHistory = histories
        .filter(h => h.paymentStatus === 'SUCCESS')
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0]; // 종료일 내림차순 1위

    let currentMembership = null;

    if (validHistory) {
        const { status, remainingDays } = calculateMembershipStatus(validHistory.startDate, validHistory.endDate);
        
        currentMembership = {
            status,
            startDate: validHistory.startDate,
            endDate: validHistory.endDate,
            remainingDays,
            paidFee: validHistory.amount,
            paidMethod: validHistory.paymentMethod,
            policyName: validHistory.policyName
        };
    } else {
        currentMembership = {
            status: 'EXPIRED',
            startDate: null,
            endDate: null,
            remainingDays: 0,
            paidFee: 0,
            paidMethod: null,
            policyName: null
        };
    }

    const { phoneEncrypted, phoneHash, phoneLastDigits, ...cleanMember } = member;

    return {
        ...cleanMember,
        phone: phoneEncrypted ? decrypt(phoneEncrypted) : null,
        currentMembership
    };
};

// =====================================================================
// [Service Methods]
// =====================================================================

/**
 * 목록 조회 (Find All)
 * - Repository에서 JOIN된 데이터를 받아 처리하므로 N+1 문제 없음
 * - SQL 레벨에서 Status 필터링이 수행되었다고 가정
 */
exports.findAll = async (params) => {
    // 1. 페이징 처리
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const offset = (page - 1) * limit;

    // 2. 검색 필터
    const filters = {};

    if (params.siteId)          filters.siteId = params.siteId;                     // 주차장 ID 검색
    if (params.carNumber)       filters.carNumber = params.carNumber;               // 차량 번호 검색
    if (params.name)            filters.name = params.name;                         // 이름 검색
    if (params.code)            filters.code = params.code;                         // 코드 검색
    if (params.phoneLastDigits) filters.phoneLastDigits = params.phoneLastDigits;   // 전화번호 뒷자리 검색
    if (params.groupName)       filters.groupName = params.groupName;               // 그룹이름 검색
    if (params.status)          filters.status = params.status;                     // 상태 검색
    if (params.phone) {
        const cleanPhone = params.phone.replace(/[^0-9]/g, '');
        filters.phoneHash = createSHA256Hash(cleanPhone); 
    }

    // 3. 정렬 옵션 (Allowlist 적용)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'carNumber', 'siteId'];
    let sortBy = params.sortBy || 'createdAt';
    
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };
    
    // 1. Repository 호출 (LEFT JOIN LATERAL 쿼리 사용)
    const { rows, count } = await memberRepository.findAll(filters, sortOptions, limit, offset);

    // 2. 포맷팅 (암호화 해제 및 JSON 구조화)
    const members = rows.map(formatMemberFromJoin);

    return {
        members,
        meta: {
            totalItems: parseInt(count),
            totalPages: Math.ceil(parseInt(count) / limit),
            currentPage: page,
            itemsPerPage: limit
        }
    };
};

/**
 * 상세 조회 (Find Detail)
 */
exports.findDetail = async (id) => {
    // 1. 회원 정보 조회
    const member = await memberRepository.findById(id);
    if (!member) {
        const error = new Error('존재하지 않는 회원입니다.');
        error.status = 404;
        throw error;
    }

    // 2. 전체 이력 조회 (상세 페이지에서는 전체 이력이 필요할 수 있음)
    const histories = await memberPaymentHistoryRepository.findAllByMemberIds([id]);
    
    // 3. 포맷팅
    return enrichMemberWithHistory(member, histories);
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {

    // 1. 전화번호 암호화 처리
    let phoneData = { phoneEncrypted: null, phoneHash: null, phoneLastDigits: null };
    if (data.phone) {
        const cleanPhone = data.phone.replace(/[^0-9]/g, '');
        phoneData = {
            phoneEncrypted: encrypt(cleanPhone),
            phoneHash: createSHA256Hash(cleanPhone),
            phoneLastDigits: cleanPhone.slice(-4)
        };
    }

    // 3. 저장
    const newMember = await memberRepository.create({ ...data, ...phoneData });

    // 4. 반환 (신규 회원이므로 이력 없음)
    return enrichMemberWithHistory(newMember, []);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    const member = await memberRepository.findById(id);
    if (!member) {
        const error = new Error('존재하지 않는 회원입니다.');
        error.status = 404;
        throw error;
    }

    // 1. 차량 번호 중복 체크
    if (data.carNumber && data.carNumber !== member.carNumber) {
        const duplicate = await memberRepository.findByCarNumber(member.siteId, data.carNumber);
        if (duplicate) {
            const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
            error.status = 409;
            throw error;
        }
    }

    // 2. 전화번호 갱신 시 암호화 다시 수행
    let updateData = { ...data };
    if (data.phone) {
        const cleanPhone = data.phone.replace(/[^0-9]/g, '');
        updateData.phoneEncrypted = encrypt(cleanPhone);
        updateData.phoneHash = createSHA256Hash(cleanPhone);
        updateData.phoneLastDigits = cleanPhone.slice(-4);
        delete updateData.phone; // 원본 필드 제거
    }

    // 3. 업데이트 실행
    const updatedMember = await memberRepository.update(id, updateData);

    // 4. 최신 상태 반환을 위해 이력 조회
    const histories = await memberPaymentHistoryRepository.findAllByMemberIds([id]);
    return enrichMemberWithHistory(updatedMember, histories);
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 존재 여부 확인 후 삭제
    const deleteMember = await memberRepository.delete(id);
    if (!deleteMember) {
        const error = new Error('삭제할 회원을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }
    return deleteMember;
};

/**
 * 차량 번호로 회원 조회
 */
exports.findByCarNumber = async (siteId, carNumber) => {
    const member = await memberRepository.findByCarNumber(siteId, carNumber);
    if (!member) return null;

    const histories = await memberPaymentHistoryRepository.findAllByMemberIds([member.id]);
    return enrichMemberWithHistory(member, histories);
};