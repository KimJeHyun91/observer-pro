const MemberRepository = require('../repositories/member.repository');

/**
 * Member Service
 * - 정기권 회원 관련 비즈니스 로직 수행
 */
class MemberService {
    constructor() {
        this.repository = new MemberRepository();
    }

    /**
     * 신규 회원 생성
     */
    async create(data) {
        // TODO: 중복 가입 체크 로직 (같은 차량, 같은 기간 등) 추가 가능
        return await this.repository.create(data);
    }

    /**
     * 회원 목록 조회
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
            members: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 회원 상세 조회
     */
    async findDetail(id) {
        const data = await this.repository.findById(id);
        if (!data) {
            throw new Error('Member not found');
        }
        return data;
    }

    /**
     * 차량 번호로 유효한 회원 조회 (입차 시 사용)
     */
    async findMemberByCarNum(siteId, carNum) {
        return await this.repository.findValidMember(siteId, carNum);
    }

    /**
     * 회원 정보 수정
     */
    async update(id, data) {
        await this.findDetail(id);
        return await this.repository.update(id, data);
    }

    /**
     * 회원 삭제
     */
    async delete(id, isHardDelete = false) {
        await this.findDetail(id);
        return await this.repository.delete(id, isHardDelete);
    }
}

module.exports = MemberService;