module.exports = (err, req, res, next) => {

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || '사이트 관련 처리 중 서버 에러가 발생했습니다.',
    });

};