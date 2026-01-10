const ParkingSessionService = require('../../services/parking-session.service');
const { validationResult } = require('express-validator');

class ParkingSessionController {
    constructor() {
        this.parkingSessionService = new ParkingSessionService();
    }

    /**
     * 생성 (입차)
     * POST /api/v1/parking-sessions
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

            const session = await this.parkingSessionService.create(req.body);

            res.status(201).json({
                status: 'OK',
                message: '주차 세션이 생성되었습니다. (입차)',
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
            // express-validator의 query 유효성 검사 결과 확인
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
            
            // Validation 확인
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = new Error('Validation Error');
                error.status = 400;
                error.data = errors.array();
                throw error;
            }

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

module.exports = new ParkingSessionController(); // 싱글톤 인스턴스 반환