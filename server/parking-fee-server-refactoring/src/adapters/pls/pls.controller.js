const plsService = require('./pls.service');
const logger = require('../../../../logger');

class PlsController {

    /**
     * 1. LPR(차량 번호 인식) 데이터 수신
     * URL: POST /api/parkingFee/receive/lpr
     */
    receiveLprData = async (req, res, next) => {
        try {
            // [규격 준수] 장비에게 즉시 성공 응답 전송 (비동기 로직 결과 대기 안 함)
            // 응답이 늦으면 장비에서 타임아웃 발생 가능성 있음
            res.status(200).json({ status: 'ok', message: '' });

            // 서비스 로직 실행
            // (에러가 발생해도 위에서 이미 응답을 보냈으므로 장비 통신에는 영향 없음)
            await plsService.processLprData(req.body);

        } catch (error) {
            logger.error(`[PLS Controller] LPR Data Error: ${error.message}`);
            // 만약 응답을 아직 안 보냈다면 에러 응답
            if (!res.headersSent) {
                res.status(200).json({ status: 'ng', message: error.message });
            }
        }
    }

    /**
     * 2. 차단기 상태 변경 이벤트 수신
     * URL: POST /api/parkingFee/receive/gate_state
     */
    handleGateStateEvent = async (req, res, next) => {
        try {
            const { location, status, descript, loop_event_time } = req.body;

            // [규격 준수] 즉시 응답
            res.status(200).json({ status: 'ok', message: '' });

            // 상태 업데이트 로직 호출
            await plsService.updateGateStatus({
                locationName: location,
                status: status, // "up" or "down"
                eventTime: loop_event_time
            });

        } catch (error) {
            logger.error(`[PLS Controller] Gate Event Error: ${error.message}`);
            if (!res.headersSent) res.json({ status: 'ng', message: error.message });
        }
    }

    /**
     * 3. 결제 결과 및 할인권 투입 수신
     * URL: POST /api/parkingFee/receive/payment
     * - 정산기에서 결제가 완료되었거나, 종이 할인권이 투입되었을 때 호출됨
     */
    handlePaymentResult = async (req, res, next) => {
        try {
            const body = req.body;
            const cmd = body.cmd; // PARK_FEE_DONE(결제완료) or PARK_FEE_RECALC(재계산/할인권)

            // [규격 준수] 즉시 응답
            res.status(200).json({ status: 'ok', message: '' });

            if (cmd === 'PARK_FEE_DONE') {
                // [CASE A] 정상 결제 완료 (카드 등)
                // PlsService에 processPaymentSuccess 메서드 구현 필요
                if (plsService.processPaymentSuccess) {
                    await plsService.processPaymentSuccess({
                        carNumber: body.lp,
                        paidFee: parseInt(body.paid_fee || 0),
                        paymentType: body.paytype, // 1:IC, 2:MS, 3:RF ...
                        approvalNo: body.approvno,
                        approvalTime: body.paydate + body.paytime,
                        locationName: body.location,
                        rawAmount: body.payamount
                    });
                } else {
                    logger.warn('[PLS Controller] processPaymentSuccess 메서드가 서비스에 구현되지 않았습니다.');
                }

            } else if (cmd === 'PARK_FEE_RECALC') {
                // [CASE B] 종이 할인권 투입 -> 유효성 검증 및 재계산 요청
                // PlsService에 processCouponInput 메서드 구현 필요
                if (plsService.processCouponInput) {
                    await plsService.processCouponInput({
                        carNumber: body.lp,
                        couponCode: body.coupon,
                        locationName: body.location
                    });
                } else {
                    logger.warn('[PLS Controller] processCouponInput 메서드가 서비스에 구현되지 않았습니다.');
                }
            }

        } catch (error) {
            logger.error(`[PLS Controller] Payment Handler Error: ${error.message}`);
            if (!res.headersSent) res.json({ status: 'ng', message: error.message });
        }
    }

    /**
     * 4. 사전 정산기 차량 검색 요청
     * URL: POST /api/parkingFee/receive/park_car_search
     * - 키오스크에서 고객이 차량번호 4자리를 입력했을 때 호출됨
     */
    handleCarSearchRequest = async (req, res, next) => {
        try {
            const { searchkey, location, ip, port } = req.body;

            // [규격 준수] 즉시 응답
            // (실제 차량 리스트는 여기서 리턴하는 게 아니라, 별도의 API(sendCarSearchResult)로 쏴줘야 함)
            res.status(200).json({ status: 'ok', message: '' });

            // 검색 및 결과 전송 로직 호출
            if (plsService.searchCarAndReply) {
                await plsService.searchCarAndReply({
                    searchKey: searchkey, // 차량번호 뒷자리
                    targetLocation: location,
                    targetIp: ip,
                    targetPort: port
                });
            } else {
                logger.warn('[PLS Controller] searchCarAndReply 메서드가 서비스에 구현되지 않았습니다.');
            }

        } catch (error) {
            logger.error(`[PLS Controller] Car Search Error: ${error.message}`);
            if (!res.headersSent) res.json({ status: 'ng', message: error.message });
        }
    }
}

module.exports = new PlsController();