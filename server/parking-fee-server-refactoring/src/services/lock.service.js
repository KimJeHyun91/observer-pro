const Redis = require('ioredis');
const logger = require('../../../logger');

// Redis 클라이언트 설정
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'admin1234',
});

// [상수] 락 만료 시간 (30초)
// - 클라이언트는 이보다 짧은 주기(예: 10초)로 Heartbeat를 보내야 함
const LOCK_TTL_SECONDS = 30;

/**
 * [Internal] Redis 키 생성 헬퍼
 */
const _getKey = (resourceKey) => `lock:${resourceKey}`;

/**
 * 1. 락 획득 (Acquire) - SET NX
 * @param {string} resourceKey - 예: "parking-session:uuid"
 * @param {string} ownerId - 운영자 ID
 * @param {string} ownerName - 운영자 이름 (UI 표시용)
 * @returns {Promise<boolean>} 성공 여부
 */
exports.acquireLock = async (resourceKey, ownerId, ownerName) => {
    const key = _getKey(resourceKey);
    
    // 저장할 메타데이터
    const value = JSON.stringify({
        ownerId,
        ownerName,
        lockedAt: new Date().toISOString()
    });

    try {
        // SET key value NX(Not Exists) EX(Expire) ttl
        // 키가 없을 때만 저장하고, 30초 후 자동 삭제
        const result = await redis.set(key, value, 'NX', 'EX', LOCK_TTL_SECONDS);
        
        if (result === 'OK') {
            return true;
        } else {
            // 이미 락이 존재함 -> 누가 갖고 있는지 확인하여 로그 남김 (선택사항)
            const current = await exports.getLockStatus(resourceKey);
            logger.debug(`Lock failed. Owned by: ${current?.ownerName}`);
            return false;
        }
    } catch (error) {
        logger.error(`[LockService] acquireLock Error: ${error.message}`);
        throw error; // Redis 연결 에러 등은 상위로 전파
    }
};

/**
 * 2. 락 연장 (Extend / Heartbeat)
 * - 락이 존재하고, 주인이 나(ownerId)일 때만 TTL 초기화
 * @returns {Promise<boolean>} 성공 여부
 */
exports.extendLock = async (resourceKey, ownerId) => {
    const key = _getKey(resourceKey);

    try {
        // 1. 현재 값 조회
        const currentValue = await redis.get(key);
        
        if (!currentValue) {
            return false; // 락이 이미 만료됨
        }

        // 2. 주인 확인
        const parsed = JSON.parse(currentValue);
        if (parsed.ownerId !== ownerId) {
            return false; // 주인이 바뀜 (다른 사람이 획득함)
        }

        // 3. TTL 초기화 (다시 30초 부여)
        await redis.expire(key, LOCK_TTL_SECONDS);
        
        return true;
    } catch (error) {
        logger.error(`[LockService] extendLock Error: ${error.message}`);
        return false;
    }
};

/**
 * 3. 락 해제 (Release)
 * - 주인이 나일 때만 삭제
 */
exports.releaseLock = async (resourceKey, ownerId) => {
    const key = _getKey(resourceKey);

    try {
        const currentValue = await redis.get(key);
        
        if (!currentValue) return true; // 이미 없으면 성공으로 간주

        const parsed = JSON.parse(currentValue);
        
        // 내 락일 때만 삭제
        if (parsed.ownerId === ownerId) {
            await redis.del(key);
            return true;
        }

        // 다른 사람의 락이면 삭제하지 않음 (강제 해제 기능이 필요하다면 별도 구현)
        logger.warn(`[LockService] Release failed. Owner mismatch. (Requester: ${ownerId}, Owner: ${parsed.ownerId})`);
        return false;

    } catch (error) {
        logger.error(`[LockService] releaseLock Error: ${error.message}`);
        throw error;
    }
};

/**
 * 4. 단일 락 상태 조회
 * @returns {Promise<object|null>} { ownerId, ownerName, lockedAt }
 */
exports.getLockStatus = async (resourceKey) => {
    const key = _getKey(resourceKey);
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
};

/**
 * 5. [Bulk] 여러 리소스의 락 상태 조회
 * - 목록 조회(findAll) 시 N개의 세션에 대한 락 정보를 한 번에 가져올 때 사용
 * @param {Array<string>} resourceKeys - ["parking-session:A", "parking-session:B"]
 * @returns {Promise<Array<object|null>>} 순서대로 매핑된 락 정보 배열
 */
exports.getManyLocks = async (resourceKeys) => {
    if (!resourceKeys || resourceKeys.length === 0) return [];

    const keys = resourceKeys.map(_getKey);

    try {
        // MGET으로 한 번에 조회 (성능 최적화)
        const values = await redis.mget(keys);

        return values.map(val => val ? JSON.parse(val) : null);
    } catch (error) {
        logger.error(`[LockService] getManyLocks Error: ${error.message}`);
        // 에러 시 전체 락 정보 없음으로 처리 (목록 조회 자체는 성공시키기 위해)
        return new Array(resourceKeys.length).fill(null);
    }
};