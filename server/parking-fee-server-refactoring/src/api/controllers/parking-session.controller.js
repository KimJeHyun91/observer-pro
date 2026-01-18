const ParkingSessionService = require('../../services/parking-session.service');

class ParkingSessionController {
    constructor() {
        this.parkingSessionService = ParkingSessionService;
    }

    // =================================================================
    // 1. [생성] Create (Admin Manual)
    // =================================================================
    create = async (req, res, next) => {
        try {
            req.body.entrySource = 'ADMIN';

            // Service에서 create 후 _attachGateLocation(session, 'IN')이 수행되었다고 가정
            const result = await this.parkingSessionService.create(req.body);
            
            let responseData;
            if (req.body.isMain) {
                // 생성은 입차이므로 Direction = IN 고정
                responseData = this._toMainResponseDTO(result, req.body.direction);
            } else {
                responseData = this._toResponseDTO(result);
            }

            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 2. [입차] Entry (System/LPR)
    // =================================================================
    entry = async (req, res, next) => {
        try {
            req.body.entrySource = 'ADMIN'; // 혹은 요청에 따라 변동

            const result = await this.parkingSessionService.entry(req.body);
            
            let responseData;
            if (req.body.isMain) {
                // 입차 API이므로 Direction = IN 고정
                responseData = this._toMainResponseDTO(result, req.body.direction);
            } else {
                responseData = this._toResponseDTO(result);
            }

            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 3. [출차] Process Exit
    // =================================================================
    exit = async (req, res, next) => {
        try {
            const { id } = req.params;

            const result = await this.parkingSessionService.processExit(id, req.body);

            let responseData;
            if (req.body.isMain) {
                // 출차 API이므로 Direction = OUT 고정
                responseData = this._toMainResponseDTO(result, req.body.direction);
            } else {
                responseData = this._toResponseDTO(result);
            }

            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 4. [할인 적용] Apply Discount
    // =================================================================
    applyDiscount = async (req, res, next) => {
        try {
            const { id } = req.params;
            

            const result = await this.parkingSessionService.applyDiscount(id, req.body);

            let responseData;
            if (req.body.isMain) {
                responseData = this._toMainResponseDTO(result, req.body.direction);
            } else {
                responseData = this._toResponseDTO(result);
            }
            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 5. [정보 수정] Update Info
    // =================================================================
    updateInfo = async (req, res, next) => {
        try {
            const { id } = req.params;

            const result = await this.parkingSessionService.updateInfo(id, req.body);

            let responseData;
            if (req.body.isMain) {
                responseData = this._toMainResponseDTO(result, req.body.direction);
            } else {
                responseData = this._toResponseDTO(result);
            }
            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 6. [목록 조회] Find All
    // =================================================================
    findAll = async (req, res, next) => {
        try {            
            const { sessions, meta } = await this.parkingSessionService.findAll(req.query);

            let responseData;

            const formattedSessions = sessions.map(session => this._toResponseDTO(session));

            responseData = {
                sessions: formattedSessions,
                meta: meta
            };

            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // 7. [상세 조회] Find Detail
    // =================================================================
    findDetail = async (req, res, next) => {
        try {
            const { id } = req.params;

            const session = await this.parkingSessionService.findDetail(id, req.query.direction, req.query.isMain);

            let responseData;
            if (req.query.isMain) {
                responseData = this._toMainResponseDTO(session, req.query.direction);
            } else {
                responseData = this._toResponseDTO(session);
            }
            res.status(200).json({ status: 'OK', data: responseData });
        } catch (error) {
            next(error);
        }
    };

    // =================================================================
    // [Private Helper] Main Response DTO (New Custom Format)
    // =================================================================
    _toMainResponseDTO(session, direction) {
        if (!session) return null;

        const isEntry = direction === 'IN';
        
        // 1. 입차/출차 여부에 따라 주요 데이터 매핑
        const eventTime = isEntry ? session.entryTime : session.exitTime;
        const imageUrl = isEntry ? session.entryImageUrl : session.exitImageUrl;
        
        // 2. Location (Service에서 주입한 gateLocation 우선, 없으면 Lane Name)
        // Service에서 _attachGateLocation을 통해 gateLocation을 채워줬다고 가정합니다.
        let location = session.gateLocation; 
        if (!location) {
             location = isEntry ? session.entryLaneName : session.exitLaneName;
        }

        // 3. 할인 정책 ID 목록
        const discountPolicyIds = (session.appliedDiscounts || [])
            .map(d => d.policyId)
            .filter(id => id);
        // 4. 구조 생성
        return {
            direction: direction, // "IN" or "OUT"
            siteId: session.siteCode || session.siteId,
            
            // DB 세션 테이블에 없는 정보 (필요시 Service Join 필요)
            deviceIp: null, 
            devicePort: 0, 

            imageUrl: imageUrl || null,
            eventTime: session.entryTime  ? new Date(session.entryTime ).toISOString() : null,
            
            // [중요] INTEGRATED_GATE 위치 정보 (없으면 LaneName)
            location: location || 'Unknown',
            
            carNumber: session.carNumber,
            vehicleType: session.vehicleType,
            
            totalFee: session.totalFee || 0,
            discountPolicyIds: discountPolicyIds,
            discountFee: session.discountFee || 0,
            
            // 기결제 금액 (사전 정산 포함)
            preSettledFee: session.paidFee || 0, 
            
            isBlacklist: false, // 별도 조회 필요
            parkingSessionId: session.id
        };
    }

    // =================================================================
    // [Private Helper] Standard Response DTO (Existing Format)
    // =================================================================
    _toResponseDTO(session) {
        if (!session) return null;        
        
        return {
            id: session.id,
            
            // 입차 정보
            entryTime: session.entryTime,
            entryImageUrl: session.entryImageUrl,
            entrySource: session.entrySource,
            entryLaneName: session.entryLaneName,
            
            // 정산 시점 정보
            preSettledAt: session.preSettledAt,

            // 출차 정보
            exitTime: session.exitTime,
            exitImageUrl: session.exitImageUrl,
            exitSource: session.exitSource,
            exitLaneName: session.exitLaneName,

            // 차량 정보
            carNumber: session.carNumber,
            vehicleType: session.vehicleType,

            // 요금 정보
            duration: session.duration,
            totalFee: session.totalFee,
            discountFee: session.discountFee,
            paidFee: session.paidFee,
            appliedDiscounts: session.appliedDiscounts,

            // 상태 및 기타
            status: session.status,
            note: session.note,
            
            // Service에서 gateLocation을 가져왔다면 기존 포맷에도 포함 가능 (선택사항)
            gateLocation: session.gateLocation || undefined
        };
    }
}

module.exports = new ParkingSessionController();