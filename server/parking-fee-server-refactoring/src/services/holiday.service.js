const HolidayRepository = require('../repositories/holiday.repository');

/**
 * Holiday Service
 * - 휴일 관련 비즈니스 로직 수행
 */
class HolidayService {
    constructor() {
        this.repository = new HolidayRepository();
    }

    /**
     * 신규 휴일 생성
     */
    async create(data) {
        return await this.repository.create(data);
    }

    /**
     * 휴일 목록 조회
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
            sortBy: params.sortBy || 'date', // 날짜순 정렬 기본
            sortOrder: params.sortOrder || 'ASC' // 빠른 날짜부터
        };

        const { rows, count } = await this.repository.findAll(filters, sortOptions, limit, offset);

        return {
            holidays: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 휴일 상세 조회
     */
    async findDetail(id) {
        const data = await this.repository.findById(id);
        if (!data) {
            throw new Error('Holiday not found');
        }
        return data;
    }

    /**
     * 휴일 정보 수정
     */
    async update(id, data) {
        await this.findDetail(id);
        return await this.repository.update(id, data);
    }

    /**
     * 휴일 삭제
     */
    async delete(id, isHardDelete = false) {
        await this.findDetail(id);
        return await this.repository.delete(id, isHardDelete);
    }
}

module.exports = HolidayService;