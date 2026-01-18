const { pool } = require('../../../db/postgresqlPool');
const siteRepository = require('../repositories/site.repository');
const deviceControllerRepository = require('../repositories/device-controller.repository');
const policyService = require('./policy.service');
const adapterFactory = require('../adapters/adapter.factory');
const socketService = require('../services/socket.service');
const logger = require('../../../logger');

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

    if (params.name)    filters.name = params.name;         // 이름 검색
    if (params.code)    filters.code = params.code;         // 코드 검색
    if (params.status)  filters.status = params.status;     // 상태 검색

    // 3. 정렬 옵션 (Allowlist 적용)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'name', 'code', 'status'];
    let sortBy = params.sortBy || 'createdAt';
    
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await siteRepository.findAll(filters, sortOptions, limit, offset);

    return {
        sites: rows,
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
    const site = await siteRepository.findById(id);

    if (!site) {
        const err = new Error('해당 주차장을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return site;
};

/**
 * 생성 (Create)
 * - 트랜잭션을 적용하여 사이트 생성과 정책 초기화를 묶습니다.
 */
exports.create = async (data) => {
    
    const client = await pool.connect(); // 1. DB 연결 획득

    try {
        if (data.deviceControllerIds && data.deviceControllerIds.length > 0) {
            // 1. DB에서 조회
            const controllers = await deviceControllerRepository.findByIds(data.deviceControllerIds);

            // 2. 존재 여부 체크 (요청한 개수와 조회된 개수가 다르면 에러)
            if (controllers.length !== data.deviceControllerIds.length) {
                const err = new Error('존재하지 않는 장비 제어기가 포함되어 있습니다.');
                err.status = 404;
                throw err;
            }

            // 3. 이미 다른 사이트에 할당된 장비인지 체크 (정책 결정 필요)
            // 정책: "이미 다른 사이트에 속해 있으면 에러를 뱉는다"라고 가정
            const alreadyAssigned = controllers.filter(c => c.siteId !== null);
            if (alreadyAssigned.length > 0) {
                // 어떤 장비가 문제인지 알려주면 더 좋음
                const names = alreadyAssigned.map(c => c.name).join(', ');
                const err = new Error(`다음 장비 제어기는 이미 다른 사이트에 할당되어 있습니다: ${names}`);
                err.status = 409; // Conflict
                throw err;
            }
        }
        // ------------------------------------------------------------------

        await client.query('BEGIN');

        // 1. 사이트 생성
        const site = await siteRepository.create(data, client);

        // 2. 장비 제어기 할당 (이제 안전함)
        if (data.deviceControllerIds && data.deviceControllerIds.length > 0) {
            await deviceControllerRepository.assignToSite(
                site.id, 
                data.deviceControllerIds, 
                client
            );
        }

        // 3. 정책 초기화
        await policyService.initializeDefaults(site.id, client);

        await client.query('COMMIT');

        return site;
    } catch (error) {
        await client.query('ROLLBACK'); // 7. 실패 시 롤백
        throw error;
    } finally {
        client.release(); // 8. 연결 반납
    }
};

/**
 * 수정 (Update)
 * - LOCK / UNLOCK 상태 변경 시의 비즈니스 로직 수행
 * - UNLOCK 시 하위 장비들의 연결 상태를 확인하여 상태 결정
 */
exports.update = async (id, data) => {
    const client = await pool.connect();
    
    try {

        await client.query('BEGIN');

        const site = await exports.findDetail(id); 
        if (!site) {
            const err = new Error('해당 Site를 찾을 수 없습니다.');
            err.status = 404;
            throw err;
        }

        // 1. 장비 제어기 관계 수정
        if (data.updateAction && data.deviceControllerId) {
            await deviceControllerRepository.updateSiteRelation(
                id, 
                data.deviceControllerId, 
                data.updateAction, 
                client
            );

            //  메모리 상의 site.deviceControllers도 최신화 (Health Check를 위해)
            if (data.updateAction === 'ADD') {
                // 임시로 ID만 추가 (checkSiteHealth는 ID만 있으면 됨)
                site.deviceControllers.push({ id: data.deviceControllerId });
            } else if (data.updateAction === 'REMOVE') {
                // 목록에서 제거
                site.deviceControllers = site.deviceControllers.filter(
                    dc => dc.id !== data.deviceControllerId
                );
            }
        }

        // 2. 상태 변경 요청 시 로직 (LOCK / UNLOCK)
        if (data.status) {
            if (data.status === 'LOCK') {
                // LOCK은 무조건 LOCK으로 저장
                data.status = 'LOCK';
            } 
            else if (data.status === 'UNLOCK') {
                // UNLOCK 요청 시, 실제 하위 장비들의 연결 상태(Health) 체크
                // site.deviceControllers가 없으면(undefined) 빈 배열로 처리되어 true(NORMAL)가 됨
                const isAllHealthy = await checkSiteHealth(site.deviceControllers);

                if (isAllHealthy) {
                    data.status = 'NORMAL'; // 전부 연결됨 -> 정상
                } else {
                    data.status = 'ERROR';  // 하나라도 연결 안됨 -> 장애
                }
            }
            // 그 외 상태값은 그대로 업데이트
        }

        // 3. 사이트 정보 업데이트
        const updatedSite = await siteRepository.update(id, data, client);

        await client.query('COMMIT');
        return updatedSite;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    const deletedSite = await siteRepository.delete(id);

    // 2. 결과가 없으면 404 에러
    if (!deletedSite) {
        const err = new Error('해당 사이트를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    return deletedSite;
};

/**
 * 트리 조회 (Find Tree)
 * - 사이트 및 하위 계층 구조 전체 조회
 */
exports.findTree = async (id) => {
    const site = await siteRepository.findTree(id);
    if (!site) {
        const err = new Error('해당 사이트를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return site;
};

// =================================================================
// Internal Helper Functions
// =================================================================
/**
 * 사이트 하위 모든 장비의 Health Check
 * - AdapterFactory를 통해 각 장비 타입에 맞는 어댑터를 생성하여 검사
 * - 병렬(Parallel) 처리로 성능 최적화
 * * @param {Array} deviceControllers - 장비 제어기 목록
 * @returns {Promise<boolean>} - 모두 정상이면 true, 하나라도 에러면 false
 */
const checkSiteHealth = async (deviceControllers) => {
    // 장비가 하나도 없으면 정상(NORMAL)으로 간주
    if (!deviceControllers || deviceControllers.length === 0) {
        return true; 
    }

    // 1. 모든 장비에 대해 병렬로 핑(Health Check) 전송
    const healthChecks = deviceControllers.map(async (deviceController) => {
        try {
            // [Factory Pattern] ID를 이용해 적절한 어댑터 인스턴스 획득
            const adapter = await adapterFactory.getAdapter(deviceController.id);

            // 공통 인터페이스 checkHealth() 호출
            return await adapter.checkHealth(); 

        } catch (error) {
            // 어댑터 생성 실패(지원하지 않는 타입) 혹은 연결 실패 시
            // 로그를 남기고 해당 장비는 '비정상(false)'으로 처리
            logger.error(`[HealthCheck Fail] Device: ${deviceController.id}`, error.message);
            return false;
        }
    });

    // 2. 모든 검사 결과 대기
    const results = await Promise.all(healthChecks);

    // 3. 하나라도 false(비정상)가 있으면 최종 결과는 false(ERROR)
    return results.every(result => result === true);
};

/**
 * 사이트 상태 재계산 (동기화)
 * - 스케줄러나 장비 상태 변경 시 호출됨
 * - 로직:
 * 1. 사이트가 'LOCK' 상태면 건드리지 않음
 * 2. 하위 장비 중 하나라도 'OFFLINE'이면 -> 'ERROR'
 * 3. 모두 'ONLINE'이면 -> 'NORMAL'
 */
exports.recalculateStatus = async (siteId) => {
    // 1. 사이트 현재 상태 조회
    const site = await siteRepository.findById(siteId);
    if (!site) return;

    // [중요] 운영자가 수동으로 잠근(LOCK) 경우, 시스템이 자동으로 바꾸면 안 됨
    if (site.status === 'LOCK') {
        return;
    }

    // 2. 해당 사이트의 모든 장비 제어기 상태 조회
    // (deviceControllerRepository에 findAll 메서드 활용)
    const { rows: controllers } = await deviceControllerRepository.findAllWithoutPagination(
        { siteId: siteId }, // 필터
        { sortBy: 'id', sortOrder: 'ASC' }, // 정렬
    );

    // 3. 상태 판별 로직
    // 하나라도 OFFLINE이거나 비정상이면 -> 사이트는 ERROR
    const hasError = controllers.some(dc => dc.status !== 'ONLINE');
    
    const newStatus = hasError ? 'ERROR' : 'NORMAL';

    // 4. 상태가 변했을 때만 DB 업데이트 & 소켓 발송
    if (site.status !== newStatus) {
        logger.info(`[Site Status Change] ${site.name}: ${site.status} -> ${newStatus}`);
        
        await siteRepository.update(siteId, { status: newStatus });
        
        // 소켓 알림 (화면 갱신)
        socketService.emitSiteRefresh();
    }
};