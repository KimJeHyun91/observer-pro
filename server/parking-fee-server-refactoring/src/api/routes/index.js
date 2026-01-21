const express = require('express');
const router = express.Router();

const errorHandler = require('../middlewares/error-handler');

// =================================================================
// 1. 관리자/운영 시스템용 라우트 임포트
// =================================================================
const siteRoutes = require('./v1/site.routes');
const zoneRoutes = require('./v1/zone.routes');
const laneRoutes = require('./v1/lane.routes');
const deviceControllerRoutes = require('./v1/device-controller.routes');
const deviceRoutes = require('./v1/device.routes');
const memberRoutes = require('./v1/member.routes');
const memberPaymentHistoryRoutes = require('./v1/member-payment-history.routes');
const blacklistRoutes = require('./v1/blacklist.routes');
const holidayRoutes = require('./v1/holiday.routes');
const policyRoutes = require('./v1/policy.routes');
const parkingSessionRoutes = require('./v1/parking-session.routes');
const statisticsRoutes = require('./v1/statistics.routes');

// -----------------------------------------------------------------
// API 정보 및 헬스 체크
// -----------------------------------------------------------------
router.get('/v1/health', (req, res) => {
    res.json({
        service: 'Parking Service',
        status: 'UP',
        version: '1.0.0',
        timeStamp: new Date().toISOString()
    });
});

// -----------------------------------------------------------------
// v1 Router
// -----------------------------------------------------------------
const v1Router = express.Router();

v1Router.use('/sites', siteRoutes);
v1Router.use('/zones', zoneRoutes);
v1Router.use('/lanes', laneRoutes);
v1Router.use('/device-controllers', deviceControllerRoutes);
v1Router.use('/devices', deviceRoutes);
v1Router.use('/members', memberRoutes);
v1Router.use('/member-payment-histories', memberPaymentHistoryRoutes);
v1Router.use('/blacklists', blacklistRoutes);
v1Router.use('/holidays', holidayRoutes);
v1Router.use('/policies', policyRoutes);
v1Router.use('/parking-sessions', parkingSessionRoutes);

v1Router.use('/sites/:id/statistics', statisticsRoutes);

// v1 라우터를 '/v1' 경로에 마운트
router.use('/v1', v1Router);

// -----------------------------------------------------------------
// Parking Fee 모듈 전용 에러 처리 (Isolation)
// -----------------------------------------------------------------
// 1. 404 Not Found 처리 (ParkingFee 경로 내에서 없는 주소 요청 시)
router.use((req, res, next) => {
    const error = new Error(`[ParkingFee] 요청하신 경로(${req.originalUrl})를 찾을 수 없습니다.`);
    error.status = 404;
    next(error);
});

// 2. ParkingFee 전용 에러 핸들러
router.use(errorHandler);

module.exports = router;