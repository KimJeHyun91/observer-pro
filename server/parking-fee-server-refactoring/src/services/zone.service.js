const zoneRepository = require('../repositories/zone.repository');
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

    if (params.siteId) filters.siteId = params.siteId; // 사이트 ID 검색
    if (params.name)   filters.name = params.name;     // 이름 검색
    if (params.code)   filters.code = params.code;     // 코드 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'name', 'code', 'siteId'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await zoneRepository.findAll(filters, sortOptions, limit, offset);

    return {
        zones: rows,
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
    const zone = await zoneRepository.findById(id);
    
    if (!zone) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return zone;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // 1. 부모 사이트(Site) 존재 여부 확인
    const site = await siteRepository.findById(data.siteId);
    if (!site) {
        const err = new Error('존재하지 않는 사이트 ID입니다.');
        err.status = 404;
        throw err;
    }

    // 2. 구역 생성
    return await zoneRepository.create(data);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedZone = await zoneRepository.update(id, data);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!updatedZone) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return updatedZone;
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 1. 바로 삭제 요청
    const deletedZone = await zoneRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedZone) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedZone;
};