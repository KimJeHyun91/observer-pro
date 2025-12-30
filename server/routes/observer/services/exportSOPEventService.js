const logger = require("../../../logger");
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const { xlsxReportTemplate } = require('../templates/xlsxReportTemplate');
const puppeteer = require('puppeteer');
const { getEventSOPByIdx } = require('./eventService');
const dayjs = require('dayjs');

// 유지보수 내역 엑셀 보고서 생성
exports.createExcelReport = async ({ idx }) => {

    const targetEvent = await getEventSOPByIdx({ idx });
    if (!targetEvent) {
        throw new Error('NotFound: 보고서를 생성할 데이터가 없습니다.');
    }
    targetEvent.event_occurrence_time = dayjs(targetEvent.event_occurrence_time).format('YYYY년 MM월 DD일 HH:mm:ss');
    targetEvent.acknowledged_at = dayjs(targetEvent.acknowledged_at).format('YYYY년 MM월 DD일 HH:mm:ss');
    targetEvent.sop_statement = targetEvent.sopStatement || '';

    const workbook = xlsxReportTemplate(new ExcelJS.Workbook(), targetEvent);

    // 파일 생성
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const fileName = `${targetEvent.title}_${idx}.xlsx`;

    return {
        excelBuffer,
        fileName
    };

}

// 유지보수 내역 PDF 보고서 생성
exports.createPdfReport = async ({ idx }) => {

    const targetEvent = await getEventSOPByIdx({ idx });
    if (!targetEvent) {
        throw new Error('NotFound: 보고서를 생성할 데이터가 없습니다.');
    }

    let browser;

    try {
        // 1. HTML 템플릿 파일 읽기
        const templatePath = path.join(__dirname, '../templates/pdfReportTemplate.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // 2. 템플릿 데이터 교체
        const occurDateTime = dayjs(targetEvent.event_occurrence_time).format('YYYY년 MM월 DD일 HH:mm:ss');
        const ackDateTime = dayjs(targetEvent.acknowledged_at).format('YYYY년 MM월 DD일 HH:mm:ss');

        html = html.replace('{{sopName}}', targetEvent.sop_name);
        html = html.replace('{{occurDateTime}}', occurDateTime);
        html = html.replace('{{location}}', targetEvent.location || '');
        html = html.replace('{{ackUser}}', targetEvent.acknowledge_user);
        html = html.replace('{{ackDateTime}}', ackDateTime);
        html = html.replace('{{sopStatement}}', ' ' + targetEvent.sopStatement ||'');
        html = html.replace('{{falseAlarmType}}', ' ' + targetEvent.false_alarm_type||'');

        // 3. Playwright 브라우저 실행
        browser = await puppeteer.launch({
            headless: true,
        });
        const page = await browser.newPage();
        // 4. 페이지에 HTML 콘텐츠 로드
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        // 5. PDF로 '인쇄'하여 버퍼 형태로 받음
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' }
        });

        // 6. 생성된 PDF 버퍼와 파일명 반환
        const fileName = `${targetEvent.sop_name}_${idx}.pdf`;
        return { pdfBuffer, fileName };

    } catch (error) {
        logger.error('routes/observer/services/exportSOPEventService.js, createPdfReport, error: ', error);
        throw error;

    } finally {

        if (browser) {
            await browser.close();
        }

    }

}