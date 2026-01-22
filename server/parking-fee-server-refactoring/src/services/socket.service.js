const logger = require("../../../logger");

/**
 * 소켓 이벤트를 전송하는 공통 함수
 * @param {string} eventName - 소켓 이벤트 명
 * @param {string} logLabel - 로그에 표시할 대상 이름
 */
const emitRefreshSignal = (eventName, logLabel) => {
    if (global.websocket) {
        global.websocket.emit(eventName, { status: 'OK' });
        logger.debug(`[Socket] Sent ${logLabel} refresh signal`);
    } else {
        logger.warn("[Socket] Global websocket is not initialized.");
    }
};

// --- Export Functions ---

// 사이트(Site)
exports.emitSiteRefresh = () => emitRefreshSignal('pf_site-update', 'site');

// 구역(Zone)
exports.emitZoneRefresh = () => emitRefreshSignal('pf_zone-update', 'zone');

// 차선(Lane)
exports.emitLaneRefresh = () => emitRefreshSignal('pf_lane-update', 'lane');

// 장비제어기(Device Controller)
exports.emitDeviceControllerRefresh = () => emitRefreshSignal('pf_device_controller-update', 'device controller');

// 장비(Device)
exports.emitDeviceRefresh = () => emitRefreshSignal('pf_device-update', 'device');

// 블랙리스트(Blacklist)
exports.emitBlacklistRefresh = () => emitRefreshSignal('pf_blacklist-update', 'blacklist');

// 회원(Member)
exports.emitMemberRefresh = () => emitRefreshSignal('pf_member-update', 'member');

// 회원 결제 기록(Member Payment History)
exports.emitMemberPaymentHistoryRefresh = () => emitRefreshSignal('pf_member_payment_history-update', 'member payment history');

// 휴일(Holiday)
exports.emitHolidayRefresh = () => emitRefreshSignal('pf_holiday-update', 'holiday');

// 주차 세션(Parking Session)
exports.emitParkingSessionRefresh = () => emitRefreshSignal('pf_parking_session-update', 'parking session');

// 알림(Alert)
exports.emitAlertRefresh = () => emitRefreshSignal('pf_alert-update', 'alert');