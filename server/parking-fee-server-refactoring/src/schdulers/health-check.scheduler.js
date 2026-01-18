const cron = require('node-cron');
const deviceControllerRepository = require('../repositories/device-controller.repository');
const siteService = require('../services/site.service');
const adapterFactory = require('../adapters/adapter.factory');
const logger = require('../../../logger');

/**
 * 장비 제어기 Health Check
 */
cron.schedule('*/30 * * * * *', async () => {
    try {
        // 1. 모든 장비 제어기 가져오기
        const { rows: controllers } = await deviceControllerRepository.findAllWithoutPagination({}, { sortBy: 'id' });

        // 변경된 사이트 ID를 모아두는 Set (중복 계산 방지)
        const affectedSiteIds = new Set();

        // 2. 병렬로 Health Check 수행
        const checks = controllers.map(async (controller) => {
            try {
                const adapter = await adapterFactory.getAdapter(controller.id);
                const isHealthy = await adapter.checkHealth();
                
                const newDeviceStatus = isHealthy ? 'ONLINE' : 'OFFLINE';

                // 3. 상태가 변했으면 장비 DB 업데이트
                if (controller.status !== newDeviceStatus) {
                    await deviceControllerRepository.update(controller.id, { status: newDeviceStatus });
                    
                    // 상태가 변한 장비가 소속된 사이트 ID를 기록
                    if (controller.siteId) {
                        affectedSiteIds.add(controller.siteId);
                    }
                }
            } catch (err) {
                // 특정 장비 에러가 전체 스케줄러를 멈추게 하면 안 됨
                logger.error(`[Scheduler] Device Check Error (ID: ${controller.id}):`, err.message);
            }
        });

        await Promise.all(checks);

        // 4. [핵심] 영향받은 사이트들의 상태 재계산 (일괄 처리)
        // Set을 순회하며 사이트 상태 동기화
        for (const siteId of affectedSiteIds) {
            await siteService.recalculateStatus(siteId);
        }

    } catch (error) {
        logger.error('[Scheduler] Critical Error:', error);
    }
});