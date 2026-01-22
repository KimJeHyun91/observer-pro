const parkingSessionRepository = require('../repositories/parking-session.repository');
const siteRepository = require('../repositories/site.repository');
const policyRepository = require('../repositories/policy.repository');
const laneRepository = require('../repositories/lane.repository');
const zoneRepository = require('../repositories/zone.repository');
const lockService = require('./lock.service'); 
const feeService = require('./fee.service');
const parkingProcessService = require('./parking-process.service');
const logger = require('../../../logger');

// [상수] 종료된 세션 상태 목록 (핵심 정보 수정 불가)
const TERMINAL_STATUSES = ['COMPLETED', 'FORCE_COMPLETED', 'CANCELED', 'RUNAWAY'];

// =================================================================
// [Private Helper] 락 소유권 방어 로직 (Strict Mode)
// =================================================================
const _ensureLockOwnership = async (parkingSssionId, operatorId) => {
    const lockInfo = await lockService.getLockStatus(`parking-session:${parkingSssionId}`);
    
    // 1. [Strict] 락이 아예 없으면 에러 (반드시 점유 후 수정)
    if (!lockInfo) {
        const error = new Error('수정 권한이 없습니다. 먼저 편집 모드(점유)로 진입해주세요.');
        error.code = 'LOCK_REQUIRED';
        error.status = 428; // 428 Precondition Required (또는 403 Forbidden)
        throw error;
    }

    // 2. 락은 있는데 주인이 내가 아니면 에러
    if (lockInfo.ownerId !== operatorId) {
        const error = new Error(`현재 ${lockInfo.ownerName}님이 작업 중인 세션입니다.`);
        error.code = 'RESOURCE_LOCKED';
        error.status = 409; // Conflict
        throw error;
    }
};

/**
 * [Helper] 차선 ID로 차선+구역 정보를 모두 조회하여 타겟 객체에 매핑
 * @param {string} laneId - 입력받은 차선 ID
 * @param {string} type - 'ENTRY' 또는 'EXIT'
 * @param {object} targetObject - 데이터를 채워 넣을 객체 (req.body 등)
 */
const _fillLaneInfo = async (laneId, type, targetObject) => {
    if (!laneId) return;

    // 1. 차선(Lane) 조회
    const lane = await laneRepository.findById(laneId);
    if (!lane) throw new Error('존재하지 않는 차선(Lane)입니다.');

    // 2. 구역(Zone) 조회
    const zone = await zoneRepository.findById(lane.zoneId);
    if (!zone) throw new Error('차선에 연결된 구역(Zone)을 찾을 수 없습니다.');

    // 3. 접두사 설정 (entry_ 또는 exit_)
    const prefix = type === 'ENTRY' ? 'entry' : 'exit';

    // 4. 데이터 스냅샷 채우기 (DB 컬럼명과 매핑될 카멜케이스 속성)
    targetObject[`${prefix}LaneId`] = lane.id;
    targetObject[`${prefix}LaneName`] = lane.name;
    targetObject[`${prefix}LaneCode`] = lane.code || null;

    targetObject[`${prefix}ZoneId`] = zone.id;
    targetObject[`${prefix}ZoneName`] = zone.name;
    targetObject[`${prefix}ZoneCode`] = zone.code || null;
};

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

    if (params.siteId) filters.siteId = params.siteId;                      // 사이트 ID 검색
    if (params.carNumber)   filters.carNumber = params.carNumber;           // 차량번호 검색
    if (params.startTime)   filters.startTime = params.startTime;           // 시작 시간 검색
    if (params.endTime)   filters.endTime = params.endTime;                 // 종료 시간 검색
    if (params.entrySource)   filters.entrySource = params.entrySource;     // 입차 행위 주체 검색
    if (params.exitSource)   filters.exitSource = params.exitSource;        // 출차 행위 주체 검색
    if (params.entryLaneId)   filters.entryLaneId = params.entryLaneId;     // 입차 차선 ID 검색
    if (params.exitLaneId)   filters.exitLaneId = params.exitLaneId;        // 출차 차선 ID 검색
    if (params.statuses)   filters.statuses = params.statuses;              // 상태들 검색

    // 3. 정렬 옵션 (Allowlist)
    const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'carNumber', 'siteId'];
    let sortBy = params.sortBy || 'createdAt';
    
    // 허용되지 않은 정렬 키 방어
    if (!ALLOWED_SORTS.includes(sortBy)) {
        sortBy = 'createdAt';
    }

    const sortOrder = (params.sortOrder && params.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    const sortOptions = { sortBy, sortOrder };

    // 4. Repository 호출
    const { rows, count } = await parkingSessionRepository.findAll(filters, sortOptions, limit, offset);

    const parkingSessionKeys = rows.map(parkingSession => `parking-session:${parkingSession.id}`);
    const locks = await lockService.getManyLocks(parkingSessionKeys);

    const mergedParkingSessions = rows.map((parkingSession, index) => ({
        ...parkingSession,
        lock: locks[index]
    }));

    return {
        parkingSessions: mergedParkingSessions,
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
    const parkingSession = await parkingSessionRepository.findById(id);
    
    if (!parkingSession) {
        const err = new Error('해당 구역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    const lock = await lockService.getLockStatus(`parking-session:${id}`);

    return { ...parkingSession, lock };
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    const site = await siteRepository.findById(data.siteId);
    if (!site) {
        const error = new Error('존재하지 않는 사이트입니다.');
        error.status = 404;
        throw error;
    }

    // 입차 차선 정보가 있으면 Zone/Lane 상세 정보 모두 채움
    if (data.entryLaneId) {
        await _fillLaneInfo(data.entryLaneId, 'ENTRY', data);
    }
    
    return await parkingSessionRepository.create({
        ...data,
        siteName: site.name,
        siteCode: site.code,
        entrySource: 'ADMIN',
        status: 'PENDING'
    });
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data, operator) => {
    // 점유 상태 필수 확인
    await _ensureLockOwnership(id, operator.user_id);

    const parkingSession = await parkingSessionRepository.findById(id);
    if (!parkingSession) {
        const error = new Error('주차 세션을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }

    // 1. [방어] 이미 종료된 세션의 핵심 정보 수정 차단
    if (TERMINAL_STATUSES.includes(parkingSession.status)) {
        if (data.carNumber || data.vehicleType || data.entryTime || data.status) {
            const error = new Error(`이미 종료된 세션(${parkingSession.status})의 핵심 정보는 수정할 수 없습니다.`);
            error.status = 400;
            throw error;
        }
    }

    const updatePayload = {};

    // A. 메모 수정 (종료 여부와 관계없이 항상 가능)
    if (data.note !== undefined) updatePayload.note = data.note;

    // B. 핵심 정보 수정 (종료되지 않은 세션만 진입)
    if (!TERMINAL_STATUSES.includes(parkingSession.status)) {
        let needRecalculate = false;
        let newEntryTime = parkingSession.entryTime;
        let newVehicleType = parkingSession.vehicleType;

        if (data.carNumber) updatePayload.carNumber = data.carNumber;
        
        if (data.entryTime && new Date(data.entryTime).getTime() !== new Date(parkingSession.entryTime).getTime()) {
            updatePayload.entryTime = data.entryTime;
            newEntryTime = new Date(data.entryTime);
            needRecalculate = true;
        }
        
        if (data.vehicleType && data.vehicleType !== parkingSession.vehicleType) {
            updatePayload.vehicleType = data.vehicleType;
            newVehicleType = data.vehicleType;
            needRecalculate = true;
        }

        // C. 요금 재계산
        if (needRecalculate) {
            const feeResult = await feeService.calculate({
                entryTime: newEntryTime,
                exitTime: new Date(),
                vehicleType: newVehicleType,
                siteId: parkingSession.siteId,
                appliedDiscounts: parkingSession.appliedDiscounts || [],
                paidFee: parkingSession.paidFee || 0
            });

            updatePayload.totalFee = feeResult.totalFee;
            updatePayload.duration = feeResult.durationMinutes;
            updatePayload.discountFee = feeResult.discountFee;
            updatePayload.appliedDiscounts = feeResult.appliedDiscounts; 
            updatePayload.remainingFee = feeResult.remainingFee;
        }

        // D. 상태 변경 (취소/도주 처리)
        if (data.status) {
            updatePayload.status = data.status;
            
            if (data.status === 'CANCELED') {
                updatePayload.totalFee = 0;
                updatePayload.discountFee = 0;
                updatePayload.paidFee = 0;
                updatePayload.note = (updatePayload.note || parkingSession.note || '') + ' [관리자 취소 처리]';
            }
        }
    }

    // 수정할 내용이 없으면 (예: 종료된 세션인데 핵심정보만 보내서 위에서 걸러진 경우 등) 바로 리턴하거나 에러
    if (Object.keys(updatePayload).length === 0) {
        return parkingSession; 
    }

    // E. DB 업데이트
    const updatedSession = await parkingSessionRepository.update(id, updatePayload);

    return updatedSession;
};

/**
 * 수동 입차
 */
exports.entry = async (data) => {
    const site = await siteRepository.findById(data.siteId);
    if (!site) {
        const error = new Error('존재하지 않는 사이트입니다.');
        error.status = 404;
        throw error;
    }

    // 입차 차선 정보가 있으면 Zone/Lane 상세 정보 모두 채움
    if (data.entryLaneId) {
        await _fillLaneInfo(data.entryLaneId, 'ENTRY', data);
    }

    // 1. DB 생성
    const newSession = await parkingSessionRepository.create({
        ...data,
        siteName: site.name,
        siteCode: site.code,
        entrySource: 'ADMIN',
        status: 'PENDING'
    });

    // 2. ProcessService에게 차단기 개방 요청
    await parkingProcessService.openGate(data.entryLaneId);

    return newSession;
};

/**
 * 수동 출차
 */
exports.processExit = async (id, data, operator) => {
    // 점유 상태 필수 확인
    await _ensureLockOwnership(id, operator.user_id);

    const session = await parkingSessionRepository.findById(id);
    if (!session) throw new Error('세션을 찾을 수 없습니다.');

    const exitData = {
        exitTime: data.exitTime ? new Date(data.exitTime) : new Date(),
        exitSource: 'ADMIN',
        note: data.note
    };

    if (data.exitLaneId) {
        await _fillLaneInfo(data.exitLaneId, 'EXIT', exitData);
    }

    // 1. 요금 계산
    const feeResult = await feeService.calculate({
        entryTime: session.entryTime,
        exitTime: exitData.exitTime,
        vehicleType: session.vehicleType,
        siteId: session.siteId,
        appliedDiscounts: session.appliedDiscounts || [],
        paidFee: session.paidFee || 0 
    });

    // 2. 데이터 병합
    Object.assign(exitData, {
        duration: feeResult.durationMinutes,
        totalFee: feeResult.totalFee,
        discountFee: feeResult.discountFee,
        paidFee: session.paidFee || 0,
        remainingFee: feeResult.remainingFee,
        status: data.force ? 'FORCE_COMPLETED' : 'COMPLETED'
    });

    // 3. DB 업데이트
    const updatedSession = await parkingSessionRepository.update(id, exitData);

    // 4. 차단기 개방
    if (data.exitLaneId) {
        await parkingProcessService.openGate(data.exitLaneId);
    }

    // 5. 락 해제
    await lockService.releaseLock(`parking-session:${id}`, operator.id);

    return updatedSession;
};

/**
 * 할인 적용
 */
exports.applyDiscount = async (id, data, operator) => {
    // 점유 상태 필수 확인
    await _ensureLockOwnership(id, operator.user_id);

    const session = await parkingSessionRepository.findById(id);
    if (!session) {
        const error = new Error('주차 세션을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }

    // [방어] 종료된 세션 할인 불가
    if (TERMINAL_STATUSES.includes(session.status)) {
        const error = new Error('이미 종료된 세션에는 할인을 적용할 수 없습니다.');
        error.status = 400;
        throw error;
    }

    // 1. 정책 조회
    const policy = await policyRepository.findById(data.policyId);
    if (!policy || policy.siteId !== session.siteId) {
        const error = new Error('유효하지 않은 할인 정책입니다.');
        error.status = 400; // or 404
        throw error;
    }

    // 2. 할인 목록 갱신 
    const currentDiscounts = session.appliedDiscounts || [];
    const newDiscount = {
        policyId: policy.id,
        name: policy.name,
        type: policy.type,
        value: policy.value,
        appliedAt: new Date(),
        note: data.note
    };
    const nextDiscounts = [...currentDiscounts, newDiscount];

    // 3. 요금 재계산 (FeeService 위임)
    const feeResult = await feeService.calculate({
        entryTime: session.entryTime,
        exitTime: new Date(),
        vehicleType: session.vehicleType,
        siteId: session.siteId,
        appliedDiscounts: nextDiscounts,
        paidFee: session.paidFee || 0 
    });

    // 4. DB 업데이트
    const updatedSession = await parkingSessionRepository.update(id, {
        appliedDiscounts: feeResult.appliedDiscounts,
        totalFee: feeResult.totalFee,
        discountFee: feeResult.discountFee,
        duration: feeResult.durationMinutes,
        remainingFee: feeResult.remainingFee
    });

    return updatedSession;
};