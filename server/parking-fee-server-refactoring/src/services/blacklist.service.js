const blacklistRepository = require('../repositories/blacklist.repository');

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

    if (params.siteId) filters.siteId = params.siteId;              // 사이트 ID 검색
    if (params.carNumber)   filters.carNumber = params.carNumber;   // 차량번호 검색
    if (params.reason)   filters.reason = params.reason;            // 사유 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'siteId', 'carNumber'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await blacklistRepository.findAll(filters, sortOptions, limit, offset);

    return {
        blacklists: rows,
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
    const blacklist = await blacklistRepository.findById(id);
    
    if (!blacklist) {
        const err = new Error('해당 블랙리스트을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return blacklist;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // 1. 구역 생성
    return await blacklistRepository.create(data);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedBlacklist = await blacklistRepository.update(id, data);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!updatedBlacklist) {
        const err = new Error('해당 블랙리스트를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return updatedBlacklist;
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 1. 바로 삭제 요청
    const deletedBlacklist = await blacklistRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedBlacklist) {
        const err = new Error('해당 블랙리스트를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedBlacklist;
};