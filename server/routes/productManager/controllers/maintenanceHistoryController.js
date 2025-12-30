const logger = require("../../../logger")
const maintenanceHistoryService = require('../services/maintenanceHistoryService');
const { validateDateFormat } = require('../../../utils/dateUtils');

// 유지보수 내역 등록
exports.enroll = async (req, res) => {

    try {

        const {
            title,
            serviceRequestDate,
            visitDate,
            workerName,
            department,
            workDetail,
            notes
        } = req.body;

        if(serviceRequestDate) {
            const result = validateDateFormat(serviceRequestDate);
            if(!result) {
                return res.status(400).send({ message: 'serviceRequestDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'});
            }            
        }

        const result = await maintenanceHistoryService.enroll({
            title,
            serviceRequestDate,
            visitDate,
            workerName,
            department,
            workDetail,
            notes     
        });

        if(result) {
            return res.status(201).send({ message: '유지보수 내역 추가에 성공했습니다.' });
        }

        res.status(400).send({ message: '유지보수 내역 추가에 실패했습니다.' });

    } catch (error) {

        logger.error('routes/productManager/controllers/maintenanceHistoryController.js, enroll, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 유지보수 내역 수정
exports.modify = async (req, res) => {

    try {

        const {
            idx,
            title,
            serviceRequestDate,
            visitDate,
            workerName,
            department,
            workDetail,
            notes
        } = req.body;

        if(serviceRequestDate) {
            const result = validateDateFormat(serviceRequestDate);
            if(!result) {
                return res.status(400).send({ message: 'serviceRequestDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'});
            }            
        }

        const result = await maintenanceHistoryService.modify({
            idx,
            title,
            serviceRequestDate,
            visitDate,
            workerName,
            department,
            workDetail,
            notes
        });

        if(result === 'noMaintenanceHistory') {
            return res.status(404).send({ message: `${idx}에 해당하는 유지보수 내역을 찾을 수가 없습니다.` });
        }

        if(result === 'noData') {
            return res.status(400).send({ message: '수정할 정보가 없습니다.' });
        }

        if(result) {
            return res.status(200).send({ message: '유지보수 내역 수정에 성공했습니다.' });
        }

        res.status(400).send({ message: '유지보수 내역 수정에 실패했습니다.' });

    } catch (error) {

        logger.error('routes/productManager/controllers/maintenanceHistoryController.js, modify, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 유지보수 내역 삭제(Soft Deletion)
exports.delete = async (req, res) => {

    try {

        const { idx } = req.body;

        const result = await maintenanceHistoryService.delete({ idx });

        if(result) {
            return res.status(204).send();
        }

        res.status(404).send({ message: '삭제할 유지보수 내역 없습니다.' });

    } catch (error) {

        logger.error('routes/productManager/controllers/maintenanceHistoryController.js, delete, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 유지보수 내역 조회(최신순)
exports.find = async (req, res) => {

    try {

        const { idx, title, workerName, department, visitDateStart, visitDateEnd } = req.body;

        if(visitDateStart) {
            const result = validateDateFormat(visitDateStart);
            if(!result) {
                return res.status(400).send({ message: 'visitDateStart는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'});
            }            
        }

        if(visitDateEnd) {
            const result = validateDateFormat(visitDateEnd);
            if(!result) {
                return res.status(400).send({ message: 'visitDateEnd는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: 2025-09-01, 20250909)'});
            }            
        }

        const result = await maintenanceHistoryService.find({ idx, title, workerName, department, visitDateStart, visitDateEnd });

        res.status(200).send({ message: '유지보수 내역 조회(조건)에 성공했습니다.', result: result });

    } catch (error) {

        logger.error('routes/productManager/controllers/maintenanceHistoryController.js, find, error: ', error);
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}

// 유지보수 내역 보고서 다운로드
exports.downloadReports = async (req, res) => {

    try {

        const { idx, form } = req.body;

        let result;

        switch(form) {
            
            // 엑셀
            case 'xlsx':
                result = await maintenanceHistoryService.createExcelReport({ idx });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
                return res.status(200).send(result.excelBuffer); 

            // PDF
            default:
                result = await maintenanceHistoryService.createPdfReport({ idx });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
                return res.status(200).end(result.pdfBuffer);

        }

             

    } catch (error) {

        logger.error('routes/productManager/controllers/maintenanceHistoryController.js, downloadReports, error: ', error);
        if(error.message.startsWith('NotFound:')) {
            return res.status(404).send({ message: '유지보수 내역을 찾을 수 없습니다.' });
        }
        res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}
