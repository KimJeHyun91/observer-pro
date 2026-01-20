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
    await validateLaneDevices(data.inIntegratedGateId, data.outIntegratedGateId, null);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. 차선 생성 (중복 시 Repo에서 409 발생)
        const lane = await laneRepository.create(data, client);

        // 2. 연관 장비(통합 차단기 등) ID 수집
        const deviceIds = [];
        if (data.inIntegratedGateId) deviceIds.push(data.inIntegratedGateId);
        if (data.outIntegratedGateId) deviceIds.push(data.outIntegratedGateId);

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
    const hasDeviceInfo = (data.inIntegratedGateId !== undefined || data.outIntegratedGateId !== undefined);
    
    if (hasDeviceInfo) {
        // 현재 수정하려는 차선 ID(id)를 넘겨서, "자기 자신이 사용 중인 것"은 에러로 처리하지 않도록 함
        await validateLaneDevices(data.inIntegratedGateId, data.outIntegratedGateId, id);
    }
    
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
        const hasDeviceInfo = (data.inIntegratedGateId !== undefined || data.outIntegratedGateId !== undefined);

        if (hasDeviceInfo) {
            const deviceIds = [];
            if (data.inIntegratedGateId) deviceIds.push(data.inIntegratedGateId);
            if (data.outIntegratedGateId) deviceIds.push(data.outIntegratedGateId);

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

/**
 * [Helper] 장비 할당 유효성 검사
 * - 1. 장비 존재 여부
 * - 2. 이미 다른 차선에서 사용 중인지 확인
 * - 3. 장비 방향(Direction) 일치 여부 확인
 */
const validateLaneDevices = async (inGateId, outGateId, currentLaneId = null) => {
    const targetIds = [];
    if (inGateId) targetIds.push(inGateId);
    if (outGateId) targetIds.push(outGateId);

    if (targetIds.length === 0) return;

    // 장비 정보 조회
    const devices = await deviceRepository.findAllByIds(targetIds);
    const deviceMap = devices.reduce((acc, cur) => {
        acc[cur.id] = cur;
        return acc;
    }, {});

    // 1. 입구 통합 차단기 검증
    if (inGateId) {
        const device = deviceMap[inGateId];
        if (!device) {
            const err = new Error(`입구 통합 차단기(ID: ${inGateId})를 찾을 수 없습니다.`);
            err.status = 404;
            throw err;
        }

        // 이미 다른 차선이 사용 중인지 (Update 시 자기 자신은 제외)
        if (device.laneId && device.laneId !== currentLaneId) {
            const err = new Error(`장비 '${device.name}'은(는) 이미 다른 차선에 할당되어 있습니다.`);
            err.status = 409;
            throw err;
        }

        // 방향 검사 (IN 이어야 함)
        if (device.direction && device.direction !== 'IN') {
            const err = new Error(`장비 '${device.name}'의 설정 방향(${device.direction})이 입구(IN)와 일치하지 않습니다.`);
            err.status = 400;
            throw err;
        }
    }

    // 2. 출구 통합 차단기 검증
    if (outGateId) {
        const device = deviceMap[outGateId];
        if (!device) {
            const err = new Error(`출구 통합 차단기(ID: ${outGateId})를 찾을 수 없습니다.`);
            err.status = 404;
            throw err;
        }

        if (device.laneId && device.laneId !== currentLaneId) {
            const err = new Error(`장비 '${device.name}'은(는) 이미 다른 차선에 할당되어 있습니다.`);
            err.status = 409;
            throw err;
        }

        // 방향 검사 (OUT 이어야 함)
        if (device.direction && device.direction !== 'OUT') {
            const err = new Error(`장비 '${device.name}'의 설정 방향(${device.direction})이 출구(OUT)와 일치하지 않습니다.`);
            err.status = 400;
            throw err;
        }
    }
};