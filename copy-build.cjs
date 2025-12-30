const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const source = path.join(__dirname, 'build');
const destination = path.join(__dirname, 'server', 'public'); // 또는 실행파일과 같은 위치의 public

if (fs.existsSync(destination)) {
  fse.removeSync(destination);
}
fse.copySync(source, destination);
console.log('✅ React build 결과가 server/public으로 복사되었습니다.');
