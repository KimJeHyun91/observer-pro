exports.xlsxReportTemplate = (workbook, maintenanceHistory) => {

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

    const worksheet = workbook.addWorksheet(`유지보수내역_${maintenanceHistory.idx}`, {
        pageSetup: {
            printArea: 'H6:S58',
            paperSize: 9,
            orientation: 'portrait',
            fitToWidth: 1,
            fitToHeight: 1,
            horizontalCentered: true,
            verticalCentered: true,
            showGridLines: false,
            margins: {
                left: 0.7, right: 0.7,
                top: 0.75, bottom: 0.75,
                header: 0.3, footer: 0.3
            }
        }
    });

    worksheet.views = [
        {
            showGridLines: false,
            showRowColHeaders: false,
        }
    ];

    // 배경색
    const lightGrayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    const whiteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    // 전체 셀에 보호 적용(선택 안됨)
    worksheet.protect('', {
        selectLockedCells: false
    });

    // 보고서 배경색 설정
    for(let i = 1; i <= 200; i++) {
        worksheet.getColumn(i).fill = lightGrayFill;
    }

    // 보고서 영역색 설정
    const columns = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    for(const column of columns) {
        for(let row = 3; row <= 62; row++) {
                worksheet.getCell(`${column}${row}`).fill = whiteFill;
        }
    }

    // 결제란
    worksheet.mergeCells('P6:Q7');
    worksheet.mergeCells('R6:S7');
    worksheet.mergeCells('P8:Q9');
    worksheet.mergeCells('R8:S9');

    const p6Cell = worksheet.getCell('P6');
    const r6Cell = worksheet.getCell('R6');
    const p8Cell = worksheet.getCell('P8');
    const r8Cell = worksheet.getCell('R8');

    p6Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    r6Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    p8Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    r8Cell.alignment = { vertical: 'middle', horizontal: 'center' };

    p6Cell.font = { size: 13, bold: true };
    r6Cell.font = { size: 13, bold: true };
    p8Cell.font = { size: 13, bold: true };
    r8Cell.font = { size: 13, bold: true };

    p6Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    r6Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    p8Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    r8Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    p6Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    r6Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    p8Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    r8Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    p6Cell.protection = { locked: false };
    r6Cell.protection = { locked: false };
    p8Cell.protection = { locked: false };
    r8Cell.protection = { locked: false };

    // 문서 제목
    worksheet.mergeCells('H6:O9');

    const h6Cell = worksheet.getCell('H6');

    h6Cell.value = '유지보수 내역서';

    h6Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 20 };
    
    h6Cell.font = { size: 22, bold: true };

    h6Cell.protection = { locked: false };

    // 기본 정보
    worksheet.mergeCells('H12:I12'); // 제목
    worksheet.mergeCells('H13:I13'); // 접수일
    worksheet.mergeCells('H14:I14'); // 방문일
    worksheet.mergeCells('H15:I15'); // 작업자
    worksheet.mergeCells('H16:I16'); // 소속

    const h12Cell = worksheet.getCell('H12');
    const h13Cell = worksheet.getCell('H13'); 
    const h14Cell = worksheet.getCell('H14');
    const h15Cell = worksheet.getCell('H15');
    const h16Cell = worksheet.getCell('H16');

    h12Cell.value = '제 목';
    h13Cell.value = '접 수 일';
    h14Cell.value = '방 문 일';
    h15Cell.value = '작 업 자';
    h16Cell.value = '소 속';

    h12Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    h13Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    h14Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    h15Cell.alignment = { vertical: 'middle', horizontal: 'center' };
    h16Cell.alignment = { vertical: 'middle', horizontal: 'center' };

    h12Cell.font = { size: 13, bold: true };
    h13Cell.font = { size: 13, bold: true };
    h14Cell.font = { size: 13, bold: true };
    h15Cell.font = { size: 13, bold: true };
    h16Cell.font = { size: 13, bold: true };

    h12Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    h13Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    h14Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    h15Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    h16Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    h12Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    h13Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    h14Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    h15Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    h16Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

    h12Cell.protection = { locked: false };
    h13Cell.protection = { locked: false };
    h14Cell.protection = { locked: false };
    h15Cell.protection = { locked: false };
    h16Cell.protection = { locked: false };

    worksheet.mergeCells('J12:S12'); // 제목 칸
    worksheet.mergeCells('J13:S13'); // 접수일 칸
    worksheet.mergeCells('J14:S14'); // 방문일 칸
    worksheet.mergeCells('J15:S15'); // 작업자 칸
    worksheet.mergeCells('J16:S16'); // 소속 칸

    const j12Cell = worksheet.getCell('J12');
    const j13Cell = worksheet.getCell('J13'); 
    const j14Cell = worksheet.getCell('J14');
    const j15Cell = worksheet.getCell('J15');
    const j16Cell = worksheet.getCell('J16');

    j12Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    j13Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    j14Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    j15Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    j16Cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    j12Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    j13Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    j14Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    j15Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    j16Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    j12Cell.font = { size: 13 };
    j13Cell.font = { size: 13 };
    j14Cell.font = { size: 13 };
    j15Cell.font = { size: 13 };
    j16Cell.font = { size: 13 };

    j12Cell.protection = { locked: false };
    j13Cell.protection = { locked: false };
    j14Cell.protection = { locked: false };
    j15Cell.protection = { locked: false };
    j16Cell.protection = { locked: false };

    j12Cell.value = maintenanceHistory.title || '';
    j13Cell.value = serviceRequestDate;
    j14Cell.value = visitDate;
    j15Cell.value = maintenanceHistory.worker_name || '';
    j16Cell.value = maintenanceHistory.department || '';

    // 작업 내용
    worksheet.mergeCells('H18:I18');

    const h18Cell = worksheet.getCell('H18');

    h18Cell.value = '작업 내용';
    
    h18Cell.font = { size: 13, bold: true };

    h18Cell.alignment = { vertical: 'middle', horizontal: 'center' };

    h18Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    h18Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

    h18Cell.protection = { locked: false };

    worksheet.mergeCells('H19:S37'); // 칸

    const h19Cell = worksheet.getCell('H19');

    h19Cell.value = maintenanceHistory.work_detail ? ` ${maintenanceHistory.work_detail}` : ' ';

    h19Cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    h19Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    h19Cell.font = { size: 13 };

    h19Cell.protection = { locked: false };

    // 특이 사항
    worksheet.mergeCells('H39:I39');

    const h39Cell = worksheet.getCell('H39');

    h39Cell.value = '특이 사항';
    
    h39Cell.font = { size: 13, bold: true };

    h39Cell.alignment = { vertical: 'middle', horizontal: 'center' };

    h39Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    h39Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

    h39Cell.protection = { locked: false }; 

    worksheet.mergeCells('H40:S58'); // 칸

    const h40Cell = worksheet.getCell('H40');

    h40Cell.value = maintenanceHistory.notes ? ` ${maintenanceHistory.notes}` : ' ';

    h40Cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    h40Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    h40Cell.font = { size: 13 };

    h40Cell.protection = { locked: false };

    return workbook;

}