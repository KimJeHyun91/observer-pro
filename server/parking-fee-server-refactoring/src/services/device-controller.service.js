const logger = require('../../../logger');
const DeviceControllerRepository = require('../repositories/device-controller.repository');
const AdapterFactory = require('../adapters/adapter.factory');
const LaneRepository = require('../repositories/lane.repository');
const DeviceService = require('./device.service');

/**
 * Device Controller Service
 * - 장비 제어기 관련 비즈니스 로직 수행
 */
class DeviceControllerService {
    constructor() {
        this.repository = new DeviceControllerRepository();
        this.deviceService = new DeviceService();
        this.laneRepository = new LaneRepository();
    }

    /**
     * 생성 (Create)
     * @param {Object} data - 생성할 데이터
     */
    async create(data) {
        const newController = await this.repository.create(data);
        
        // [자동 동기화] 비동기로 실행 (사용자 응답 지연 방지)
        this.syncDevices(newController.id).catch(err => {
            logger.error(`[Auto Sync] 생성 후 동기화 실패: ${err.message}`);
        });

        return newController;
    }

    /**
     * 목록 조회 (Find All)
     * - 페이징 파라미터 처리
     * - 정렬 옵션 설정
     * - 검색 필터 추출
     * @param {Object} params - 쿼리 파라미터 (page, limit, sortBy, sortOrder, 검색어 등)
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 100;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.repository.findAll(filters, sortOptions, limit, offset);

        return {
            deviceControllers: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 상세 조회 (Find Detail)
     * @param {string} id - UUID
     */
    async findDetail(id) {
        const data = await this.repository.findById(id);
        if (!data) {
            throw new Error('Device Controller not found');
        }
        return data;
    }

    /**
     * 수정 (Update)
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data) {
        return await this.repository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     */
    async delete(id) {
        return await this.repository.delete(id);
    }

    /**
     * 삭제 (Delete Multiple)
     * @param {Array<string>} deviceControllerIdList - UUID
     * @param {boolean} isHardDelete - 완전 삭제 여부
     */
    async deleteMultiple(deviceControllerIdList) {
        return await this.repository.deleteMultiple(deviceControllerIdList);
    }
    
    // =================================================================
    // [핵심] 장비 동기화 (Sync Devices) - Direction 추론 로직 적용
    // =================================================================
    async syncDevices(id) {
        const controller = await this.repository.findById(id);
        if (!controller) throw new Error('Device Controller not found');

        logger.info(`[Sync] 장비 동기화 시작: ${controller.name} (${controller.ipAddress})`);

        try {
            const adapter = await AdapterFactory.getAdapter(id);
            const responseData = await adapter.getSystemConfig();
            
            // 1. 데이터 구조 정규화
            const config = responseData.docs || responseData;

            // 2. 데이터 추출 (새로운 JSON 키 매핑)
            // camera_list에 LPR과 정산기 카메라(Pinhole)가 혼재됨 -> _processCameraList에서 분기 처리
            const cameraData = config.camera_list || []; 
            const barrierData = config.iotb_list || [];   // 통합 제어기 (IoT Board) -> 부모 장비
            const ledData = config.ledd_list || [];       // 전광판
            const exitKioskData = config.pt_list || [];   // 출구 정산기 (PC)
            const preKioskData = config.pre_pt_list || [];// 사전 정산기 (PC)

            // 3. [Step 1] 부모 장비(INTEGRATED_GATE) 생성
            const siteId = controller.siteId;
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

    // =================================================================
    // [공통 Helper] 방향(Direction) 결정 로직
    // 1. item.direction 확인
    // 2. 없으면 location 이름 확인 (입차/입구 -> IN, 출차/출구 -> OUT)
    // 3. 없으면 기본값 IN
    // =================================================================
    _getDirection(item, location) {
        // 1. JSON 데이터에 명시된 값 (ledd_list 등)
        if (item.direction && item.direction !== 'undefined') {
            return item.direction.toUpperCase();
        }

        // 2. Location 이름으로 추론
        if (location) {
            if (location.includes('입차') || location.includes('입구') || location.includes('in')) return 'IN';
            if (location.includes('출차') || location.includes('출구') || location.includes('out')) return 'OUT';
        }

        // 3. 기본값
        return 'IN';
    }

    // =================================================================
    // [Private Helper] 카메라 리스트 처리
    // =================================================================
    async _processCameraList(siteId, controllerId, list, parentMap, laneMap) {
        if (!list || !Array.isArray(list)) return 0;
        let count = 0;
        
        for (const item of list) {
            const location = item.location || 'UNKNOWN';
            const desc = item.description || '';

            let validIp = item.ip;
            if (validIp === 'localhost') validIp = '127.0.0.1';
            const direction = this._getDirection(item, location); // 방향 추론

            let deviceType = 'MAIN_LPR';

            if (desc.includes('출차') && desc.includes('정산') || location.includes('출차') && location.includes('정산')) {
                // 예: "구역A_출차1_정산기" -> 정산기 내부 핀홀 카메라
                deviceType = 'EXIT_PINHOLE_CAMERA';
            } else if (desc.includes('보조') || desc.includes('sub')) {
                // 예: "구역A_입차1_보조lpr"
                deviceType = 'SUB_LPR';
            } else if (desc.includes('사전') && desc.includes('정산') || location.includes('사전') && location.includes('정산')) {
                deviceType = 'PRE_PINHOLE_CAMERA'
            } else {
                // 예: "구역A_입차1_lpr"
                deviceType = 'MAIN_LPR';
            }

            const parentId = parentMap.get(location) || parentMap.get(location.replace('_정산기', ''));

            const suffix = validIp.split('.').pop();
            const deviceName = `${location}_${deviceType}_${suffix}`;

            await this._upsertDevice({
                siteId,
                deviceControllerId: controllerId,
                laneId: laneMap.get(location) || laneMap.get(location.replace('_정산기', '')), // 정산기 카메라는 Gate Lane에 소속
                parentDeviceId: parentId,
                type: deviceType,
                code: deviceType,
                name: deviceName,
                description: desc,
                ipAddress: validIp,
                port: item.port,
                location: location,
                direction: direction,
                vendor: 'PLS'
            });
            count++;
        }
        return count;
    }

    // =================================================================
    // [Private Helper] 정산기 리스트 처리
    // =================================================================
    async _processKioskList(siteId, controllerId, list, kioskMode, parentMap, laneMap) {
        if (!list || !Array.isArray(list)) return 0;
        let count = 0;

        for (const item of list) {
            const kioskType = kioskMode === 'PRE' ? 'PRE_KIOSK' : 'EXIT_KIOSK';
            const location = item.location || 'UNKNOWN';

            const validIp = (item.ip === 'localhost') ? '127.0.0.1' : item.ip;
            const direction = this._getDirection(item, location); // 방향 추론

            const parentId = parentMap.get(location);

            const suffix = validIp.split('.').pop();
            const deviceName = `${location}_${kioskType}_${suffix}`;

            await this._upsertDevice({
                siteId,
                deviceControllerId: controllerId,
                laneId: laneMap.get(location),
                parentDeviceId: parentId,
                type: kioskType,
                name: deviceName,
                description: item.description,
                ipAddress: validIp,
                port: item.port,
                location: location,
                direction: direction,
                vendor: 'PLS'
            });
            count++;
        }
        return count;
    }

    // =================================================================
    // [Private Helper] 일반 장비 (LED 등)
    // =================================================================
    async _processSimpleList(siteId, controllerId, list, type, parentMap, laneMap) {
        if (!list || !Array.isArray(list)) return 0;
        let count = 0;

        for (const item of list) {
            const location = item.location || 'UNKNOWN';

            let validIp = item.ip;
            if (validIp === 'localhost') validIp = '127.0.0.1';
            
            const direction = this._getDirection(item, location); // 방향 추론

            // LED의 경우 index가 명시되어 있는 경우가 많음
            const suffix = item.index !== undefined ? `_${item.index}` : `_${validIp.split('.').pop()}`;
            const deviceName = `${location}_${type}${suffix}`;

            await this._upsertDevice({
                siteId,
                deviceControllerId: controllerId,
                laneId: laneMap.get(location),
                parentDeviceId: parentMap.get(location),
                type: type,
                name: deviceName,
                description: item.description,
                ipAddress: validIp,
                port: item.port,
                location: location,
                direction: direction,
                vendor: 'PLS'
            });
            count++;
        }
        return count;
    }

    async _upsertDevice(data) {
        try {
            // 이름과 컨트롤러 ID로 기존 장비 조회
            const existing = await this.deviceService.findAll({
                siteId: data.siteId,
                deviceControllerId: data.deviceControllerId,
                name: data.name
            });

            if (existing.devices && existing.devices.length > 0) {
                return await this.deviceService.update(existing.devices[0].id, data, true); 
            } else {
                return await this.deviceService.create(data);
            }
        } catch (error) {
            logger.warn(`[Sync] 장비 처리 실패 (${data.name}): ${error.message}`);
            return null;
        }
    }

    async _getLaneMap(siteId) {
        const lanes = await this.laneRepository.findAll({ siteId }, {}, 200, 0);
        const map = new Map();
        if (lanes && lanes.rows) {
            lanes.rows.forEach(l => map.set(l.name, l.id));
        }
        return map;
    }
}

module.exports = DeviceControllerService;