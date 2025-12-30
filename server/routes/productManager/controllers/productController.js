const logger = require('../../../logger');
const productService = require('../services/productService');
const { validateDateFormat } = require('../../../utils/dateUtils')

// 제품 수정
exports.modify = async (req, res) => {

    try {

        const { installationDate, maintenanceEndDate } = req.body;

        if(installationDate) {
            const result = validateDateFormat(installationDate);
            if(!result) {
                return res.status(400).send({ message: 'installationDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'})
            }            
        }

        if(maintenanceEndDate) {
            const result = validateDateFormat(maintenanceEndDate);
            if(!result) {
                return res.status(400).send({ message: 'maintenanceEndDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'})
            }            
        }

        const result = await productService.modify(req.body);

        if(result) {
            return res.status(200).send({ message: '제품 수정에 성공했습니다.' });
        }

        res.status(400).send({ message: '제품 수정에 실패했습니다.' });

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, modify, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 일괄수정
exports.bulkModify = async (req, res) => {

    try {

        const { idxList, vendor, firmwareVersion, maintenanceEndDate } = req.body;

        if(maintenanceEndDate) {
            const result = validateDateFormat(maintenanceEndDate);
            if(!result) {
                return res.status(400).send({ message: 'maintenanceEndDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'})
            }            
        }

        const result = await productService.bulkModify({ idxList, vendor, firmwareVersion, maintenanceEndDate });

        if(result === 'noChange') {
            return res.status(400).send({ message: '수정할 정보가 없습니다.' });
        }

        res.status(200).send({ message: '제품 일괄수정에 성공했습니다.'});

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, multipleModify, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 삭제
exports.delete = async (req, res) => {

    try {

        const { idx } = req.body;

        const result = await productService.delete({ idx });

        if(result) {
            return res.status(204).send();
        }

        res.status(404).send({ message: '삭제할 제품이 없습니다.' });

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, delete, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 조회(최신순)
exports.find = async (req, res) => {

    try {

        const { deviceName, location, serviceType, deviceType, idx } = req.body;

        if(deviceType) {
            const requestType = 'device';
            const deviceTypes = await productService.findTypes({ requestType });
            if(!deviceTypes.includes(deviceType)) {
                return res.status(400).send({ message: `deviceType 값이 유효하지 않습니다. 유효한 deviceType: ${deviceTypes}` });
            };
        }

        if(serviceType) {
            const requestType = 'service';
            const serviceTypes = await productService.findTypes({ requestType });
            if(!serviceTypes.includes(serviceType)) {
                return res.status(400).send({ message: `serviceType 값이 유효하지 않습니다. 유효한 serviceType: ${serviceTypes}` });
            };
        }

        const result = await productService.find({ deviceName, location, serviceType, deviceType, idx });

        res.status(200).send({ message: '제품 조회에 성공했습니다.', result: result });

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, findByDeviceName, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 조회(제품 요약 정보)(최신순)
exports.findAllWithSummuries = async (req, res) => {

    try {

        const { sortColum, deviceName, serviceType, deviceType, notificationLabel } = req.body;

        if(deviceType) {
            const requestType = 'device';
            const deviceTypes = await productService.findTypes({ requestType });
            if(!deviceTypes.includes(deviceType)) {
                return res.status(400).send({ message: `deviceType 값이 유효하지 않습니다. 유효한 deviceType: ${deviceTypes}` });
            };
        }

        if(serviceType) {
            const requestType = 'service';
            const serviceTypes = await productService.findTypes({ requestType });
            if(!serviceTypes.includes(serviceType)) {
                return res.status(400).send({ message: `serviceType 값이 유효하지 않습니다. 유효한 serviceType: ${serviceTypes}` });
            };
        }

        const result = await productService.findAllWithSummuries({ sortColum, deviceName, serviceType, deviceType, notificationLabel });

        res.status(200).send({ message: '제품 조회에 성공했습니다.', result: result });

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, findAllWithSummuries, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 테이블에 등록된 모든 타입 조회
exports.findTypes = async (req, res) => {

    try {

        const { requestType } = req.body;
        const result = await productService.findTypes({ requestType });
    
        res.status(200).send({ message: '타입 조회에 성공했습니다.', result: result });


    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, findTypes, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 제품 유지보수 기간 알림 라벨 조회
exports.findNotificationLabel = async (req, res) => {

    try {

        const result = await productService.findNotificationLabel();

        res.status(200).send({ message: '제품 유지보수 기간 알림 라벨 조회에 성공했습니다.', result: result });

    } catch (error) {

        logger.error('routes/productManager/controllers/productController.js, findNotificationLabel, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

