const logger = require('../../../logger');

class DebounceService {
    constructor() {
        // Key: 식별자, Value: 마지막 요청 시간
        this.cache = new Map();

        // [개선] 타이머 폭주 방지를 위해 1분마다 만료된 키 일괄 삭제 (Garbage Collection)
        // setInterval을 사용하여 이벤트 루프 부하를 최소화
        this.cleanupInterval = setInterval(() => this._cleanup(), 60 * 1000);
    }

    /**
     * 중복 요청인지 확인
     * @param {string} key 
     * @param {number} ttlMs (기본 5초)
     */
    canProcess(key, ttlMs = 5000) {
        const now = Date.now();
        const lastTime = this.cache.get(key);

        // 1. 중복 체크
        if (lastTime && (now - lastTime < ttlMs)) {
            return false; // 중복됨
        }

        // 2. 신규 등록 또는 갱신
        this.cache.set(key, now);
        return true; // 처리 가능
    }

    /**
     * [내부 메서드] 만료된 데이터 정리
     * - 1분마다 실행되어 5분 이상 지난 찌꺼기 데이터를 지움
     */
    _cleanup() {
        const now = Date.now();
        const MAX_AGE = 5 * 60 * 1000; // 5분 이상 지난 데이터는 무조건 삭제 (안전장치)

        for (const [key, timestamp] of this.cache.entries()) {
            if (now - timestamp > MAX_AGE) {
                this.cache.delete(key);
            }
        }
        // logger.debug(`[Debounce] 메모리 정리 완료. 현재 키 개수: ${this.cache.size}`);
    }
}

module.exports = DebounceService;