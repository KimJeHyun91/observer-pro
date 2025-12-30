import dayjs from 'dayjs';

export const formatDateTimeStringKorean = (dateTime: string) => {
  const year = dateTime.substring(0, 4);
  const month = dateTime.substring(4, 6);
  const day = dateTime.substring(6, 8);
  const hour = dateTime.substring(9, 11);
  const minute = dateTime.substring(11, 13);
  const seconds = dateTime.substring(13, 15);
  return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분 ${seconds}초`;
};

export const formatDateTime = (occurDateTime: string) => {
  const yearStr = occurDateTime.slice(0, 4);
  const monthStr = occurDateTime.slice(4, 6);
  const dayStr = occurDateTime.slice(6, 8);
  const hourStr = occurDateTime.slice(9, 11);
  const minuteStr = occurDateTime.slice(11, 13);
  const secondsStr = occurDateTime.slice(13, 15);

  const parsingDateTime = `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}:${secondsStr}`;
  const result = dayjs(new Date(parsingDateTime)).format('YYYY-MM-DD HH:mm:ss');
  return result;
};