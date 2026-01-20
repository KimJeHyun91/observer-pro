const plsService = require('./pls.service');
const logger = require('../../../../logger');

/**
 * ==============================================================================
 * PLS Device Controller
 * ------------------------------------------------------------------------------
 * 핵심 원칙:
 * 1. 장비(Client)에게는 무조건 즉시 HTTP 200 OK를 응답합니다. (Timeout 방지)
 * 2. 실제 비즈니스 로직(Service)은 응답 후 비동기(Background)로 실행합니다.
 * 3. Service에서 발생한 에러는 장비 응답에 영향을 주지 않고 로그로만 남깁니다.
 * ==============================================================================
 */

/**
 * 1. LPR(차량 번호 인식) 데이터 수신
 * [POST] /lpr
 */
exports.receiveLprData = (req, res) => {
    try {
        console.log('LPR 차량 번호 인식: ', req.body);

        // 1. 장비에게 즉시 성공 응답 (Ack)
        res.status(200).json({ status: 'ok', message: '' });

        // 2. 비즈니스 로직 실행 (비동기 처리)
        // await를 쓰지 않고 Promise 체인으로 에러만 잡습니다.
        plsService.processLprData(req.body)
            .catch(err => {
                logger.error(`[PLS Controller] LPR Logic Error: ${err.message}`);
            });

    } catch (error) {
        // 응답 전송 단계에서 에러가 난 경우에만 실행됨
        logger.error(`[PLS Controller] LPR Request Error: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ status: 'ng', message: 'Internal Server Error' });
        }
    }
};

/**
 * 2. 차단기 상태 변경 이벤트 수신
 * [POST] /gate_state
 */
exports.handleGateStateEvent = (req, res) => {
    try {
        console.log('차단기 상태 변경 이벤트: ', req.body);
        // 1. Ack
        res.status(200).json({ status: 'ok', message: '' });

        // 2. Logic
        plsService.updateGateStatus(req.body)
            .catch(err => {
                logger.error(`[PLS Controller] Gate Logic Error: ${err.message}`);
            });

    } catch (error) {
        logger.error(`[PLS Controller] Gate Request Error: ${error.message}`);
        if (!res.headersSent) res.status(500).json({ status: 'ng' });
    }
};

/**
 * 3. 결제 및 정산 관련 이벤트 통합 수신
 * [POST] /payment
 * - cmd: PARK_FEE_DONE (결제 완료), PARK_FEE_RECALC (할인권 투입) 등
 */
exports.handlePaymentResult = (req, res) => {
    try {
        console.log('결제 및 정산 관련 이벤트: ', req.body);

        const body = req.body;
        
        // 1. Ack
        res.status(200).json({ status: 'ok', message: '' });

        // 2. Logic 분기 (비동기 헬퍼 함수)
        const runLogic = async () => {
            switch (body.cmd) {
                case 'PARK_FEE_DONE': // 결제 완료
                    await plsService.processPaymentSuccess(body);
                    break;
                
                // case 'PARK_FEE_RECALC': // 할인권 등 추가 구현 시
                //     await plsService.processCouponInput(body);
                //     break;

                default:
                    logger.debug(`[PLS Controller] Unhandled Payment Cmd: ${body.cmd}`);
                    break;
            }
        };

        // 실행 및 에러 핸들링
        runLogic().catch(err => {
            logger.error(`[PLS Controller] Payment Logic Error (${body.cmd}): ${err.message}`);
        });

    } catch (error) {
        logger.error(`[PLS Controller] Payment Request Error: ${error.message}`);
        if (!res.headersSent) res.status(500).json({ status: 'ng' });
    }
};

/**
 * 4. 사전 정산기 차량 검색 요청
 * [POST] /park_car_search
 */
exports.handleCarSearchRequest = (req, res) => {
    try {
        console.log('결제 및 정산 관련 이벤트: ', req.body);

        const { searchkey, location, ip, port, cmd } = req.body;

        // 1. Ack (검색 결과는 별도 API로 장비에게 쏴주는 방식이므로 여기선 OK만 리턴)
        res.status(200).json({ status: 'ok', message: '' });

        // 2. Logic
        if (cmd === 'PARK_CAR_SEARCH') {
            plsService.searchCarAndReply({
                searchKey: searchkey,       // 차량번호 4자리
                targetLocation: location,   // 요청 장비 위치
                targetIp: ip,
                targetPort: port
            }).catch(err => {
                logger.error(`[PLS Controller] Search Logic Error: ${err.message}`);
            });
        }

    } catch (error) {
        logger.error(`[PLS Controller] Search Request Error: ${error.message}`);
        if (!res.headersSent) res.status(500).json({ status: 'ng' });
    }
};