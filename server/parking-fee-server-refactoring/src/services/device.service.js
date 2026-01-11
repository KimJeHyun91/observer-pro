const DeviceRepository = require('../repositories/device.repository');

/**
 * Device Service
 * - 물리적 장비 관련 비즈니스 로직 수행
 */
class DeviceService {
    constructor() {
        this.repository = new DeviceRepository();
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
        const limit = parseInt(params.limit) || 100;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'deleteMethod'];
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
            devices: rows,
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
            throw new Error('Device not found');
        }
        return data;
    }

    /**
     * 수정 (Update)
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data, isSystemAction = false) {
        const device = await this.findDetail(id);
        if (device) {

            if (device.deviceControllerId && !isSystemAction) {
                const invalidRequestError = new Error('DeviceController와 연동된 Device는 수정할 수 없습니다.');
                invalidRequestError.status = 400;
                throw invalidRequestError;
            }

        }
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
     * [추가] Location 이름으로 장비 단건 조회
     * - PLS 데이터 수신 시 Context(Site, Lane) 파악용
     */
    async findOneByLocation(location) {
        if (!location) return null;

        // Repository의 findAll 메서드를 재사용하여 location으로 검색
        // (limit: 1로 설정하여 하나만 가져옴)
        const result = await this.repository.findAll({ location }, {}, 1, 0);
        
        if (result.rows && result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    }

    /**
     * 특정 위치의 LED 장비 찾기
     */
    async findLedByLocation(locationName) {
        const result = await this.repository.findAll({ 
            location: locationName, 
            type: 'LED', 
            limit: 1 
        }, {}, 1, 0);
        return result.rows[0] || null;
    }
}

module.exports = DeviceService;