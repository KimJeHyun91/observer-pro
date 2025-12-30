exports.validateDateFormat = (dateString) => {

    // dateString이 문자열이 아니거나 비어있으면 즉시 처리
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false;
    }

    // 형식 검증
    const regex1 = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
    const regex2 = /^\d{8}$/; // YYYYMMDD

    // 둘다 통과하지  못하면 false 반환
    if(!regex1.test(dateString) && !regex2.test(dateString)) {
        return false;
    }

    let parsedDate;

    // 문자열을 Date 객체로 파싱
    if(regex1.test(dateString)) {
        // YYYY-MM-DD
        parsedDate = new Date(dateString);
    } else {
        // YYYYMMDD
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        parsedDate = new Date(`${year}-${month}-${day}`);
    }

    // 유효하지 않은 날짜 검증
    // Date 객체가 유효하지 않은 날짜를 파싱하면 Invalid Date가 되고, getTime()은 NaN을 반환합니다.
    if(isNaN(parsedDate.getTime())) {
        return false;
    }

    return true;

}
