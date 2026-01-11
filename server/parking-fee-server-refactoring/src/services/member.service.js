const MemberRepository = require('../repositories/member.repository');
const MemberPaymentHistoryRepository = require('../repositories/member-payment-history.repository');

// [수정] 만들어두신 암호화 유틸리티를 가져옵니다. (경로는 실제 위치에 맞게 수정해주세요)
const { encrypt, decrypt, createSHA256Hash } = require('../utils/crypto.util');

class MemberService {
    constructor() {
        this.memberRepository = new MemberRepository();
        this.memberPaymentHistoryRepository = new MemberPaymentHistoryRepository();
    }

    /**
     * 회원 생성 (Create)
     */
    async create(data) {
        // 1. 중복 가입 방지 (차량번호 기준)
        const existingMember = await this.memberRepository.findByCarNumber(data.siteId, data.carNumber);
        if (existingMember) {
            const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
            error.status = 409;
            throw error;
        }

        // 2. [수정] 전화번호 암호화 및 가공 처리
        let phoneData = {
            phoneEncrypted: null,
            phoneLastDigits: null,
            phoneHash: null
        };

        if (data.phone) {
            // 숫자만 추출 (하이픈 제거 등)
            const cleanPhone = data.phone.replace(/[^0-9]/g, '');
            
            phoneData = {
                phoneEncrypted: encrypt(cleanPhone),       // 양방향 암호화 (복구용)
                phoneHash: createSHA256Hash(cleanPhone),   // 단방향 해시 (검색용)
                phoneLastDigits: cleanPhone.slice(-4)      // 마스킹용 (뒤 4자리)
            };
        }

        // Repository에 전달할 데이터 병합
        const createData = {
            ...data,
            ...phoneData // 가공된 전화번호 필드 덮어쓰기
        };

        // 3. 회원 생성
        const newMember = await this.memberRepository.create(createData);

        // 4. 응답 (신규 회원이므로 멤버십 이력 없음)
        return this._enrichMemberWithStatus(newMember, []);
    }

    /**
     * 목록 조회 (Find All)
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 100;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'status', 'phone']; // phone, status 제외
        
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        // [수정] 전화번호 검색 시: 입력받은 번호를 해시로 변환하여 검색
        if (params.phone) {
             const cleanPhone = params.phone.replace(/[^0-9]/g, '');
             filters.phoneHash = createSHA256Hash(cleanPhone);
        }

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        // 1. 회원 목록 조회
        const { rows: members, count } = await this.memberRepository.findAll(filters, sortOptions, limit, offset);

        // 2. 결제 이력 조회 (N+1 방지)
        const memberIds = members.map(m => m.id);
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds(memberIds);

        // 3. 상태 계산 및 복호화(필요 시)
        const membersWithMembership = members.map(member => {
            const memberHistories = histories.filter(h => h.memberId === member.id);
            const enriched = this._enrichMemberWithStatus(member, memberHistories);
            
            // [옵션] 관리자에게 보여줄 때는 복호화해서 원본 번호를 보여줄 수도 있음
            // enriched.originalPhone = decrypt(member.phoneEncrypted);
            
            return enriched;
        });

        // [주의] status 필터링은 메모리에서 처리 (DB 컬럼이 없으므로)
        let finalResult = membersWithMembership;
        if (params.status) {
            finalResult = membersWithMembership.filter(m => m.currentMembership.status === params.status);
        }

        return {
            members: finalResult,
            meta: {
                totalItems: parseInt(count), // DB 검색 결과 수 (status 필터 적용 전)
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 상세 조회
     */
    async findDetail(id) {
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('존재하지 않는 회원입니다.');
            error.status = 404;
            throw error;
        }

        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds([id]);
        
        // 상세 조회 시에는 복호화된 전화번호를 포함해서 줄 수도 있음
        const enriched = this._enrichMemberWithStatus(member, histories);
        enriched.decryptedPhone = decrypt(member.phoneEncrypted); // 필요 시 사용

        return enriched;
    }

    /**
     * 정보 수정 (Update)
     */
    async update(id, data) {
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('존재하지 않는 회원입니다.');
            error.status = 404;
            throw error;
        }

        // 1. 차량 번호 변경 시 중복 체크
        if (data.carNumber && data.carNumber !== member.carNumber) {
            const duplicate = await this.memberRepository.findByCarNumber(member.siteId, data.carNumber);
            if (duplicate) {
                const error = new Error(`이미 등록된 차량 번호입니다: ${data.carNumber}`);
                error.status = 409;
                throw error;
            }
        }

        // 2. [수정] 전화번호 변경 시 암호화 데이터 갱신
        let updateData = { ...data };
        
        if (data.phone) {
            const cleanPhone = data.phone.replace(/[^0-9]/g, '');
            updateData.phoneEncrypted = encrypt(cleanPhone);
            updateData.phoneHash = createSHA256Hash(cleanPhone);
            updateData.phoneLastDigits = cleanPhone.slice(-4);
            
            // 원본 phone 필드는 DB에 없으므로 제거 (안전장치)
            delete updateData.phone;
        }

        // 3. 업데이트 수행
        const updatedMember = await this.memberRepository.update(id, updateData);

        // 4. 결과 반환 (이력 포함)
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds([id]);
        return this._enrichMemberWithStatus(updatedMember, histories);
    }

    /**
     * 삭제
     */
    async delete(id) {
        const member = await this.memberRepository.findById(id);
        if (!member) {
            const error = new Error('삭제할 회원을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return await this.memberRepository.delete(id);
    }

    // =====================================================================
    // [수정] 멤버십 상태 계산 + 전화번호 복호화 + 내부 컬럼 제거
    // =====================================================================
    _enrichMemberWithStatus(member, histories) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. 멤버십 상태 계산 로직 (기존과 동일)
        let targetHistory = null;
        let status = 'EXPIRED';

        const activeHistory = histories.find(h => {
            const start = new Date(h.startDate);
            const end = new Date(h.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return start <= today && end >= today;
        });

        const upcomingHistory = histories.find(h => {
            const start = new Date(h.startDate);
            start.setHours(0, 0, 0, 0);
            return start > today;
        });

        if (activeHistory) {
            targetHistory = activeHistory;
            const endDate = new Date(activeHistory.endDate);
            endDate.setHours(0, 0, 0, 0);
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            status = diffDays <= 7 ? 'EXPIRING' : 'ACTIVE';
        } else if (upcomingHistory) {
            targetHistory = upcomingHistory;
            status = 'UPCOMING';
        } else {
            status = 'EXPIRED';
            if (histories.length > 0) targetHistory = histories[0];
        }

        let currentMembership = null;
        if (targetHistory) {
            let remainingDays = 0;
            const startDate = new Date(targetHistory.startDate);
            const endDate = new Date(targetHistory.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (status === 'UPCOMING') {
                const diffTime = endDate - startDate;
                remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                const diffTime = endDate - today;
                remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            currentMembership = {
                status,
                startDate: targetHistory.startDate,
                endDate: targetHistory.endDate,
                remainingDays,
                paidFee: targetHistory.amount,
                paidMethod: targetHistory.paymentMethod,
                policyName: targetHistory.policyName
            };
        } else {
            currentMembership = {
                status: 'EXPIRED',
                startDate: null,
                endDate: null,
                remainingDays: 0,
                paidFee: 0,
                paidMethod: null
            };
        }

        // -----------------------------------------------------------
        // [핵심 수정] 내부 보안 컬럼 제거 및 phone 복원
        // -----------------------------------------------------------
        
        // 1. 내부용 컬럼을 분리(Destructuring)하여 제외시킴
        const { 
            phoneEncrypted, 
            phoneHash, 
            phoneLastDigits, 
            ...cleanMemberData 
        } = member;

        // 2. phoneEncrypted를 복호화하여 'phone' 필드로 추가
        // (만약 phoneEncrypted가 null이면 null 반환)
        const originalPhone = phoneEncrypted ? decrypt(phoneEncrypted) : null;

        return {
            ...cleanMemberData, // 암호화 필드가 제거된 원본 데이터
            phone: originalPhone, // 복호화된 전화번호
            currentMembership
        };
    }

    /**
     * [추가] LPR 서비스용: 차량 번호로 회원 조회
     */
    async findMemberByCarNumber(siteId, carNumber) {
        // Repository의 메서드 활용
        const member = await this.memberRepository.findByCarNumber(siteId, carNumber);
        
        // 회원이 없으면 null 반환
        if (!member) return null;

        // 현재 멤버십 상태까지 포함해서 반환하고 싶다면:
        // (단, LPR 성능을 위해 멤버십 계산이 필요 없다면 그냥 member만 리턴해도 됨)
        // 여기서는 멤버십 유효 여부를 판단해야 하므로 이력을 조회해서 합쳐줌
        const histories = await this.memberPaymentHistoryRepository.findAllByMemberIds([member.id]);
        
        return this._enrichMemberWithStatus(member, histories);
    }
}

module.exports = MemberService;