const logger = require("../../../logger");
const { pool } = require('../../../db/postgresqlPool');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const { xlsxReportTemplate } = require('../templates/xlsxReportTemplate');
const puppeteer = require('puppeteer');

// 유지보수 내역 조회
const findByIdx = async ({ idx }) => {

    const client = await pool.connect();

    try {

        const result = await client.query('SELECT * FROM maintenance_history WHERE idx = $1', [idx]);

        return result.rows[0];
        
    } catch (error) {

        logger.error('routes/productManager/services/maintenanceHistoryService.js, findByIdx, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 유지보수 내역 등록
exports.enroll = async ({
    title,
    serviceRequestDate,
    visitDate,
    workerName,
    department,
    workDetail,
    notes
}) => {

    const client = await pool.connect();

    try {

        const insertData = {
            title: title,
            service_request_date: serviceRequestDate === '' ? null : serviceRequestDate,
            visit_date: visitDate,
            worker_name: workerName,
            department: department,
            work_detail: workDetail,
            notes: notes === '' ? null : notes
        };

        logger.error(visitDate)

        const columns = [];
        const placeholders = [];
        const values = [];

        Object.keys(insertData)
            .filter(key => insertData[key] !== undefined)
            .map(key => {
                columns.push(key);
                values.push(insertData[key]);
                placeholders.push(`$${values.length}`);
            });

        const query = `
            INSERT INTO maintenance_history
                (${columns.join(', ')})
            VALUES
                (${placeholders.join(', ')})
            RETURNING
                idx
        `;

        const result = await client.query(query, values);

        return result.rowCount === 1;

    } catch (error) {

        logger.error('routes/productManager/services/maintenanceHistoryService.js, enroll, error: ', error);
        throw error;

    } finally {

        client.release();
        
    }

}

// 유지보수 내역 수정
exports.modify = async ({
    idx,
    title,
    serviceRequestDate,
    visitDate,
    workerName,
    department,
    workDetail,
    notes
}) => {

    const client = await pool.connect();

    try {

        // 유지보수 내역 조회
        const maintenanceHistory = await findByIdx({ idx });
        if(!maintenanceHistory) {
            return 'noMaintenanceHistory';
        }

        const updatedData = {
            title: title,
            service_request_date: serviceRequestDate === '' ? null : serviceRequestDate,
            visit_date: visitDate,
            worker_name: workerName,
            department: department,
            work_detail: workDetail,
            notes: notes === '' ? null : notes   
        };

        const updatedFields = Object.keys(updatedData).filter(key => updatedData[key] !== undefined);

        if(updatedFields.length === 0) {
            return 'noData';
        }

        const setClause = updatedFields
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');

        const values = updatedFields.map(field => updatedData[field]);

        values.push(idx);

        const query = `
            UPDATE 
                maintenance_history
            SET
                ${setClause}
            WHERE
                idx = $${values.length}
            RETURNING
                idx
        `;

        const result = await client.query(query, values);

        return result.rowCount === 1;

    } catch (error) {

        logger.error('routes/productManager/services/maintenanceHistoryService.js, modify, error: ', error);
        throw error;

    } finally {

        client.release();
        
    }

}

// 유지보수 내역 삭제(Soft Deletion)
exports.delete = async ({ idx }) => {

    const client = await pool.connect();

    try {

        const query = `
            UPDATE 
                maintenance_history
            SET
                isDelete = TRUE
            WHERE
                idx = $1
            RETURNING
                idx
        `;

        const result = await client.query(query, [idx]);

        return result.rowCount === 1;

    } catch (error) {

        logger.error('routes/productManager/services/maintenanceHistoryService.js, delete, error: ', error);
        throw error;

    } finally {

        client.release();
        
    }

}

// 유지보수 내역 조회(최신순)
exports.find = async ({ idx, title, workerName, department, visitDateStart, visitDateEnd }) => {

    const client = await pool.connect();

    try {

        const conditions = [];
        const values = [];

        values.push(false);
        conditions.push(`isDelete = $${values.length}`);

        if(idx) {
            values.push(idx);
            conditions.push(`idx = $${values.length}`);
        }

        if(title) {
            values.push(`%${title}%`);
            conditions.push(`title Like $${values.length}`);
        }

        if(workerName) {
            values.push(`%${workerName}%`);
            conditions.push(`worker_name Like $${values.length}`);
        }

        if(department) {
            values.push(`%${department}%`);
            conditions.push(`department Like $${values.length}`);
        }

        if(visitDateStart) {
            values.push(visitDateStart);
            conditions.push(`visit_date >= $${values.length}`);
        }

        if(visitDateEnd) {
            values.push(visitDateEnd);
            conditions.push(`visit_date <= $${values.length}`);
        }

        const whereClauses = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                idx
                , title
                , TO_CHAR(service_request_date, 'YYYY-MM-DD') AS service_request_date
                , TO_CHAR(visit_date, 'YYYY-MM-DD') AS visit_date
                , worker_name
                , department
                , work_detail
                , notes
                , created_at
                , updated_at
            FROM 
                maintenance_history
            ${whereClauses}
            ORDER BY
                visit_date DESC
                , created_at DESC
        `;

        const result = await client.query(query, values);

        return result.rows;

    } catch (error) {

        logger.error('routes/productManager/services/maintenanceHistoryService.js, find, error: ', error);
        throw error;

    } finally {

        client.release();
        
    }

}

// 유지보수 내역 엑셀 보고서 생성
exports.createExcelReport = async ({ idx }) => {

    const maintenanceHistory = await findByIdx({ idx });
    if (!maintenanceHistory) {
        throw new Error('NotFound: 보고서를 생성할 데이터가 없습니다.');
    }

    const workbook = xlsxReportTemplate(new ExcelJS.Workbook(), maintenanceHistory);

    // 파일 생성
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const fileName = `${maintenanceHistory.title || '유지보수내역'}.xlsx`;

    return {
        excelBuffer,
        fileName
    };

}

// 유지보수 내역 PDF 보고서 생성
exports.createPdfReport = async ({ idx }) => {

    const maintenanceHistory = await findByIdx({ idx });
    if (!maintenanceHistory) {
        throw new Error('NotFound: 보고서를 생성할 데이터가 없습니다.');
    }

    let browser;

    try {
        // 1. HTML 템플릿 파일 읽기
        const templatePath = path.join(__dirname, '../templates/pdfReportTemplate.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // 2. 템플릿 데이터 교체
        const serviceRequestDate = maintenanceHistory.service_request_date 
            ? (() => {
                const date = new Date(maintenanceHistory.service_request_date);
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            })()
            : '';

        const visitDate = maintenanceHistory.visit_date 
            ? (() => {
                const date = new Date(maintenanceHistory.visit_date);
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            })()
            : '';

        const workDetailWithBreakds = (maintenanceHistory.work_detail || '').replaceAll('\n', '<br>');
        const notesWithBreaks = (maintenanceHistory.notes || '').replaceAll('\n', '<br>');

        html = html.replace('{{title}}', maintenanceHistory.title || '');
        html = html.replace('{{serviceRequestDate}}', serviceRequestDate);
        html = html.replace('{{visitDate}}', visitDate);
        html = html.replace('{{workerName}}', maintenanceHistory.worker_name || '');
        html = html.replace('{{department}}', maintenanceHistory.department || '');
        html = html.replace('{{workDetail}}', ' ' + workDetailWithBreakds);
        html = html.replace('{{notes}}', ' ' + notesWithBreaks);

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
        const fileName = `${maintenanceHistory.title}.pdf`;
        return { pdfBuffer, fileName };

    } catch (error) {
        logger.error('routes/productManager/services/maintenanceHistoryService.js, createPdfReport, error: ', error);
        throw error;

    } finally {

        if (browser) {
            await browser.close();
        }

    }

}
