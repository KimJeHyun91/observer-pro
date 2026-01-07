const BlacklistRepository = require('../repositories/blacklist.repository');

/**
 * Blacklist Service
 * - 블랙리스트 관련 비즈니스 로직 수행
 */
class BlacklistService {
    constructor() {
        this.repository = new BlacklistRepository();
    }

    /**
     * 신규 블랙리스트 생성
     */
    async create(data) {
        return await this.repository.create(data);
    }

    /**
     * 블랙리스트 목록 조회
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 10;
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
            blacklists: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 블랙리스트 상세 조회
     */
    async findDetail(id) {
        const data = await this.repository.findById(id);
        if (!data) {
            throw new Error('Blacklist not found');
        }
        return data;
    }

    /**
     * 블랙리스트 여부 확인 (입차 시 사용)
     * - siteId가 없으면 전체 블랙리스트, 있으면 해당 사이트 포함 블랙리스트 검색
     */
    async checkBlacklist(carNum, siteId) {
        return await this.repository.checkBlacklist(carNum, siteId);
    }

    /**
     * 블랙리스트 정보 수정
     */
    async update(id, data) {
        await this.findDetail(id);
        return await this.repository.update(id, data);
    }

    /**
     * 블랙리스트 삭제
     */
    async delete(id, isHardDelete = false) {
        await this.findDetail(id);
        return await this.repository.delete(id, isHardDelete);
    }
}

module.exports = BlacklistService;