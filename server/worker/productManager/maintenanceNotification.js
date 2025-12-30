const nodeCron = require('node-cron');
const logger = require('../../logger');
const { findWithNearbyMaintenanceEndDate } = require('../../routes/productManager/services/productService');
const { DAYS_TO_NOTIFY } = require('../../config');
const { createMaintenanceLabel } = require('../../utils/labelMaker');

// 유지보수 만료일 알림 생성 및 WebSocket 전송
const sendMaintenanceNotification = async () => {

    try {

        logger.info('유지보수 만료 알림 작업을 시작합니다.');

        // WebSocket이 연결되어 있는지 확인
        if (!global.websocket) {
            logger.warn('WebSocket이 초기화되지 않아 알림을 전송할 수 없습니다.');
            return;
        }
        
        const products = await findWithNearbyMaintenanceEndDate(DAYS_TO_NOTIFY);

        if (products.length === 0) {
            logger.info('알림을 보낼 유지보수 만료 예정 제품이 없습니다.');
            global.websocket.emit('maintenance_end_date_notification', { message: '알림을 보낼 유지보수 만료 예정 제품이 없습니다.' });
            return;
        }

        let highestNumber = 0; 
        products.forEach(product => {
            product.notification_label = createMaintenanceLabel(product.days_remaining, 'less');
            highestNumber = highestNumber >= product.days_remaining ? highestNumber : product.days_remaining; 
        });

        products.push({ lastMessage: createMaintenanceLabel(highestNumber, 'less') });

        logger.info(`전송할 알림 :\n 제품:${products}\n 가장 높은 남은 일 수: ${highestNumber}`);

        global.websocket.emit('prm_notification-update', { products });

    } catch (error) {

        logger.error('worker/productManager/maintenanceNotification.js, sendManintenanceNotification, error: ', error);
        throw error;

    }

};

// 제품의 유지보수 만료일에 해당하는 제품을 매일 정오 12시에 사용자에게 알림을 전송(00 12 * * *)
// const maintenanceNotificationTask = nodeCron.schedule('44 10 * * *', async () => {

//     logger.info('정오 12시, 스케쥴된 유지보수 만료 알림 작업을 실행합니다.');
//     await sendMaintenanceNotification();

// }, {
//     timezone: 'Asia/Seoul'
// });

// exports.startScheduler = () => {
//     logger.info('maintenanceNotification.js 스케줄러를 시작합니다.');
//     maintenanceNotificationTask.start();
// }

exports.sendMaintenanceNotification = sendMaintenanceNotification;