const MemberRepository = require('../repositories/member.repository');
const { createSHA256Hash } = require('../utils/hash.util'); 

/**
 * Member Service
 * - 정기권 회원 관련 비즈니스 로직 수행
 * - 개인정보 암호화 및 마스킹 처리 담당
 */
class MemberService {
    constructor() {
        this.memberRepository = new MemberRepository();
    }

    /**
     * 생성 (Create)
     * - 이름, 전화번호가 들어오면 마스킹 및 해싱 처리 후 Repository 전달
     * @param {Object} data - 생성할 데이터
     */
    async create(data) {
        // 데이터 원본 훼손을 막기 위해 복사
        const memberData = { ...data };

        // 1. 이름 처리 (평문, 마스킹, 해시)
        if (memberData.name) {
            memberData.nameMasked = this._maskName(memberData.name);
            memberData.nameHash = createSHA256Hash(memberData.name);
        }

        // 2. 전화번호 처리 (평문, 마스킹, 해시)
        if (memberData.phone) {
            memberData.phoneMasked = this._maskPhone(memberData.phone);
            memberData.phoneHash = createSHA256Hash(memberData.phone);
        }

        // Repository는 가공된 데이터를 받아 저장만 수행
        return await this.memberRepository.create(memberData);
    }

    /**
     * 목록 조회 (Find All)
     * @param {Object} params - 쿼리 파라미터 (page, limit, sortBy, sortOrder, 검색어 등)
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 10;
        const offset = (page - 1) * limit;

        // 페이징, 정렬 관련 키워드를 제외한 나머지는 모두 검색 필터로 간주
        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'createdAt',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.memberRepository.findAll(filters, sortOptions, limit, offset);

        // 결과 포맷팅
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
     * 상세 조회 (Find Detail)
     * @param {string} id - UUID
     */
    async findDetail(id) {
        const member = await this.memberRepository.findById(id);
        return member;
    }

    /**
     * 수정 (Update)
     * - 이름이나 전화번호가 변경되는 경우, 마스킹/해시 값도 재계산하여 전달
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data) {
        const updateData = { ...data };

        // 1. 이름이 변경된 경우 재처리
        if (updateData.name !== undefined) {
            updateData.nameMasked = this._maskName(updateData.name);
            updateData.nameHash = createSHA256Hash(updateData.name);
        }

        // 2. 전화번호가 변경된 경우 재처리
        if (updateData.phone !== undefined) {
            updateData.phoneMasked = this._maskPhone(updateData.phone);
            updateData.phoneHash = createSHA256Hash(updateData.phone);
        }

        return await this.memberRepository.update(id, updateData);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     */
    async delete(id) {
        return await this.memberRepository.delete(id);
    }

    /**
     * 차량 번호로 유효한 회원 조회 (입차 시 사용)
     */
    async findMemberByCarNum(siteId, carNum) {
        return await this.memberRepository.findValidMember(siteId, carNum);
    }

    // --- Private Helper Methods (Business Logic) ---

    /**
     * 이름 마스킹 로직
     * 예: 홍길동 -> 홍*동, 이산 -> 이*
     */
    _maskName(name) {
        if (!name || name.length <= 1) return name;
        if (name.length === 2) return name[0] + '*';
        return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    }

    /**
     * 전화번호 마스킹 로직
     * 예: 010-1234-5678 -> 010-****-5678
     */
    _maskPhone(phone) {
        if (!phone || phone.length < 8) return phone;
        
        const prefix = phone.substring(0, 3);
        const suffix = phone.substring(phone.length - 4);
        return `${prefix}****${suffix}`;
    }
}

module.exports = MemberService;