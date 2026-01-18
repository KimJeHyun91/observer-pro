const logger = require('../../../logger');
const deviceControllerRepository = require('../repositories/device-controller.repository');
const AdapterFactory = require('../adapters/adapter.factory');
const laneRepository = require('../repositories/lane.repository');
const deviceService = require('./device.service');
const siteRepository = require('../repositories/site.repository');
const { pool } = require('../../../db/postgresqlPool');

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
    const zone = await deviceControllerRepository.findById(id);
    
    if (!zone) {
        const err = new Error('해당 장비 제어기을 찾을 수 없습니다.');
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

    const client = await pool.connect(); // 1. DB 연결 획득
    try {

        const deviceController = await deviceControllerRepository.create(data);

        await _syncDevices(deviceController.id);

    } catch (error) {
        await client.query('ROLLBACK'); // 7. 실패 시 롤백
        throw error;
    } finally {
        client.release(); // 8. 연결 반납
    }
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    // 1. 바로 업데이트 요청
    const updatedZone = await deviceControllerRepository.update(id, data);

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
    const deletedZone = await deviceControllerRepository.delete(id);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedZone) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedZone;
};

/**
 * 다중 삭제 (Multiple Delete)
 */
exports.multipleDelete = async (ids) => {
    // 1. 바로 삭제 요청
    const deletedZone = await deviceControllerRepository.deleteMultiple(ids);

    // 2. 결과가 null이면 "대상이 없다"는 뜻 -> 404 에러
    if (!deletedZone) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedZone;
};

/**
 * 장비 동기화 (Sync Devices)
 */
const _syncDevices = async (id) => {
    const deviceController = await deviceControllerRepository.findById(id);
    if (!deviceController) throw new Error('Device Controller not found');

    logger.info(`[Sync] 장비 동기화 시작: ${deviceController.name} (${deviceController.ipAddress}:${deviceController.port})`);

    try {
        const adapter = await AdapterFactory.getAdapter(id);
        const devices = await adapter.getSystemConfig();

        const integratedGates = devices.integratedGates || null;
        const barriers = devices.barriers || null;
        const leds = devices.leds || null;
        const exitKiosks = devices.exitKiosks|| null;
        const preKiosks = devices.preKiosks || null;
        const mainLprs = devices.mainLprs || null;        
        const subLprs = devices.subLprs || null;
        const exitPinholeCameras = devices.exitPinholeCameras || null;
        const prePinholeCameras = devices.prePinholeCameras || null;

        // 2. 데이터 추출 (새로운 JSON 키 매핑)
        // camera_list에 LPR과 정산기 카메라(Pinhole)가 혼재됨 -> _processCameraList에서 분기 처리
        const cameraData = devices.camera_list || []; 
        const IntegratedGateList = config.iotb_list || [];   // 통합 제어기 (IoT Board) -> 부모 장비
        const ledData = config.ledd_list || [];       // 전광판
        const exitKioskData = config.pt_list || [];   // 출구 정산기 (PC)
        const preKioskData = config.pre_pt_list || [];// 사전 정산기 (PC)

        // 3. [Step 1] 부모 장비(INTEGRATED_GATE) 생성
        const siteId = deviceController.siteId;
        const laneMap = await this._getLaneMap(siteId);
        const parentDeviceMap = new Map();
        let syncCount = 0;

        // 3-1. IoT Board 기준 생성
        for (const item of barrierData) {
            const location = item.location || 'UNKNOWN';

            let validIp = item.ip;
            if (validIp === 'localhost' || !validIp) validIp = '127.0.0.1';
            
            // [방향 추론 적용]
            const direction = this._getDirection(item, location);

            // 유니크한 이름 생성 (location + index)
            const deviceName = `${location}_INTEGRATED_${item.index ?? 0}`;

            const parent = await this._upsertDevice({
                siteId,
                deviceControllerId: id,
                laneId: laneMap.get(location),
                type: 'INTEGRATED_GATE',
                name: deviceName,
                description: item.description || `통합 제어 장비 (${location})`,
                location: location,
                ipAddress: validIp,
                port: item.port,
                status: 'ONLINE',
                direction: direction,
                modelName: 'IoT_Board'
            });
            if (parent) parentDeviceMap.set(location, parent.id);
        }

        // 4. [Step 2] 하위 장비 연결
        // 4-1. 카메라 (LPR, 보조LPR, 정산기카메라)
        syncCount += await this._processCameraList(siteId, id, cameraData, parentDeviceMap, laneMap);
        
        // 4-2. 전광판
        syncCount += await this._processSimpleList(siteId, id, ledData, 'LED', parentDeviceMap, laneMap);
        
        // 4-3. 정산기 (키오스크 본체)
        syncCount += await this._processKioskList(siteId, id, exitKioskData, 'EXIT', parentDeviceMap, laneMap);
        syncCount += await this._processKioskList(siteId, id, preKioskData, 'PRE', parentDeviceMap, laneMap);
        
        // 5. 완료 처리
        await this.repository.update(id, { status: 'ONLINE', config: config });

        logger.info(`[Sync] 동기화 완료. Parent: ${parentDeviceMap.size}개, Child: ${syncCount}개`);
        return { success: true, count: syncCount, parentCount: parentDeviceMap.size };

    } catch (error) {
        logger.error(`[Sync] 동기화 실패: ${error.message}`);
        await this.repository.update(id, { status: 'OFFLINE' });
        throw error;
    }
}