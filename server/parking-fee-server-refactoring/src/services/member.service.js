const memberRepository = require('../repositories/member.repository');
const memberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');
const { encrypt, decrypt, createSHA256Hash } = require('../utils/crypto.util');

// =====================================================================
// [Private Helper] 회원 정보 포맷터 (핵심)
// =====================================================================
const formatMember = (row, isDetailView = false) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 남은 일수 실시간 계산
    // (DB에는 종료일만 저장되어 있으므로, 오늘 날짜와 비교하여 계산)
    let remainingDays = 0;
    
    // [수정된 로직] 상태에 따른 남은 일수 계산 방식 분기
    if (row.membershipEndDate && row.membershipStartDate) {
        const start = new Date(row.membershipStartDate);
        const end = new Date(row.membershipEndDate);
        
        // 시간 절삭 (날짜 차이만 계산하기 위함)
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        if (row.membershipStatus === 'ACTIVE') {
            // 사용 중: [종료일 - 오늘]
            // (오늘 포함하여 1일 남음으로 표시하고 싶다면 +1, D-Day 방식이면 그대로)
            // 여기서는 '남은 기간'이므로 올림 처리만 수행
            if (end >= today) {
                remainingDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            }
        } else if (row.membershipStatus === 'UPCOMING') {
            // 예정됨: [종료일 - 시작일] (전체 이용권 기간)
            // 예: 1일 시작 ~ 31일 종료 = 30일 차이 -> 실제 이용일수는 31일이므로 +1 보정 필요할 수 있음
            // 보통 정기권은 30일(박) 기준이므로 단순 차이를 씁니다.
             remainingDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
             
             // 만약 '30일권'인데 29일로 나온다면 +1 해주세요 (inclusive)
             // remainingDays += 1; 
        } else {
            // 만료됨: 0
            remainingDays = 0;
        }
    }

    // 2. 전화번호 보안 처리
    const phone = decrypt(row.phoneEncrypted);  

    return {
        id: row.id,
        siteId: row.siteId,
        carNumber: row.carNumber,
        name: row.name,
        description: row.description,
        code: row.code,
        groupName: row.groupName,
        note: row.note,
        
        phone: phone, // 마스킹되거나 복호화된 번호
        
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,

        // [핵심] 멤버십 캐시 정보 (pf_members 테이블 컬럼 활용)
        currentMembership: {
            status: row.membershipStatus || 'NONE',
            startDate: row.membershipStartDate || null,
            endDate: row.membershipEndDate || null,
            remainingDays: remainingDays,         // Server-side Calculated
            paidFee: row.membershipPaidFee || 0,       // Cached from Payment
            paidMethod: row.membershipPaidMethod || null // Cached from Payment
        }
    };
};

// 전화번호 정규화 (숫자만 남기기)
const _normalizePhone = (phone) => {
    if (!phone) return null;
    return phone.replace(/[^0-9]/g, '');
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
    if (params.phone) {
        const cleanPhone = _normalizePhone(params.phone);
        filters.phoneHash = createSHA256Hash(cleanPhone); 
    }
    if (params.phoneLastDigits) filters.phoneLastDigits = params.phoneLastDigits;   // 전화번호 뒷자리 검색
    if (params.groupName)       filters.groupName = params.groupName;               // 그룹이름 검색
    if (params.status)          filters.status = params.status;                     // 상태 검색

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

    // 2. 포맷팅 (전화번호 마스킹 및 남은 일수 계산)
    const members = rows.map(row => formatMember(row, false));

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

    // 2. 포맷팅 (isDetailView = true -> 전화번호 복호화)
    const memberData = formatMember(member, true);

    // 3. (옵션) 상세 페이지에서는 과거 결제 이력 리스트도 같이 주는 경우가 많음
    // 필요 없다면 이 부분 제거
    const histories = await memberPaymentHistoryRepository.findAll(
        { memberId: id }, 
        { sortBy: 'createdAt', sortOrder: 'DESC' }, 
        20, 0 // 최근 20개만
    );

    memberData.recentPaymentHistories = histories.rows;

    return memberData;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {

    // 1. 전화번호 암호화 처리
    let phoneData = { phoneEncrypted: null, phoneHash: null, phoneLastDigits: null };
    if (data.phone) {
        const cleanPhone = _normalizePhone(data.phone);
        phoneData = {
            phoneEncrypted: encrypt(cleanPhone),
            phoneHash: createSHA256Hash(cleanPhone),
            phoneLastDigits: cleanPhone.slice(-4)
        };
    }

    // 3. 저장
    const newMember = await memberRepository.create({ ...data, ...phoneData });

    // 4. 반환 (신규 회원이므로 멤버십 정보는 비어있음)
    return formatMember(newMember, false);
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

    // 2. 차량 번호 중복 체크 (변경 시에만)
    if (data.carNumber && data.carNumber !== member.carNumber) {
        const duplicate = await memberRepository.findAll(
            { siteId: member.siteId, carNumber: data.carNumber }, 
            {}, 1, 0
        );
        if (duplicate.count > 0) {
            const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
            error.status = 409;
            throw error;
        }
    }

    // 2. 전화번호 갱신 시 암호화 다시 수행
    let updateData = { ...data };
    if (data.phone) {
        const cleanPhone = _normalizePhone(data.phone);
        updateData.phoneEncrypted = encrypt(cleanPhone);
        updateData.phoneHash = createSHA256Hash(cleanPhone);
        updateData.phoneLastDigits = cleanPhone.slice(-4);
        delete updateData.phone; // 원본 필드 제거
    }

    // 3. 업데이트 실행
    const updatedMember = await memberRepository.update(id, updateData);

    return formatMember(updatedMember, false);
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
 * [LPR 전용] 차량 번호로 회원 조회
 * - 가장 빠르고 가볍게 응답해야 함 (LPR 장비 연동)
 */
exports.findByCarNumber = async (siteId, carNumber) => {
    // 1. Repository 호출 (캐시된 컬럼 조회)
    const { rows } = await memberRepository.findAll(
        { siteId, carNumber }, 
        {}, 1, 0
    );

    if (rows.length === 0) return null;

    // 2. 포맷팅 (LPR에는 전화번호 등이 필요 없을 수 있으나 구조 통일)
    // 필요한 경우 여기서 { status: 'ACTIVE' } 만 리턴하도록 최적화 가능
    return formatMember(rows[0], false);
};