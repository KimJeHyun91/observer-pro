const ModbusRTU = require('modbus-serial');
const client = new ModbusRTU();

// 상수
const PORT = 502;
const UNIT_ID = 1;
const REGISTER_ADDR = 5; // 40006 → 내부 주소 5
const PULSE_DURATION = 2000; // ← 2초 이상

// 각 제어 명령어에 해당하는 비트 위치
const BIT_MASK = {
  해제: 1,   // Bit 0
  작동: 2,   // Bit 1
  정지: 4    // Bit 2
};

/**
 * 커튼 제어 함수
 * @param {string} ip - 장비 IP 주소
 * @param {'해제'|'작동'|'정지'} command - 명령어
 * @returns {Promise<boolean>} - 성공 시 true, 실패 시 false
 */
async function sendCurtainCommand(ip, command) {
  const bitValue = BIT_MASK[command];
  if (bitValue === undefined) {
    console.error(`❌ 잘못된 명령어: ${command}`);
    return false;
  }

  try {
    await client.connectTCP(ip, { port: PORT });
    client.setID(UNIT_ID);
    console.log(`🔗 [${ip}] 연결됨`);

    const { data } = await client.readHoldingRegisters(REGISTER_ADDR, 1);
    const currentValue = data[0];

    if (command === '정지') {
      // ✅ 토글 제어
      const toggledValue = currentValue ^ bitValue;
      await client.writeRegisters(REGISTER_ADDR, [toggledValue]);
      console.log(`🔁 [${ip}] 정지 토글 → ${toggledValue}`);
    } else {
      // ✅ 펄스 제어
      const newValue = currentValue | bitValue;
      await client.writeRegisters(REGISTER_ADDR, [newValue]);
      console.log(`🟢 [${ip}] ${command} ON`);

      await new Promise(resolve => setTimeout(resolve, PULSE_DURATION));

      const clearedValue = currentValue & ~bitValue;
      await client.writeRegisters(REGISTER_ADDR, [clearedValue]);
      console.log(`⚪️ [${ip}] ${command} OFF`);
    }

    client.close();
    return true;
  } catch (err) {
    console.error(`❌ [${ip}] 에러: ${err.message}`);
    client.close();
    return false;
  }
}

// ✅ 외부에서 사용 가능하게 내보내기
module.exports = {
  sendCurtainCommand
};
