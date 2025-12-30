exports.createMaintenanceLabel = (days, type) => {
    const suffix = type === 'less' ? '미만' : '이상';

    // 30일 미만을 '일' 단위로 표시
    if(days < 30) {
        return `${days}일`;
    }

    // 30일 이상은 '개월' 단위로 계산하여 표시
    const months = Math.floor(days / 30);
    return `${months}개월 ${suffix}`;
};
