const logger = require('../../../logger');
const fieldService = require('../services/fieldService');
const { validateDateFormat } = require('../../../utils/dateUtils');

// 현장 수정
exports.modify = async (req, res) => {
    
    try {

        const { completionDate, fieldManagerName, relatedCompanies } = req.body;

        if(completionDate) {
            const result = validateDateFormat(completionDate);
            if(!result) {
                return res.status(400).send({ message: 'completionDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'})
            }            
        }


        const result = await fieldService.modify({ completionDate, fieldManagerName, relatedCompanies });

        if(result) {
            return res.status(200).send({ message: '현장 정보 수정에 성공했습니다.' });
        } 

        res.status(400).send({ message: '현장 정보 수정에 실패했습니다.' });

    } catch (error) {

        logger.error('routes/productManager/fieldController.js, modify, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 현장 조회
exports.find = async (req, res) => {

    try {

        const result = await fieldService.find();

        if(result) {
            return res.status(200).send({ message: '현장 정보 조회에 성공했습니다.', result: result });
        }

        res.status(404).send({ message: '현장 정보를 찾을 수 없습니다.' });

    } catch (error) {

        logger.error('routes/productManager/fieldController.js, find, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}
