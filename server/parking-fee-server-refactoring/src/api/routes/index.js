const express = require('express');
const router = express.Router();

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
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            management: '/{prefix}/v1/{resource}',
            pls_integration: '/{prefix}/{resource}'
        }
    });
});

// -----------------------------------------------------------------
// A. [Group 1] 운영/관리자용 API (v1 Router)
// URL Pattern: /api/parkingFee/v1/...
// -----------------------------------------------------------------
const v1Router = express.Router();

// 1. 기초 정보 관리 (Infrastructure)
v1Router.use('/sites', siteRoutes);
v1Router.use('/zones', zoneRoutes);
v1Router.use('/lanes', laneRoutes);
v1Router.use('/device-controllers', deviceControllerRoutes);
v1Router.use('/devices', deviceRoutes);

// 2. 운영 정보 관리 (Operation)
v1Router.use('/members', memberRoutes);
v1Router.use('/member-payment-histories', memberPaymentHistoryRoutes);
v1Router.use('/blacklists', blacklistRoutes);
v1Router.use('/holidays', holidayRoutes);
v1Router.use('/policies', policyRoutes);
v1Router.use('/parking-sessions', parkingSessionRoutes);

v1Router.use('/', statisticsRoutes);

// v1 라우터를 '/v1' 경로에 마운트
router.use('/v1', v1Router);

module.exports = router;