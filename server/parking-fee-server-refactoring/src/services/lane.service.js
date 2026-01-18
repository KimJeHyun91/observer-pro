const { pool } = require('../../../db/postgresqlPool');
const laneRepository = require('../repositories/lane.repository');
const deviceRepository = require('../repositories/device.repository');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (params) => {
    // 1. 페이징 처리
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const offset = (page - 1) * limit;

    // 2. 검색 필터 명시적 할당
    const filters = {};
    if (params.zoneId) filters.zoneId = params.zoneId;
    if (params.name)   filters.name = params.name;
    if (params.type)   filters.type = params.type;
    if (params.code)   filters.code = params.code;

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'name', 'code', 'type'];
    let sortBy = params.sortBy || 'createdAt';
    if (!ALLOWED_SORTS.includes(sortBy)) sortBy = 'createdAt';
    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    // 4. Repository 호출
    const { rows, count } = await laneRepository.findAll(filters, { sortBy, sortOrder }, limit, offset);

    return {
        lanes: rows,
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
    const lane = await laneRepository.findById(id);

    // [Service 404 처리]
    if (!lane) {
        const err = new Error('해당 차선을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return lane;
};

/**
 * 생성 (Create)
 * - 1. 차선 정보 저장 (LaneRepo)
 * - 2. 장비 연결 정보 업데이트 (DeviceRepo)
 * - 3. 트랜잭션 적용
 */
exports.create = async (data) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. 차선 생성 (중복 시 Repo에서 409 발생)
        const lane = await laneRepository.create(data, client);

        // 2. 연관 장비(통합 차단기 등) ID 수집
        const deviceIds = [];
        if (data.inIntegratedGate?.id) deviceIds.push(data.inIntegratedGate.id);
        if (data.outIntegratedGate?.id) deviceIds.push(data.outIntegratedGate.id);

        // 3. 장비들에 lane_id 할당 (DeviceRepository에 위임)
        if (deviceIds.length > 0) {
            await deviceRepository.assignToLane(lane.id, deviceIds, client);
        }

        await client.query('COMMIT');
        
        return lane;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * 수정 (Update)
 * - One-Shot Update 패턴 적용
 */
exports.update = async (id, data) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. 차선 기본 정보 업데이트 시도
        let updatedLane = await laneRepository.update(id, data, client);

        // 만약 차선 정보는 안 바꾸고 '장비'만 바꿀 경우, 
        // update 쿼리 결과가 null일 수 있으므로 존재 여부 재확인
        if (!updatedLane) {
            updatedLane = await laneRepository.findById(id);
            if (!updatedLane) {
                const err = new Error('해당 차선을 찾을 수 없습니다.');
                err.status = 404;
                throw err;
            }
        }

        // 2. 장비 연결 수정 (요청 데이터에 관련 필드가 있을 때만 실행)
        const hasDeviceInfo = (data.inIntegratedGate !== undefined || data.outIntegratedGate !== undefined);
        
        if (hasDeviceInfo) {
            const deviceIds = [];
            if (data.inIntegratedGate?.id) deviceIds.push(data.inIntegratedGate.id);
            if (data.outIntegratedGate?.id) deviceIds.push(data.outIntegratedGate.id);

            // DeviceRepository를 통해 pf_devices 테이블 갱신
            await deviceRepository.assignToLane(id, deviceIds, client);
        }

        await client.query('COMMIT');
                
        return updatedLane;

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
    // 1. 삭제 시도 (One-Shot)
    const deletedLane = await laneRepository.delete(id);

    // 2. 결과가 없으면 404 에러
    if (!deletedLane) {
        const err = new Error('해당 차선을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    
    return deletedLane;
};