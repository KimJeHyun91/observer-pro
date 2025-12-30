const logger = require("../../../logger")
const exportSOPEventService = require('../services/exportSOPEventService');

// 유지보수 내역 보고서 다운로드
exports.downloadReports = async (req, res) => {

    try {

        const { idx, form } = req.body;

        let result;

        switch(form) {
            
            // 엑셀
            case 'xlsx':
                result = await exportSOPEventService.createExcelReport({ idx });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
                return res.status(200).send(result.excelBuffer); 

            // PDF
            default:
                result = await exportSOPEventService.createPdfReport({ idx });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
                return res.status(200).end(result.pdfBuffer);

        }

             

    } catch (error) {

        logger.error('routes/observer/controllers/exportSOPEventController.js, downloadReports, error: ', error);
        if(error.message.startsWith('NotFound:')) {
            return res.status(404).send({ message: 'SOP 처리 내역을 찾을 수 없습니다.' });
        }
        return res.status(500).send({ message: '서버 내부 오류가 발생했습니다.' });

    }

}
