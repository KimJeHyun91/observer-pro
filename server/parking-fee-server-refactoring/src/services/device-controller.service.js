const DeviceControllerRepository = require('../repositories/device-controller.repository');

/**
 * Device Controller Service
 * - 장비 제어기 관련 비즈니스 로직 수행
 */
class DeviceControllerService {
    constructor() {
        this.repository = new DeviceControllerRepository();
    }

    /**
     * 생성 (Create)
     * @param {Object} data - 생성할 데이터
     */
    async create(data) {
        return await this.repository.create(data);
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
        const limit = parseInt(params.limit) || 10;
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
        await this.findDetail(id);
        return await this.repository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     * @param {boolean} isHardDelete - 완전 삭제 여부
     */
    async delete(id, isHardDelete = false) {
        await this.findDetail(id);
        return await this.repository.delete(id, isHardDelete);
    }
    
    // =================================================================
    // [핵심] 장비 동기화 기능 (Sync Devices)
    // =================================================================

    // /**
    //  * 장비 제어 서비스로부터 설정을 받아와 DB 장비 목록을 동기화합니다.
    //  * @param {string} id - DeviceController ID
    //  */
    // async syncDevices(id) {
    //     // 1. 제어기 정보 조회
    //     const controller = await this.findDetail(id);
    //     const siteId = controller.site_id;
    //     const vendorCode = controller.code || 'UNKNOWN'; // 예: 'PLS'

    //     // 2. 어댑터를 통해 시스템 설정 가져오기
    //     const adapter = await AdapterFactory.getAdapter(id);
    //     let systemConfig;
    //     try {
    //         systemConfig = await adapter.fetchSystemConfig();
    //     } catch (error) {
    //         logger.error(`[Sync] Failed to fetch config from Controller (${controller.name}): ${error.message}`);
    //         throw new Error('장비 제어 서비스 통신 실패: 설정을 가져올 수 없습니다.');
    //     }

    //     // 3. 동기화 실행
    //     logger.info(`[Sync] Starting sync for Controller: ${controller.name} (${vendorCode})...`);
        
    //     // PLS 포맷 기준 (다른 벤더 추가 시 매핑 로직 확장 필요)
    //     const result = {
    //         lpr: await this._syncDeviceList(siteId, id, systemConfig.lpr_list, 'LPR', vendorCode),
    //         barrier: await this._syncDeviceList(siteId, id, systemConfig.barrier_list, 'BARRIER', vendorCode),
    //         led: await this._syncDeviceList(siteId, id, systemConfig.led_list, 'LED', vendorCode),
    //         pt: await this._syncDeviceList(siteId, id, systemConfig.pt_list, 'KIOSK', vendorCode)
    //     };

    //     // 4. 제어기 상태 업데이트 (ONLINE)
    //     await this.repository.update(id, { status: 'ONLINE', config: systemConfig });

    //     logger.info(`[Sync] Completed. Result: ${JSON.stringify(result)}`);
    //     return result;
    // }

    // /**
    //  * [내부] 장비 리스트 동기화 처리
    //  */
    // async _syncDeviceList(siteId, controllerId, deviceList, type, vendorName) {
    //     if (!deviceList || !Array.isArray(deviceList) || deviceList.length === 0) {
    //         return 0;
    //     }

    //     let count = 0;
        
    //     // 해당 사이트의 모든 차선 조회 (location 이름 매칭용)
    //     const allLanes = await this.laneRepository.findAll({ site_id: siteId }, {}, 100, 0); // 임시: 전체 조회 로직 필요
    //     const lanesMap = new Map();
    //     if (allLanes && allLanes.rows) {
    //         allLanes.rows.forEach(lane => lanesMap.set(lane.name, lane.id));
    //     }

    //     for (const item of deviceList) {
    //         // location(예: "입차1")을 이용해 lane_id 매핑
    //         const laneName = item.location;
    //         const laneId = lanesMap.get(laneName) || null;

    //         if (!laneId) {
    //             logger.warn(`[Sync] Lane not found for location: ${laneName}. Device will be created without lane_id.`);
    //         }

    //         // 장비 생성 데이터 구성
    //         const deviceData = {
    //             site_id: siteId,
    //             device_controller_id: controllerId,
    //             lane_id: laneId,
    //             type: type,
    //             name: `${laneName}_${type}_${item.id || item.type || count}`, // 고유 이름 생성
    //             ip_address: item.ip,
    //             port: item.port,
    //             location: { name: laneName }, // 원본 위치명 저장
    //             status: 'ONLINE',
    //             vendor: item.type || vendorName, // 벤더 정보 활용
    //             description: `Synced from ${vendorName} (ID: ${item.id || 'N/A'})`
    //         };

    //         // 기존 장비가 있는지 확인 (IP 기준으로 중복 체크하거나, name+controllerId로 체크)
    //         // 여기서는 DeviceRepository에 'findByIp'나 'upsert'가 없으므로 create만 호출하지만,
    //         // 실제 운영에서는 중복 방지 로직(Upsert)이 필수입니다.
    //         // 임시로 create 호출 (실제 구현 시엔 upsert 로직 필요)
    //         try {
    //             await this.deviceRepository.create(deviceData);
    //             count++;
    //         } catch (error) {
    //             logger.warn(`[Sync] Failed to create device ${deviceData.name}: ${error.message}`);
    //             // 중복 등의 에러는 무시하고 계속 진행
    //         }
    //     }
    //     return count;
    // }
}

module.exports = DeviceControllerService;