const ParkingSessionService = require('../../services/parking-session.service');

class ParkingSessionController {
    constructor() {
        this.parkingSessionService = ParkingSessionService;
    }

    // =================================================================
    // 1. [생성] Create
    // =================================================================
    create = async (req, res, next) => {
        try {

            req.body.entrySource = 'ADMIN';

            const result = await this.parkingSessionService.create(req.body);
            
            // [통일] 생성된 데이터도 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                message: '주차 세션이 생성되었습니다.',
                data: this._toResponseDTO(result)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 1. [수동 입차] Entry
    // =================================================================
    entry = async (req, res, next) => {
        try {

            req.body.entrySource = 'ADMIN';

            const result = await this.parkingSessionService.entry(req.body);
            
            // [통일] 생성된 데이터도 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                message: '입차 처리가 완료되었습니다.',
                data: this._toResponseDTO(result)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 2. [수동 출차] Process Exit
    // =================================================================
    exit = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.parkingSessionService.processExit(id, req.body);

            // [통일] 출차 처리된 데이터도 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                message: '정상 출차 처리되었습니다.',
                data: result//this._toResponseDTO(result)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 3. [할인 적용] Apply Discount
    // =================================================================
    applyDiscount = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.parkingSessionService.applyDiscount(id, req.body);

            // [통일] 할인 적용된 데이터도 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                message: '할인 정책이 적용되었습니다.',
                data: this._toResponseDTO(result)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 4. [정보 수정] Update Info
    // =================================================================
    updateInfo = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.parkingSessionService.updateInfo(id, req.body);

            // [통일] 수정된 데이터도 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                message: '차량 정보가 수정되었습니다.',
                data: this._toResponseDTO(result)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 5. [목록 조회] Find All
    // =================================================================
    findAll = async (req, res, next) => {
        try {
            const { sessions, meta } = await this.parkingSessionService.findAll(req.query);

            // [통일] 목록의 각 요소도 DTO 포맷으로 변환
            const formattedSessions = sessions.map(session => this._toResponseDTO(session));

            res.status(200).json({
                status: 'OK',
                data: {
                    sessions: formattedSessions,
                    meta: meta
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 6. [상세 조회] Find Detail
    // =================================================================
    findDetail = async (req, res, next) => {
        try {
            const { id } = req.params;
            const session = await this.parkingSessionService.findDetail(id);

            // [통일] 상세 조회도 목록과 동일한 DTO 포맷으로 반환
            res.status(200).json({
                status: 'OK',
                data: this._toResponseDTO(session)
            });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // [Private Helper] 응답 데이터 포맷팅 (DTO Mapper)
    // - 모든 반환값은 이 메서드를 거쳐서 나갑니다.
    // =================================================================
    _toResponseDTO(session) {
        if (!session) return null;
        
        return {
            id: session.id,
            
            // 입차 정보
            entryTime: session.entryTime,
            entryImageUrl: session.entryImageUrl,
            entrySource: session.entrySource,
            
            // 정산 시점 정보
            preSettledAt: session.preSettledAt,

            // 출차 정보
            exitTime: session.exitTime,
            exitImageUrl: session.exitImageUrl,
            exitSource: session.exitSource,

            // 차량 정보
            carNumber: session.carNumber,
            vehicleType: session.vehicleType,

            // 요금 정보
            duration: session.duration,        // 주차 시간 (분)
            totalFee: session.totalFee,        // 총 요금
            discountFee: session.discountFee,  // 할인 총액
            paidFee: session.paidFee,          // 결제된 금액
            appliedDiscounts: session.appliedDiscounts, // 적용된 할인 목록 (배열)

            // 상태 및 메모
            status: session.status,
            note: session.note
            
            // *참고: siteId, laneId 등 내부 ID는 제외됨
        };
    }
}

module.exports = new ParkingSessionController();