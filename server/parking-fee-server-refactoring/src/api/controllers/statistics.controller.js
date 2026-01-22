const statisticsService = require('../../services/statistics.service');

/**
 * 대시보드(Dashboard) 조회
 */
exports.getDashboard = async (req, res, next) => {
    try {
        const { siteId } = req.params;        
        const data = await statisticsService.getDashboard(siteId, req.query);
        res.status(200).json({ status: 'OK', message: 'success', data });
    } catch (error) {
        next(error);
    }
};

/**
 * 요약(Summary) 조회
 */
exports.getSummary = async (req, res, next) => {
    try {
        const { siteId } = req.params;
        const data = await statisticsService.getStatisticsByRange(siteId, req.query);
        res.status(200).json({ status: 'OK', message: 'success', data });
    } catch (error) {
        next(error);
    }
};