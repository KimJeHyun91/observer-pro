/**
 * DB 테이블 접근을 위해 사용
 */
exports.fn_mainServicePrefix = async (mainService) => {

  let mainServicePrefix = '';

  if((mainService === 'inundation') || (mainService === '침수')) {
    // 침수
    mainServicePrefix = 'fl';

  } else if((mainService === 'vehicle') || (mainService === '차량관리')) {
    // 차량관리
    mainServicePrefix = 'vm';

  } else if((mainService === 'parking') || (mainService === '주차관리')) {
    // 주차관리
    mainServicePrefix = 'pm';

  } else if((mainService === 'tunnel') || (mainService === '터널관리')) {
    // 터널관리
    mainServicePrefix = 'tm';

  } else if((mainService === 'broadcast') || (mainService === '마을방송')) {
    // 마을방송
    mainServicePrefix = 'vb';
    
  } else {
    // 옵저버
    mainServicePrefix = 'ob';
  }

  return mainServicePrefix;
}