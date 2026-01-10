module.exports = {
    FEE: [
        'baseTimeMinutes', 'baseFee', 
        'unitTimeMinutes', 'unitFee', 
        'graceTimeMinutes', 'dailyMaxFee'
    ],
    DISCOUNT: [
        'discountType', 'discountValue', 'discountMethod'
    ],
    MEMBERSHIP: [
        'membershipFee', 'membershipValidityDays'
    ],
    HOLIDAY: [
        'holidayId', 'holidayFeePolicyId'
    ],
    BLACKLIST: [
        'blacklistAction' 
        // 주의: 'isSelected'는 상태값이므로 여기서 검사하지 않고 별도 로직으로 처리
    ]
};