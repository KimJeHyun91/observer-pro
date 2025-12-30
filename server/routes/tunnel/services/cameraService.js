const axios = require('axios');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth');
const http = require('http'); // Hanwha REST 호출에 keep-alive 적용해 지연/끊김 최소화
const { pool } = require('../../../db/postgresqlPool'); // PostgreSQL 커넥션 풀
const logger = require('../../../logger'); // 공용 로거

// ✅ digest-fetch 2.0.3 (CommonJS) — require 사용
const DigestFetch = require('digest-fetch');

// 내부 매퍼
const cameraMapper = require('../../observer/mappers/cameraMapper');
const vmsMapper = require('../../observer/mappers/vmsMapper');
const { getServices, getProfileToken } = require('../../../worker/common/onvifStream');

/* =========================
 * 공통 유틸
 * ========================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // ⏱️ 짧은 대기 유틸
const clamp = (v, min, max) => Math.max(min, Math.min(max, v)); // 📏 값 범위 제한
const getDigest = (username, password) =>
  new (AxiosDigestAuth.default || AxiosDigestAuth)({ username, password }); // 🔐 Axios 기반 Digest 인증 클라이언트
const clean = (s = '') => String(s).replace(/\r/g, '').trim(); // 🧽 개행/공백 정리

function normalizeCommand(raw = '') {
  // 🎛️ 프론트에서 들어오는 다양한 명령 문자열을 내부 표준값으로 통일
  const c = String(raw).toLowerCase().trim();
  const map = {
    'pan-left': 'left', left: 'left',
    'pan-right': 'right', right: 'right',
    'pan-up': 'up', 'tilt-up': 'up', up: 'up',
    'pan-down': 'down', 'tilt-down': 'down', down: 'down',
    'zoom-in': 'zoomin', '+': 'zoomin', zoomin: 'zoomin',
    'zoom-out': 'zoomout', '-': 'zoomout', zoomout: 'zoomout',
    'focus-in': 'stop', focusin: 'stop', // 🔇 포커스 기능 미사용 → stop으로 맵핑
    'focus-out': 'stop', focusout: 'stop',
    stop: 'stop',
  };
  return map[c] || c; // 📩 미리 정의되지 않은 값은 원문 유지
}
function isPressEvent(evt = '') {
  // 🖱️ 누름(press) 이벤트 여부 판단 → autoStop 처리에 사용
  const e = String(evt).toLowerCase();
  return ['mousedown', 'pointerdown', 'touchstart', 'press', 'keydown'].includes(e);
}
function parseAccessPoint(ap = '') {
  // 🔑 access_point 필드 파싱: id\npassword\n(profileTokens)\n(profileToken)
  const [id, pw, profileTokens, profileToken] = String(ap).split('\n').map(clean);
  return { id: id || '', pw: pw || '', profileTokens: profileTokens || '', profileToken: profileToken || '' };
}
// #️⃣ VMS 경로에서 정수 ID만 쓰는 경우 대응 (정규화 강화)
const normCamId = (id) => {
  const s = String(id ?? '');
  const head = s.includes('.') ? s.split('.')[0] : s;
  const n = parseInt(head, 10);
  return Number.isFinite(n) ? String(n) : head.trim();
};

// 🌐 VMS 베이스 URL 구성 (포트/플래그에 따라 https 자동 판별)
function buildBaseUrl(vms) {
  const host = `${vms.vms_ip}:${vms.vms_port}`;
  const useHttps =
    String(vms.vms_port) === '443' ||
    String(vms?.vms_scheme || '').toLowerCase() === 'https' ||
    String(vms?.https || '').toLowerCase() === 'true';
  return `${useHttps ? 'https' : 'http'}://${host}`;
}

function createCmdAndParams(ptzInfo, speed) {
  // 🧭 프론트 이벤트 → VMS PTZ 파라미터 조립
  const cmd = normalizeCommand(ptzInfo.command);
  const isRelease = ptzInfo.mouseevent === 'mouseup' || ptzInfo.mouseevent === 'mouseleave';
  if (isRelease || cmd === 'stop') return { ptzcmd: 'move', params: 'pan=0&tilt=0' }; // 🛑 놓을 때는 정지
  switch (cmd) {
    case 'left': return { ptzcmd: 'move', params: `pan=-${speed}&tilt=0` };
    case 'right': return { ptzcmd: 'move', params: `pan=${speed}&tilt=0` };
    case 'up': return { ptzcmd: 'move', params: `pan=0&tilt=${speed}` };
    case 'down': return { ptzcmd: 'move', params: `pan=0&tilt=-${speed}` };
    case 'zoomin': return { ptzcmd: 'zoom', params: `value=${speed}` };
    case 'zoomout': return { ptzcmd: 'zoom', params: `value=-${speed}` };
    default: return { ptzcmd: 'move', params: 'pan=0&tilt=0' };
  }
}


// 🔁 VMS 구현별 경로 편차를 최대한 흡수 (vms_name 유무/TelemetryControl 인덱스/접두사 openapi 등)
function buildVmsPaths(vms, camInt, ptzcmd) {
  const name = String(vms?.vms_name || '').trim();
  const encName = encodeURIComponent(name);

  // 흔히 보이는 세그먼트
  const segCtl0 = `/DeviceIpint.${camInt}/TelemetryControl.0`;
  const segCtl = `/DeviceIpint.${camInt}/TelemetryControl`;
  const segBare = `/DeviceIpint.${camInt}`; // 어떤 구현은 /Telemetry 없이 동작

  // 이름 포함/미포함 버전 모두 시도
  const withName = (tail) => name ? `/${encName}${tail}` : tail;

  // 기본 prefix
  const base = [
    `/control/telemetry/${ptzcmd}${withName(segCtl0)}`,
    `/control/telemetry/${ptzcmd}${withName(segCtl)}`,
    `/control/telemetry/${ptzcmd}${withName(segBare)}`,
    // 이름 미포함
    `/control/telemetry/${ptzcmd}${segCtl0}`,
    `/control/telemetry/${ptzcmd}${segCtl}`,
    `/control/telemetry/${ptzcmd}${segBare}`,
  ];

  // 일부 시스템은 /openapi 접두사를 요구
  const openapi = base.map(p => `/openapi${p}`);

  // 어떤 제품은 action을 path 세그먼트로 요구 (…/move/… 와 동일하지만 안전하게 추가)
  const altVerb = [
    `/control/telemetry/${ptzcmd}${withName(`/DeviceIp.${camInt}`)}`, // 드물게 Ipint가 아닌 Ip
    `/control/telemetry/${ptzcmd}/DeviceIp.${camInt}`,
  ];

  // 마지막으로 끝 슬래시 유무 차이 보정
  const withTrailing = (paths) => {
    const out = [];
    for (const p of paths) { out.push(p, `${p}/`); }
    return out;
  };

  return withTrailing([...base, ...openapi, ...altVerb]);
}


async function vmsTryAll(baseUrl, vms, camInt, ptzcmd, qs, cfg) {
  // ✅ 쿼리 조합(세트): session_id 유/무, mode 유/무
  const q0 = qs; // 원본 (예: ?mode=continuous&pan=10&tilt=0&session_id=0)
  const q1 = q0.replace(/&?session_id=0\b/i, '');
  const q2 = q1.replace(/\?mode=[^&]+&?/, '?');
  const qsCandidates = Array.from(new Set([q0, q1, q2]));

  // ✅ POST 바디 포맷 2종: form, json
  const postHeadersForm = { ...cfg.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
  const postHeadersJson = { ...cfg.headers, 'Content-Type': 'application/json' };

  // ✅ 경로 후보군 생성
  const paths = buildVmsPaths(vms, camInt, ptzcmd);

  // 성공 판정
  const ok = (res) => res && res.status >= 200 && res.status < 300;

  for (const p of paths) {
    for (const qsx of qsCandidates) {
      const url = `${baseUrl}${p}${qsx}`;

      // 1) GET 우선
      const getRes = await axios.get(url, cfg).catch((err) => ({
        status: err?.response?.status ?? 0,
        data: err?.message
      }));
      logger.info(`[PTZ VMS TRY][GET] ${url} -> ${getRes.status}`);
      if (ok(getRes)) return getRes.data;

      // 2) GET 실패 시 같은 엔드포인트로 POST(form) 시도
      if ([400, 404, 405, 415, 500].includes(getRes.status)) {
        const bodyForm = qsx.startsWith('?') ? qsx.slice(1) : qsx; // ? 제거
        const postForm = await axios.post(`${baseUrl}${p}`, bodyForm, { ...cfg, headers: postHeadersForm })
          .catch((err) => ({ status: err?.response?.status ?? 0, data: err?.message }));
        logger.info(`[PTZ VMS TRY][POST-form] ${baseUrl}${p} body="${bodyForm}" -> ${postForm.status}`);
        if (ok(postForm)) return postForm.data;

        // 3) 일부 구현은 JSON 바디를 요구
        const params = Object.fromEntries(new URLSearchParams(bodyForm));
        const postJson = await axios.post(`${baseUrl}${p}`, params, { ...cfg, headers: postHeadersJson })
          .catch((err) => ({ status: err?.response?.status ?? 0, data: err?.message }));
        logger.info(`[PTZ VMS TRY][POST-json] ${baseUrl}${p} body=${JSON.stringify(params)} -> ${postJson.status}`);
        if (ok(postJson)) return postJson.data;
      }
      // 다음 조합 계속
    }
  }
  // ❌ 모든 시도 실패
  throw new Error('VMS PTZ endpoints rejected');
}

// ✅ VMS 요청용 Axios 공통 옵션 (GET/POST 둘 다 재활용)
function axiosVmsOpts(vms) {
  return {
    timeout: 5000,                              // ⏲️ 느린 장비 대비 타임아웃
    auth: { username: vms.vms_id, password: vms.vms_pw }, // 🔐 Basic Auth
    validateStatus: () => true,                 // 🔎 상태코드는 호출부에서 판단
    headers: { Accept: 'application/json,*/*' } // 📥 가벼운 응답 선호
  };
}

async function vmsSendPTZ(baseUrl, vms, cameraId, cmdAndParams, mode = 'continuous') {
  // 🚀 VMS에 연속 이동/줌 명령 전송
  const camInt = normCamId(cameraId);
  const cfg = axiosVmsOpts(vms);
  const qs = `?mode=${encodeURIComponent(mode)}&${cmdAndParams.params}&session_id=0`;
  return await vmsTryAll(baseUrl, vms, camInt, cmdAndParams.ptzcmd, qs, cfg);
}
async function vmsSendStop(baseUrl, vms, cameraId, direction, mode = 'continuous') {
  // 🛑 VMS 정지: 이동인지 줌인지에 따라 파라미터 분기
  const camInt = normCamId(cameraId);
  const isZoom = /zoom/i.test(direction || '');
  const ptzcmd = isZoom ? 'zoom' : 'move';
  const cfg = axiosVmsOpts(vms);
  const qs = `?mode=${encodeURIComponent(mode)}&${ptzcmd === 'move' ? 'pan=0&tilt=0' : 'value=0'}&session_id=0`;
  await vmsTryAll(baseUrl, vms, camInt, ptzcmd, qs, cfg);
}

/* =========================
 * Hanwha Digest REST (require 버전)
 * ========================= */
async function maybeHanwhaReachable(cameraIp) {
  // 🩺 카메라 REST 엔드포인트 가용성 빠른 체크(타임아웃 짧게)
  const url = `http://${cameraIp}/stw-cgi/ptzcontrol.cgi?msubmenu=relative&action=control&Channel=0&Pan=0&Tilt=0&Zoom=0`;
  try {
    const res = await axios.get(url, { validateStatus: () => true, timeout: 1500 });
    return res.status > 0; // 📶 0 초과면 어느 정도 응답했다고 판단
  } catch {
    return false; // 🚫 네트워크 오류
  }
}

async function hanwhaSendPTZ(cameraIp, username, password, cmd, channel = 0) {
  // 🧭 Hanwha 전용 relative one-shot 호출: 짧은 burst로 버튼 연속 입력 감각 구현
  const invertPan = true;   // 🔄 설치 방향 차이 보정(필드에서 반대로 움직일 때 유용)
  const panStep = 10;     // 🎚️ 상대 이동 단위 (Pan)
  const tiltStep = 10;     // 🎚️ 상대 이동 단위 (Tilt)
  const zoomStep = 0.5;    // 🎚️ 상대 이동 단위 (Zoom)
  const burstCount = cmd === 'stop' ? 1 : 3; // 🔁 연속 요청 횟수(지속감)
  const burstDelayMs = 100;     // ⏱️ 호출 간격(ms)

  let pan = 0, tilt = 0, zoom = 0; // 🎯 상대 이동 벡터 초기화
  switch (cmd) {
    case 'up': tilt = tiltStep; break;
    case 'down': tilt = -tiltStep; break;
    case 'left': pan = invertPan ? panStep : -panStep; break;
    case 'right': pan = invertPan ? -panStep : panStep; break;
    case 'zoomin': zoom = zoomStep; break;
    case 'zoomout': zoom = -zoomStep; break;
    case 'stop':
    default: pan = 0; tilt = 0; zoom = 0;
  }

  const baseUrl = `http://${cameraIp}/stw-cgi/ptzcontrol.cgi`;
  const makeQs = (p, t, z) =>
    `?msubmenu=relative&action=control&Channel=${Number(channel) || 0}&Pan=${p}&Tilt=${t}&Zoom=${z}`;

  const agent = new http.Agent({ keepAlive: true, keepAliveMsecs: 5000, maxSockets: 16 }); // 🔗 연결 재사용으로 지연 감소

  // ✅ require 로딩된 digest-fetch 사용 (2.0.3)
  const client = new DigestFetch(username, password, { algorithm: 'MD5' }); // 🔐 Hanwha Digest 인증

  for (let i = 0; i < burstCount; i++) {
    try {
      await client.fetch(baseUrl + makeQs(pan, tilt, zoom), {
        method: 'GET',
        headers: { 'Connection': 'keep-alive', 'Cache-Control': 'no-cache' }, // 🧊 캐시 방지 + keep-alive
        agent
      });
    } catch (e) {
      logger.warn(`[HANWHA PTZ] burst#${i + 1}/${burstCount} error: ${e.message}`); // 🧾 실패해도 다음 burst 진행
    }
    if (i < burstCount - 1) await sleep(burstDelayMs); // ⏸️ 짧은 간격 대기
  }
  return true; // ✅ 전송 시도 완료(에러는 로그로만 처리)
}

/* =========================
 * ONVIF(독립 카메라)
 * - 표준 SOAP 기반 연속 이동(ContinuousMove)/정지(Stop)
 * - 인증 폴백: Digest → Basic → WS-Security(UsernameToken)
 * - 서비스 목록에서 PTZ/Media XAddr 동적 추출(제조사/펌웨어 다양성 대응)
 * ========================= */

// getServices 반환 형태가 제조사/라이브러리별로 들쭉날쭉하므로 배열로 정규화
function normalizeServices(svcs) {
  if (!svcs) return [];
  if (Array.isArray(svcs)) return svcs;
  if (Array.isArray(svcs.Services)) return svcs.Services;
  if (svcs.data && Array.isArray(svcs.data.Services)) return svcs.data.Services;
  if (svcs.XAddr || svcs.xaddr || svcs.Address || svcs.Url) return [svcs];

  const vals = Object.values(svcs);
  const arrInside = vals.find((v) => Array.isArray(v) && v.length && (v[0]?.XAddr || v[0]?.Namespace));
  if (arrInside) return arrInside;

  const objInside = vals.find((v) => v && typeof v === 'object' && (v.Services || v.data?.Services));
  if (objInside) return normalizeServices(objInside);
  return [];
}

// truthy 첫 값 선택(간단 유틸)
function firstTruthy(...xs) { for (const x of xs) if (x) return x; return undefined; }
// 서비스 객체에서 XAddr 후보키를 고르게 추출
function pickXAddr(svc) { return firstTruthy(svc?.XAddr, svc?.xaddr, svc?.Address, svc?.Url); }

// PTZ 서비스 XAddr 찾기
function getPtzXAddr(rawServices = []) {
  const services = normalizeServices(rawServices);
  const svc = services.find((s) => {
    const x = String(pickXAddr(s) || '').toLowerCase();
    const ns = String(s?.Namespace || '').toLowerCase();
    return x.includes('/onvif/ptz') || ns.includes('ptz');
  });
  return pickXAddr(svc);
}

// Media 서비스 XAddr 찾기(프로파일 토큰 조회용)
function getMediaXAddr(rawServices = []) {
  const services = normalizeServices(rawServices);
  const svc = services.find((s) => {
    const x = String(pickXAddr(s) || '').toLowerCase();
    const ns = String(s?.Namespace || '').toLowerCase();
    return x.includes('/onvif/media') || ns.includes('media');
  });
  return pickXAddr(svc);
}

// 상대경로 XAddr 보정: http://host + 경로
function ensureHttpUrl(xaddr, host) {
  if (!xaddr) return `http://${host}/onvif/PTZ`; // 🧯 최소 기본값으로라도 반환
  if (/^http(s)?:\/\//i.test(xaddr)) return xaddr; // 이미 절대경로면 그대로 사용
  return `http://${host}${xaddr.startsWith('/') ? '' : '/'}${xaddr}`; // 호스트 기준으로 보정
}

// SOAP 1.2 설정 및 액션 URI(ONVIF 표준)
const SOAP12 = 'application/soap+xml; charset=utf-8';
const SOAP_ACTION_CM = 'http://www.onvif.org/ver20/ptz/wsdl/ContinuousMove';
const SOAP_ACTION_STOP = 'http://www.onvif.org/ver20/ptz/wsdl/Stop';

// SOAP Envelope 래퍼(헤더/바디 삽입)
const soapEnv = (body, header = '<s:Header/>') => `
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
    ${header}
    <s:Body>${body}</s:Body>
  </s:Envelope>
`.trim();

// ContinuousMove 요청 바디 생성
const buildContinuousMove = (token, { x, y, z }, timeoutSec = 8.0) => `
  <tptz:ContinuousMove xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
    <tptz:ProfileToken>${token}</tptz:ProfileToken>
    <tptz:Velocity xmlns:tt="http://www.onvif.org/ver10/schema">
      <tt:PanTilt x="${x}" y="${y}"/>
      <tt:Zoom x="${z}"/>
    </tptz:Velocity>
    <tptz:Timeout>PT${Math.max(0.2, Math.min(timeoutSec, 10)).toFixed(1)}S</tptz:Timeout>
  </tptz:ContinuousMove>
`.trim();

// Stop 요청 바디 생성(팬틸트/줌 모두 정지)
const buildStop = (token, stopPanTilt = true, stopZoom = true) => `
  <tptz:Stop xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
    <tptz:ProfileToken>${token}</tptz:ProfileToken>
    <tptz:PanTilt>${stopPanTilt}</tptz:PanTilt>
    <tptz:Zoom>${stopZoom}</tztz:Zoom>
  </tptz:Stop>
`.trim();

// WS-Security UsernameToken 헤더 구성(Basic/Digest 실패 시 대안)
function buildWsseHeader(username, password) {
  const u = clean(username);
  const p = clean(password);
  return `
    <s:Header>
      <wsse:Security s:mustUnderstand="1"
        xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
        xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <wsse:UsernameToken>
          <wsse:Username>${u}</wsse:Username>
          <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${p}</wsse:Password>
        </wsse:UsernameToken>
      </wsse:Security>
    </s:Header>
  `.trim();
}

// 커맨드 → 연속 이동 속도 벡터로 매핑(제조사 안전 범위로 클램핑)
const onvifSpeedFrom = (cmd, base = 0.04) => {
  const v = clamp(base, 0.02, 0.3); // ✅ 장비 호환을 위한 보수적 범위
  switch (cmd) {
    case 'left': return { x: -v, y: 0, z: 0 };
    case 'right': return { x: v, y: 0, z: 0 };
    case 'up': return { x: 0, y: v, z: 0 };
    case 'down': return { x: 0, y: -v, z: 0 };
    case 'zoomin': return { x: 0, y: 0, z: v };
    case 'zoomout': return { x: 0, y: 0, z: -v };
    default: return { x: 0, y: 0, z: 0 };
  }
};

/**
 * 공통 SOAP 호출자
 * - authMode에 따라 Digest/Basci/None(WSSE만) 선택
 * - 2xx 외에는 오류로 간주(상위에서 폴백)
 */
async function onvifSoapCall({ digestAuth, xaddr, xml, actionUri = '', authMode = 'digest', basicAuth }) {
  const headers = { 'Content-Type': SOAP12 + (actionUri ? `; action="${actionUri}"` : '') };
  const axiosCfg = {
    method: 'post',
    url: xaddr,
    headers,
    data: xml,
    timeout: 5000,
    validateStatus: () => true,
  };

  let res;
  if (authMode === 'digest') {
    res = await digestAuth.request(axiosCfg); // 🔐 Digest 인증 경로
  } else if (authMode === 'basic') {
    res = await axios.request({ ...axiosCfg, auth: basicAuth }); // 🔐 Basic 인증 경로
  } else {
    res = await axios.request(axiosCfg); // ⬜ HTTP 인증 없음(WSSE만 사용)
  }

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`ONVIF SOAP ${res.status}: ${String(res.data || '').slice(0, 200)}`); // ❗ 오류는 상위에서 폴백
  }
  return res.data; // 📦 SOAP XML 문자열(혹은 라이브러리 래핑객체)
}

/**
 * ONVIF 이동(ContinuousMove)
 * - Digest 실패 시 Basic → 그래도 안 되면 WS-Security 순으로 폴백
 * - holdTimeoutSec: ContinuousMove 타임아웃(초)
 */
async function onvifSendPTZ({ camIp, user, pass, profileToken, holdTimeoutSec }, cmd) {
  const u = clean(user), p = clean(pass);
  const digestAuth = getDigest(u, p);
  const raw = await getServices({ digestAuth, CAM_HOST: camIp, CAM_USER: u, CAM_PASS: p }).catch(e => {
    throw new Error(`getServices fail: ${e.message}`); // 🔎 서비스 검색 단계 오류
  });

  const ptzXAddrRaw = getPtzXAddr(raw);
  const ptzXAddr = ensureHttpUrl(ptzXAddrRaw, camIp);
  if (!ptzXAddr) throw new Error('PTZ service XAddr not found'); // 🚫 PTZ 서비스 미발견

  const vel = onvifSpeedFrom(cmd, 0.04);
  const xmlBody = buildContinuousMove(profileToken, vel, holdTimeoutSec ?? 8.0);

  // 🔐 Digest → Basic → WS-Security 순서로 재시도
  try {
    const xml = soapEnv(xmlBody);
    return await onvifSoapCall({ digestAuth, xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'digest' });
  } catch (e1) {
    if (!/401/.test(String(e1.message))) throw e1; // 🚦 인증 실패 외에는 폴백하지 않음
    logger.warn(`[ONVIF] Digest 401 → Basic fallback (${ptzXAddr})`);
    try {
      const xml = soapEnv(xmlBody);
      return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'basic', basicAuth: { username: u, password: p } });
    } catch (e2) {
      if (!/401/.test(String(e2.message))) throw e2; // 또 다른 오류면 그대로 전파
      logger.warn(`[ONVIF] Basic 401 → WS-Security UsernameToken fallback (${ptzXAddr})`);
      const wsse = buildWsseHeader(u, p);
      const xml = soapEnv(xmlBody, wsse);
      return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'none' });
    }
  }
}

/**
 * ONVIF 정지(Stop)
 * - 이동과 동일한 인증 폴백 전략 적용
 */
async function onvifSendStop({ camIp, user, pass, profileToken }) {
  const u = clean(user), p = clean(pass);
  const digestAuth = getDigest(u, p);
  const raw = await getServices({ digestAuth, CAM_HOST: camIp, CAM_USER: u, CAM_PASS: p }).catch(e => {
    throw new Error(`getServices fail: ${e.message}`);
  });

  const ptzXAddrRaw = getPtzXAddr(raw);
  const ptzXAddr = ensureHttpUrl(ptzXAddrRaw, camIp);
  if (!ptzXAddr) throw new Error('PTZ service XAddr not found');

  const xmlBody = buildStop(profileToken, true, true);

  try {
    const xml = soapEnv(xmlBody);
    return await onvifSoapCall({ digestAuth, xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_STOP, authMode: 'digest' });
  } catch (e1) {
    if (!/401/.test(String(e1.message))) throw e1;
    logger.warn(`[ONVIF] Digest 401 → Basic fallback (STOP)`);
    try {
      const xml = soapEnv(xmlBody);
      return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_STOP, authMode: 'basic', basicAuth: { username: u, password: p } });
    } catch (e2) {
      if (!/401/.test(String(e2.message))) throw e2;
      logger.warn(`[ONVIF] Basic 401 → WS-Security UsernameToken fallback (STOP)`);
      const wsse = buildWsseHeader(u, p);
      const xml = soapEnv(xmlBody, wsse);
      return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_STOP, authMode: 'none' });
    }
  }
}

/* =========================
 * 공개: PTZ 제어 (VMS 분기 / 개별 ONVIF→Hanwha 폴백)
 * ========================= */
/**
 * ptzCameraControl
 * - VMS 이름이 주어지면 VMS REST 경로를 우선 사용
 * - 아니면 독립 카메라 경로: ONVIF 시도 → 실패 시 Hanwha REST로 폴백
 * - 누름 이벤트(press) 시 autoStopMs > 0이면 일정 시간 후 자동 정지 호출
 *
 * @param {{
 *  cameraId: string|number,
 *  direction: string,                // 'left'|'right'|'up'|'down'|'zoomin'|'zoomout'|'stop' 등
 *  mode?: string,                    // VMS 모드: 'continuous' 등
 *  eventType: 'mousedown'|'mouseup'|'mouseleave'|'pointerdown'|'touchstart',
 *  vmsName?: string,
 *  mainServiceName: string,
 *  cameraIp?: string,
 *  cameraUser?: string,
 *  cameraPass?: string,
 *  cameraProfileToken?: string,
 *  autoStopMs?: number,
 *  holdTimeoutSec?: number
 * }} args
 */
exports.ptzCameraControl = async (args) => {
  const {
    cameraId,
    direction,
    mode,
    eventType,
    vmsName = '',
    mainServiceName,
    cameraIp = '',
    cameraUser = '',
    cameraPass = '',
    cameraProfileToken = '',
    autoStopMs = 0,
    holdTimeoutSec = 8.0,
  } = args;

  const client = await pool.connect(); // 🔗 단일 함수 내 여러 쿼리를 위해 커넥션 확보
  try {
    const cmd = normalizeCommand(direction); // 🎛️ 입력 명령 표준화
    const isPress = isPressEvent(eventType); // 🤏 press(누름) 이벤트 여부

    /* ---- 1) VMS 경로 ---- */
    if (vmsName) {
      // 🗂️ VMS 접속 정보 로드 (IP/포트/계정)
      const res = await client.query(vmsMapper.getVmsInfo(), [vmsName, mainServiceName]);
      if (!res || res.rowCount === 0) throw new Error('VMS 정보를 찾을 수 없습니다.');
      const vmsInfo = res.rows[0];
      const baseUrl = buildBaseUrl(vmsInfo);

      // 🧭 프론트 이벤트 → VMS 파라미터 변환
      const ptzInfo = { command: cmd, mouseevent: eventType };
      const rawSpeed = isPress ? 0.04 : 0; // ⛽ 누르는 동안만 속도 부여
      const speed = clamp(rawSpeed, 0, 0.5); // 🛡️ 안전한 범위 제한
      const cmdAndParams = createCmdAndParams(ptzInfo, speed);

      // 📤 VMS 전송(내부에서 경로/파라미터 가변 시도)
      await vmsSendPTZ(baseUrl, vmsInfo, cameraId, cmdAndParams, mode || 'continuous');

      // ⏹️ 자동 정지(옵션): 누름 이벤트 + autoStopMs
      if (isPress && autoStopMs > 0) {
        setTimeout(() => {
          vmsSendStop(baseUrl, vmsInfo, cameraId, cmd, mode || 'continuous')
            .catch((e) => logger.warn(`[VMS STOP auto] ${e.message}`));
        }, autoStopMs);
      }
      return { success: true, path: 'vms' }; // ✅ VMS 경로 성공 반환
    }

    /* ---- 2) 개별 카메라 경로: ONVIF 먼저 → 실패 시 Hanwha REST ---- */
    // 2-1. DB/파라미터에서 개별카메라 접속정보 보충
    let camHost = cameraIp;
    let camUserName = cameraUser;
    let camPassword = cameraPass;
    let profileToken = cameraProfileToken;

    if (!camHost || !camUserName || !camPassword) {
      const list = await client.query(
        cameraMapper.getIndependentCameraDetail(),
        [mainServiceName, 'independent', cameraId]
      );
      if (!list || list.rowCount === 0) throw new Error('독립 카메라 정보를 찾을 수 없습니다.');

      const row = list.rows[0];
      if (!camHost) camHost = row?.ip_address || row?.camera_ip || '';

      // 🔑 access_point: id\npassword\n(profileTokens)\n(profileToken)
      const ap = parseAccessPoint(row?.access_point || '');
      if (!camUserName) camUserName = ap.id;
      if (!camPassword) camPassword = ap.pw;
      if (!profileToken) profileToken = ap.profileToken;
    }

    // 2-2. ONVIF profileToken 없으면 Media 서비스에서 조회
    if (!profileToken) {
      try {
        const digestAuth = getDigest(camUserName, camPassword);
        const rawSvcs = await getServices({ digestAuth, CAM_HOST: camHost, CAM_USER: camUserName, CAM_PASS: camPassword });
        const mediaXAddrRaw = getMediaXAddr(rawSvcs);
        const mediaXAddr = ensureHttpUrl(mediaXAddrRaw, camHost);
        const tokens = await getProfileToken({ mediaXAddr, digestAuth, CAM_USER: camUserName, CAM_PASS: camPassword });
        profileToken = tokens?.[0]?.token || '';
      } catch (e) {
        logger.warn(`[ONVIF token fetch fail] ${e.message}`); // 📝 토큰 조회 실패 시에도 폴백을 위해 진행
      }
    }

    // 2-3. ONVIF 시도(이동/정지)
    try {
      if (!profileToken) throw new Error('ONVIF profileToken 없음');
      if (isPress) {
        await onvifSendPTZ({ camIp: camHost, user: camUserName, pass: camPassword, profileToken, holdTimeoutSec }, cmd);
        if (autoStopMs > 0) {
          setTimeout(() => {
            onvifSendStop({ camIp: camHost, user: camUserName, pass: camPassword, profileToken })
              .catch((e) => logger.warn(`[ONVIF STOP auto] ${e.message}`));
          }, autoStopMs);
        }
      } else {
        await onvifSendStop({ camIp: camHost, user: camUserName, pass: camPassword, profileToken });
      }
      return { success: true, path: 'onvif' }; // ✅ ONVIF 경로 성공
    } catch (eOnvif) {
      logger.warn(`[ONVIF path failed] ${eOnvif.message} → Hanwha fallback`); // 🔄 Hanwha 폴백 공지
    }

    // 2-4. Hanwha Digest REST 폴백 — relative one-shot (내부에서 burst 처리)
    const hanwhaOk = await maybeHanwhaReachable(camHost);
    if (!hanwhaOk) throw new Error('Hanwha REST 도달 불가');

    if (isPress) {
      await hanwhaSendPTZ(camHost, camUserName, camPassword, cmd);
      if (autoStopMs > 0) {
        setTimeout(() => {
          hanwhaSendPTZ(camHost, camUserName, camPassword, 'stop').catch(() => { }); // 🧯 실패 무시
        }, autoStopMs);
      }
    } else {
      // 🛑 release/stop 이벤트에 대해서도 명시적 정지 호출(잔류 움직임 방지)
      await hanwhaSendPTZ(camHost, camUserName, camPassword, 'stop').catch(() => { });
    }

    return { success: true, path: 'hanwha' }; // ✅ Hanwha 폴백 성공

  } catch (error) {
    // 🛡️ 최상위 예외 처리: 상태코드/본문 일부를 포함해 진단 로그 남김
    const status = error?.response?.status;
    const data = error?.response?.data;
    logger.error(
      `cameraService.ptzCameraControl error: ${error?.message}` +
      (status ? ` (status=${status} body=${JSON.stringify(data)})` : '')
    );
    throw error; // ⬆️ 컨트롤러로 예외 전파 → 호출 측에서 HTTP 응답 매핑
  } finally {
    await client.release(); // 🔚 커넥션 반납(누수 방지)
  }
};
