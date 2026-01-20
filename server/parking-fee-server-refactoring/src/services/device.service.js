const logger = require('../../../logger');
const deviceRepository = require('../repositories/device.repository');
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

    if (params.siteId) filters.siteId = params.siteId;                      // 사이트 ID 검색
    if (params.name)   filters.name = params.name;                          // 이름 검색
    if (params.code)   filters.code = params.code;                          // 코드 검색
    if (params.direction)   filters.direction = params.direction;           // 방향 검색
    if (params.type)   filters.type = params.type;                          // 종류 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'siteId', 'name', 'code', 'direction', 'type'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await deviceRepository.findAll(filters, sortOptions, limit, offset, params.isUsedByLane);

    return {
        devices: rows,
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
    const device = await deviceRepository.findById(id);
    
    if (!device) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return device;
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
    return await deviceRepository.create(data);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedDevice = await deviceRepository.update(id, data);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!updatedDevice) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return updatedDevice;
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 1. 바로 삭제 요청
    const deletedDevice = await deviceRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedDevice) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedDevice;
};

/**
 * Upsert (Create or Update)
 */
exports.upsert = async (data) => {
    // 1. 데이터 검증 
    if (!data.name) {
        throw new Error('Device Name is required for Upsert');
    }

    // 2. Repository 호출
    return await deviceRepository.upsert(data);
};

/**
 * 장비 식별 로직
 * - 제어기 식별 과정 없이, 바로 Target IP/Port로 장비를 찾습니다.
 */
exports.findByIpAddressAndPort = async (targetIp, targetPort) => {
    
    // Global 조회 호출
    const device = await deviceRepository.findByIpAddressAndPort(targetIp, targetPort);

    if (!device) {
        // IP/Port로 못 찾았을 때 로그만 남김 (PLS Service에서 Location으로 2차 시도 가능하므로 여기서 에러 throw 안 함)
        logger.debug(`[DeviceService] IP/Port 매칭 실패: ${targetIp}:${targetPort}`);
        return null;
    }

    return device;
};