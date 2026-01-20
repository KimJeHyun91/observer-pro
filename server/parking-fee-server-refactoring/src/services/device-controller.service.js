const logger = require('../../../logger');
const deviceControllerRepository = require('../repositories/device-controller.repository');
const plsService = require('../adapters/pls/pls.service');
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

    if (params.siteId) filters.siteId = params.siteId;              // 사이트 ID 검색
    if (params.type)   filters.type = params.type;                  // 종류 검색
    if (params.name)   filters.name = params.name;                  // 이름 검색
    if (params.code)   filters.code = params.code;                  // 코드 검색
    if (params.ipAddress)   filters.ipAddress = params.ipAddress;   // IP 주소 검색
    if (params.port)   filters.port = params.port;                  // 포트 검색
    if (params.status)   filters.status = params.status;            // 상태 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'type', 'name', 'code', 'ipAddress', 'port', 'status'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await deviceControllerRepository.findAll(filters, sortOptions, limit, offset);

    return {
        deviceControllers: rows,
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
    const deviceController = await deviceControllerRepository.findById(id);
    
    if (!deviceController) {
        const err = new Error('해당 장비 제어기을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return deviceController;
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // 1. 부모 사이트(Site) 존재 여부 확인
    if(data.siteId) {
        const site = await siteRepository.findById(data.siteId);
        if (!site) {
            const err = new Error('존재하지 않는 사이트 ID입니다.');
            err.status = 404;
            throw err;
        }
    }    

    // 생성
    let deviceController = await deviceControllerRepository.create(data);

    try {
        // 외부 동기화 시도
        await this._delegateSync(deviceController);
    } catch (error) {
        await deviceControllerRepository.delete(deviceController.id);
        throw error;
    }
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedDeviceController = await deviceControllerRepository.update(id, data);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!updatedDeviceController) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return updatedDeviceController;
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    // 1. 바로 삭제 요청
    const deletedDeviceController = await deviceControllerRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedDeviceController) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedDeviceController;
};

/**
 * 다중 삭제 (Multiple Delete)
 */
exports.multipleDelete = async (ids) => {
    // 1. 바로 삭제 요청
    const deletedDeviceControllers = await deviceControllerRepository.multipleDelete(ids);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedDeviceControllers) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedDeviceControllers;
};

/**
 * 수동 동기화 (Manual Sync)
 */
exports.sync = async (id) => {
    const deviceController = await deviceControllerRepository.findById(id);
    
    if (!deviceController) {
            const err = new Error('장비를 찾을 수 없습니다.');
            err.status = 404;
            throw err;
    }
    await this._delegateSync(deviceController);
};

/**
 * 내부 함수: 제조사별 서비스로 분기 처리
 */
exports._delegateSync = async (deviceController) => {
    const code = deviceController.code ? deviceController.code.toUpperCase() : '';

    switch (code) {
        case 'PLS':
            // PLS 서비스에게 제어기 ID만 넘기고 알아서 처리하도록 요청
            logger.info(`[Sync] PLS 장비 동기화 위임 -> ID: ${deviceController.id}`);
            return await plsService.syncDevices(deviceController);
        
        // case 'HIKVISION':
        //    return await hikvisionService.syncFromController(deviceController);

        default:
            logger.warn(`[Sync] 지원하지 않는 프로토콜이거나 동기화 대상이 아닙니다: ${code}`);
            return;
    }
};