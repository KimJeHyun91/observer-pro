
exports.isValidIPv4 = (ip) => {
  
  // 1. localhost나 127.0.0.1 체크
  if (ip === "localhost" || ip === "127.0.0.1") {
      return true;
  }
  
  // 2. IPv4 주소 형식 검사
  const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip);
}

exports.isValidPort = (port) => {
  
  let returnValue = false;

  const innerPort = Number(port);
  
  if(!(Number.isNaN(innerPort)) && (innerPort > 0) && (innerPort < 65536)) {
    returnValue = true;
  }
  
  return returnValue;
}