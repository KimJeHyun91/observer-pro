const ParkingSessionService = require('../../services/parking-session.service');
const { validationResult } = require('express-validator');

class ParkingSessionController {
    constructor() {
        this.parkingSessionService = new ParkingSessionService();
    }

    /**
     * 생성 (입차)
     * POST /api/v1/parking-sessions
     * * [참고] 이 API는 관리자 웹(Frontend)에서 수동 입차 시에만 호출됩니다.
     * 따라서 entrySource를 'ADMIN'으로 고정합니다.
     */
    create = async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error('Validation Error');
                error.status = 400;
                error.data = errors.array();
                throw error;
            }

            // 관리자 웹 전용 API이므로 entrySource를 'ADMIN'으로 강제 주입
            const sessionData = {
                ...req.body,
                entrySource: 'ADMIN' 
            };

            const session = await this.parkingSessionService.create(sessionData);

            res.status(201).json({
                status: 'OK',
                message: '주차 세션이 생성되었습니다. (관리자 수동 입차)',
                data: session
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * 목록 조회
     * GET /api/v1/parking-sessions
     */
    findAll = async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error('Validation Error');
                error.status = 400;
                error.data = errors.array();
                throw error;
            }

            const result = await this.parkingSessionService.findAll(req.query);

            res.status(200).json({
                status: 'OK',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * 상세 조회
     * GET /api/v1/parking-sessions/:id
     */
    findDetail = async (req, res, next) => {
        try {
            const { id } = req.params;
            const session = await this.parkingSessionService.findDetail(id);

            res.status(200).json({
                status: 'OK',
                data: session
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * 수정 (통합 기능: 정보 수정, 출차, 정산)
     * PATCH /api/v1/parking-sessions/:id
     */
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error('Validation Error');
                error.status = 400;
                error.data = errors.array();
                throw error;
            }

            // 수정 요청도 관리자 웹에서 오므로 필요하다면 로그용 출처를 남길 수 있음 (Service 로직에 따름)
            const updatedSession = await this.parkingSessionService.update(id, req.body);

            res.status(200).json({
                status: 'OK',
                message: '주차 세션이 수정되었습니다.',
                data: updatedSession
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new ParkingSessionController();