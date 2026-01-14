const PlsService = require('./pls.service');
const logger = require('../../../../logger');

/**
 * ==============================================================================
 * PLS (Parking Lot System) 장비 연동 컨트롤러
 * ------------------------------------------------------------------------------
 * 역할: 
 * 1. 장비(LPR, 정산기, 키오스크)로부터 HTTP 요청을 수신합니다.
 * 2. 장비 타임아웃 방지를 위해 **즉시 HTTP 200 OK**를 응답합니다. (Ack)
 * 3. 실제 비즈니스 로직은 Service Layer로 위임하여 비동기(Background)로 처리합니다.
 * ==============================================================================
 */
class PlsController {

    constructor() {
        this.plsService = new PlsService();
    }

    /**
     * 1. LPR(차량 번호 인식) 데이터 수신
     * [POST] /api/parkingFee/receive/lpr
     */
    receiveLprData = async (req, res, next) => {
        try {
            console.log('11111111111111111111 {}' + res.body.kind);

            // [중요] 장비에게 즉시 성공 응답 전송 (Time-out 방지)
            res.status(200).json({ status: 'ok', message: '' });
            

            // 비즈니스 로직 실행 (응답 후 백그라운드 처리)
            // 에러가 발생해도 장비 통신에는 영향을 주지 않도록 내부에서 로그 처리
            this.plsService.processLprData(req.body).catch(err => {
                logger.error(`[PLS Controller] LPR Logic Error: ${err.message}`);
            });

        } catch (error) {
            // 응답 전송 전(코드 레벨) 에러 발생 시에만 여기서 처리
            logger.error(`[PLS Controller] LPR Request Error: ${error.message}`);
            if (!res.headersSent) {
                res.status(200).json({ status: 'ng', message: error.message });
            }
        }
    }

    /**
     * 2. 차단기 상태 변경 이벤트 수신 (Up/Down)
     * [POST] /api/parkingFee/receive/gate_state
     */
    handleGateStateEvent = async (req, res, next) => {
        try {

            // [중요] 즉시 응답
            res.status(200).json({ status: 'ok', message: '' });

            // 상태 업데이트 로직 호출
            this.plsService.updateGateStatus(req.body).catch(err => {
                logger.error(`[PLS Controller] Gate Logic Error: ${err.message}`);
            });

        } catch (error) {
            logger.error(`[PLS Controller] Gate Request Error: ${error.message}`);
            if (!res.headersSent) {
                res.status(200).json({ status: 'ng', message: error.message });
            }
        }
    }

    /**
     * 3. 결제 및 정산 관련 이벤트 통합 수신
     * [POST] /api/parkingFee/receive/payment
     * - cmd: PARK_FEE_DONE (결제 완료), PARK_FEE_RECALC (할인권 투입) 등
     */
    handlePaymentResult = async (req, res, next) => {
        try {
            const body = req.body;
            
            // [중요] 즉시 응답
            res.status(200).json({ status: 'ok', message: '' });

            // 명령어(cmd)에 따른 분기 처리 (비동기)
            const handleLogic = async () => {
                switch (body.cmd) {
                    case 'PARK_FEE_DONE': // 결제 완료 통보
                        await this.plsService.processPaymentSuccess(body);
                        break;
                    
                    case 'PARK_FEE_RECALC': // 할인권 투입 (재계산 요청)
                        await this.plsService.processCouponInput(body);
                        break;

                    // 필요 시 PARK_SEARCH_RESULT 등 추가 처리
                    default:
                        logger.debug(`[PLS Controller] Unhandled Payment Cmd: ${body.cmd}`);
                        break;
                }
            };

            // 로직 실행 및 에러 로깅
            handleLogic().catch(err => {
                logger.error(`[PLS Controller] Payment Logic Error (${body.cmd}): ${err.message}`);
            });

        } catch (error) {
            logger.error(`[PLS Controller] Payment Request Error: ${error.message}`);
            if (!res.headersSent) {
                res.status(200).json({ status: 'ng', message: error.message });
            }
        }
    }

    /**
     * 4. 사전 정산기 차량 검색 요청
     * [POST] /api/parkingFee/receive/park_car_search
     * - 키오스크에서 차량번호 4자리 입력 시 호출
     */
    handleCarSearchRequest = async (req, res, next) => {
        try {
            const { searchkey, location, ip, port, cmd } = req.body;

            // [규격] 즉시 OK 응답
            // (실제 검색 결과는 서버가 별도 API(/payment - PARK_SEARCH_RESULT)로 장비에게 전송해야 함)
            res.status(200).json({ status: 'ok', message: '' });

            if (cmd === 'PARK_CAR_SEARCH') {
                // 비동기로 검색 및 결과 전송 수행
                this.plsService.searchCarAndReply({
                    searchKey: searchkey,       // 차량번호 4자리
                    targetLocation: location,   // 장비 위치명
                    targetIp: ip,
                    targetPort: port
                }).catch(err => {
                    logger.error(`[PLS Controller] Search Logic Error: ${err.message}`);
                });
            }

        } catch (error) {
            logger.error(`[PLS Controller] Search Request Error: ${error.message}`);
            if (!res.headersSent) {
                res.status(200).json({ status: 'ng', message: error.message });
            }
        }
    }
}

module.exports = new PlsController();