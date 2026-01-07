const VehicleDetectionLogRepository = require('../repositories/vehicle-detection-log.repository');
const SettlementLogRepository = require('../repositories/settlement-log.repository');
const DeviceEventLogRepository = require('../repositories/device-event-log.repository');
const LinkCommunicationLogRepository = require('../repositories/link-communication-log.repository');

/**
 * Log Service
 * - 로그 기록 및 조회 비즈니스 로직
 */
class LogService {
    constructor() {
        this.vehicleDetectionRepo = new VehicleDetectionLogRepository();
        this.settlementRepo = new SettlementLogRepository();
        this.deviceEventRepo = new DeviceEventLogRepository();
        this.linkCommunicationRepo = new LinkCommunicationLogRepository();
    }

    // =========================================================
    // 1. 조회 메서드 (Controller용)
    // =========================================================

    async findVehicleDetectionLogs(params) {
        return await this._findLogs(this.vehicleDetectionRepo, params);
    }

    async findSettlementLogs(params) {
        return await this._findLogs(this.settlementRepo, params);
    }

    async findDeviceEventLogs(params) {
        return await this._findLogs(this.deviceEventRepo, params);
    }

    async findLinkLogs(params) {
        return await this._findLogs(this.linkCommunicationRepo, params);
    }

    // 공통 조회 로직
    async _findLogs(repository, params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20;
        const offset = (page - 1) * limit;

        const filters = { ...params };
        delete filters.page;
        delete filters.limit;
        delete filters.sortBy;
        delete filters.sortOrder;

        // 날짜 필터 처리
        const dateRange = {};
        if (filters.start_date) {
            dateRange.start = filters.start_date;
            delete filters.start_date;
        }
        if (filters.end_date) {
            dateRange.end = filters.end_date;
            delete filters.end_date;
        }

        const sortOptions = {
            sortBy: params.sortBy, 
            sortOrder: params.sortOrder || 'DESC'
        };

        // 각 레포지토리의 상속받은 findAll 호출
        const result = await repository.findAll(filters, dateRange, sortOptions, limit, offset);

        return {
            logs: result.rows,
            meta: {
                totalItems: parseInt(result.count),
                totalPages: Math.ceil(result.count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    // =========================================================
    // 2. 생성 메서드 (Internal Use)
    // =========================================================

    async createInboundLog(client, data) {
        return await this.deviceEventRepo.create(client, {
            site_id: data.siteId,
            lane_id: data.laneId,
            type: 'INBOUND',
            message: `Entry: ${data.carNum}`,
            raw_data: data
        });
    }

    async createOutboundLog(client, data) {
        return await this.deviceEventRepo.create(client, {
            site_id: data.siteId,
            lane_id: data.laneId,
            type: 'OUTBOUND',
            message: `Exit: ${data.carNum} (Fee: ${data.fee})`,
            raw_data: data
        });
    }

    async createOperatorLog(data) {
        // client가 없으면 pool 사용 (Repository 내부 처리)
        return await this.deviceEventRepo.create(null, {
            site_id: data.siteId,
            lane_id: data.laneId,
            type: 'OPERATOR_ACTION',
            message: `${data.action}: ${data.reason}`,
            raw_data: { operatorId: data.operatorId, ...data }
        });
    }

    async createVehicleDetectionLog(client, data) {
        return await this.vehicleDetectionRepo.create(client, data);
    }

    async createDeviceEventLog(data) {
        return await this.deviceEventRepo.create(null, {
            site_id: data.siteId,
            lane_id: data.laneId,
            type: data.type,
            message: data.message,
            time: data.time,
            raw_data: data
        });
    }
}

module.exports = LogService;