const alertRepository = require('../repositories/alert.repository');
const siteRepository = require('../repositories/site.repository');

/**
 * 목록 조회 (Find All)
 * - 페이징, 정렬, 검색 필터 처리
 */
exports.findAll = async (params) => {
    // 1. 페이징 처리
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const offset = (page - 1) * limit;

    // 2. 검색 필터 
    const filters = {};

    if (params.siteId) filters.siteId = params.siteId;                                  // 사이트 ID 검색
    if (params.type)   filters.type = params.type;                                      // 종류 검색
    if (params.severity)   filters.severity = params.severity;                          // 심각도 검색
    if (params.status)   filters.status = params.status;                                // 상태 검색
    if (params.parkingSessionId)   filters.parkingSessionId = params.parkingSessionId;  // 상태 검색
    if (params.carNumber)   filters.carNumber = params.carNumber;                       // 상태 검색
    if (params.startTime)   filters.startTime = params.startTime;                       // 시작 시간 검색
    if (params.endTime)   filters.endTime = params.endTime;                             // 종료 시간 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await alertRepository.findAll(filters, sortOptions, limit, offset);

    return {
        alerts: rows,
        meta: {
            totalItems: parseInt(count),
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            itemsPerPage: limit
        }
    };
};

/**
 * 상세 조회 (Find Detail)
 */
exports.findDetail = async (id) => {
    const alert = await alertRepository.findById(id);
    
    if (!alert) {
        const err = new Error('해당 알림을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return alert;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // 1. 사이트 정보 조회 (스냅샷 저장을 위해)
    const site = await siteRepository.findById(data.siteId);
    if (!site) {
        throw new Error(`존재하지 않는 사이트 ID입니다. (${data.siteId})`);
    }

    // 2. 스냅샷 데이터 병합
    const createPayload = {
        ...data,
        siteName: site.name,
        siteCode: site.code,
    };

    return await alertRepository.create(createPayload);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data, operator) => {
    const alert = await alertRepository.findById(id);
    if (!alert) {
        const error = new Error('해당 알림을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }

    const updatePayload = {
        ...data,
        operatorId: operator.user_id,
        operatorName: operator.user_name
    };

    // 상태 변경에 따른 로직 처리
    if (data.status) {
        // 1. 종결 처리 (해결됨 or 오작동) -> 해결 시간 기록
        if (['RESOLVED', 'FALSE_ALARM'].includes(data.status)) {
            updatePayload.resolvedAt = new Date();
        } 
        // 2. 재오픈 (다시 확인 중) -> 해결 시간 초기화
        else if (['CHECKED'].includes(data.status)) {
            updatePayload.resolvedAt = null; 
        }
    }

    return await alertRepository.update(id, updatePayload);
};