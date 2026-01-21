const holidayRepository = require('../repositories/holiday.repository');

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
    if (params.siteId) filters.siteId = params.siteId;                      // 사이트 ID 검색
    if (params.name)   filters.name = params.name;                          // 이름 검색
    if (params.code)   filters.code = params.code;                          // 코드 검색
    if (params.date)   filters.date = params.date;                          // 날짜 검색
    if (params.isRecurring)   filters.isRecurring = params.isRecurring;     // 반복 여부 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'siteId', 'name', 'code'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await holidayRepository.findAll(filters, sortOptions, limit, offset);

    return {
        holidays: rows,
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
    const holiday = await holidayRepository.findById(id);
    
    if (!holiday) {
        const err = new Error('해당 휴일을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return holiday;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    return await holidayRepository.create(data);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedHoliday = await holidayRepository.update(id, data);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!updatedHoliday) {
        const err = new Error('해당 휴일을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return updatedHoliday;
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 1. 바로 삭제 요청
    const deletedHoliday = await holidayRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedHoliday) {
        const err = new Error('해당 휴일을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedHoliday;
};