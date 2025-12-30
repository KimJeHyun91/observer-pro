const Modbus = require('modbus-serial');
const fs = require('fs');
const path = require('path');

const TIMEOUT = 5000;
let reqsCount = 6;

const modbusClients = new Map();
const barrierStatusCache = new Map(); // { [ip]: { status, statusText, timestamp } }

function resolveRegisterAddress(address) {
  return address - 40001;
}

function toHexString(value) {
  return `0x${value.toString(16).padStart(2, '0').toUpperCase()}`;
}

async function connectModbusClient(ip, port = 502) {
  if (modbusClients.has(ip)) return modbusClients.get(ip);
  const client = new Modbus();
  client.setTimeout(TIMEOUT);
  await client.connectTCP(ip, { port });
  modbusClients.set(ip, client);
  return client;
}

async function createModbusControlPacket(functionCode, startAddress, value) {
  const transactionIdBuffer = Buffer.from([0x01, toHexString(reqsCount)]);
  const protocolIdBuffer = Buffer.from([0x00, 0x00]);
  const lengthBuffer = Buffer.from([0x00, 0x09]);
  const unitIdBuffer = Buffer.from([0x01]);
  const functionCodeBuffer = Buffer.from([functionCode]);

  const startAddr = Buffer.alloc(2);
  startAddr.writeUInt16BE(startAddress);

  const registerCount = Buffer.from([0x00, 0x01]);
  const dataByteCount = Buffer.from([0x02]);
  const data = Buffer.alloc(2);
  data.writeUInt16BE(value);

  reqsCount++;
  return Buffer.concat([
    transactionIdBuffer,
    protocolIdBuffer,
    lengthBuffer,
    unitIdBuffer,
    functionCodeBuffer,
    startAddr,
    registerCount,
    dataByteCount,
    data,
  ]);
}

async function readBarrierStatus(ip) {
  try {
    const client = await connectModbusClient(ip);

    // 추월선 상태
    const res1 = await client.readHoldingRegisters(resolveRegisterAddress(40001), 1);
    const bits1 = res1.data[0];
 
    // 주행선 상태
    const res2 = await client.readHoldingRegisters(resolveRegisterAddress(40003), 1);
    const bits2 = res2.data[0];

    const now = new Date().toISOString();

    const isLane1Folded = (bits1 & (1 << 1)) !== 0;
    const isLane2Folded = (bits2 & (1 << 1)) !== 0;
    const isLane1Unfolded = (bits1 & (1 << 2)) === 0;
    const isLane2Unfolded = (bits2 & (1 << 2)) === 0;
    const isAnyMoving = ((bits1 & (1 << 3)) !== 0) || ((bits2 & (1 << 3)) !== 0);

    let statusText = '알 수 없음';
    if (isAnyMoving) statusText = '동작 중';
    else if (isLane1Folded || isLane2Folded) statusText = '하강 상태';
    else if (isLane1Unfolded && isLane2Unfolded) statusText = '상승 상태';

    return {
      ip,
      statusText,
      timestamp: now,
    };
  } catch (err) {
    console.error(`[${ip}] 상태 조회 실패:`, err.message);
    return {
      ip,
      statusText: '조회 실패',
      timestamp: new Date().toISOString(),
    };
  }
}

async function controlBarrier(ip, action) {

  const client = await connectModbusClient(ip);
  let value;

  switch (action) {
    case '상승':
      value = 0x01;
      break;
    case '하강':
      value = 0x02;
      break;
    case '정지':
      value = 0x04;
      break;
    default:
      throw new Error('지원하지 않는 제어 명령입니다.');
  }

  const address = resolveRegisterAddress(40006);
  const packet = await createModbusControlPacket(0x10, address, value);

  if (action === '정지') {
    client._port._client.write(packet);
  } else {
    client._port._client.write(packet);
    setTimeout(async () => {
      const resetPacket = await createModbusControlPacket(0x10, address, 0x0000);
      client._port._client.write(resetPacket);
    }, 2000);
  }
}


module.exports = {
  connectModbusClient,
  createModbusControlPacket,
  readBarrierStatus,
  controlBarrier,
  barrierStatusCache,
};
