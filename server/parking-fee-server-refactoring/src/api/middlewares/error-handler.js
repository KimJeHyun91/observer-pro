module.exports = (err, req, res, next) => {
    res.status(err.status || 500).json({
        status: 'FAIL',
        message: err.message || '처리 중 서버 에러가 발생했습니다.',
    });
};