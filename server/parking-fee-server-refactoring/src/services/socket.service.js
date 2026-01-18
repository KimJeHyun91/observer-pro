const logger = require("../../../logger");

// 사이트(Site) 목록 갱신 신호 (Ping)
exports.emitSiteRefresh = () => {
    if (global.websocket) {
        global.websocket.emit("pf_site-update");
        logger.debug("[Socket] Sent site refresh signal");
    } else {
        logger.warn("[Socket] Global websocket is not initialized.");
    }
};

// 구역(Zone) 목록 갱신 신호 (Ping)
exports.emitZoneRefresh = () => {
    if (global.websocket) {
        global.websocket.emit("pf_zone-update");
        logger.debug("[Socket] Sent zone refresh signal");
    } else {
        logger.warn("[Socket] Global websocket is not initialized.");
    }
};

// 차선(Lane) 목록 갱신 신호 (Ping)
exports.emitLaneRefresh = () => {
    if (global.websocket) {
        global.websocket.emit("pf_lane-update");
        logger.debug("[Socket] Sent lane refresh signal");
    } else {
        logger.warn("[Socket] Global websocket is not initialized.");
    }
};