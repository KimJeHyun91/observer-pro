const statisticsService = require('../../services/statistics.service');

/**
 * 대시보드(Dashboard) 조회
 */
exports.getDashboard = async (req, res, next) => {
    try {        
        const data = await statisticsService.getDashboardData(req.query);
        res.status(200).json({ status: 'OK', message: 'success', data });
    } catch (error) {
        next(error);
    }
};