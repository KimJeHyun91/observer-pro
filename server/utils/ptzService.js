const axios = require('axios');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth');
const http = require('http');
const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');
const DigestFetch = require('digest-fetch');
const { getServices, getProfileToken } = require('../worker/common/onvifStream');
const cameraMapper = require('../routes/observer/mappers/cameraMapper');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const getDigest = (username, password) =>

    new (AxiosDigestAuth.default || AxiosDigestAuth)({ username, password });
const clean = (s = '') => String(s).replace(/\r/g, '').trim();

function normalizeCommand(raw = '') {
    const c = String(raw).toLowerCase().trim();
    const map = {
        'pan-left': 'left', left: 'left',
        'pan-right': 'right', right: 'right',
        'pan-up': 'up', 'tilt-up': 'up', up: 'up',
        'pan-down': 'down', 'tilt-down': 'down', down: 'down',
        'zoom-in': 'zoomin', '+': 'zoomin', zoomin: 'zoomin',
        'zoom-out': 'zoomout', '-': 'zoomout', zoomout: 'zoomout',
        'focus-in': 'stop', focusin: 'stop',
        'focus-out': 'stop', focusout: 'stop',
        stop: 'stop',
    };
    return map[c] || c;
}

function isPressEvent(evt = '') {
    const e = String(evt).toLowerCase();
    return ['mousedown', 'pointerdown', 'touchstart', 'press', 'keydown'].includes(e);
}

function parseAccessPoint(ap = '') {
    const [id, pw, profileTokens, profileToken] = String(ap).split('\n').map(clean);
    return { id: id || '', pw: pw || '', profileTokens: profileTokens || '', profileToken: profileToken || '' };
}

async function maybeHanwhaReachable(cameraIp) {
    const url = `http://${cameraIp}/stw-cgi/ptzcontrol.cgi?msubmenu=relative&action=control&Channel=0&Pan=0&Tilt=0&Zoom=0`;
    try {
        const res = await axios.get(url, { validateStatus: () => true, timeout: 1500 });
        return res.status > 0;
    } catch {
        return false;
    }
}

async function hanwhaSendPTZ(cameraIp, username, password, cmd, channel = 0) {
    const invertPan = true;   // 좌우 반전 
    const invertTilt = true;  // 상하 반전 

    const panStep = 10;
    const tiltStep = 10;
    const zoomStep = 0.5;
    const burstCount = cmd === 'stop' ? 1 : 3;
    const burstDelayMs = 100;

    let pan = 0, tilt = 0, zoom = 0;

    switch (cmd) {
        case 'up':
            tilt = invertTilt ? -tiltStep : tiltStep;
            break;
        case 'down':
            tilt = invertTilt ? tiltStep : -tiltStep;
            break;
        case 'left':
            pan = invertPan ? panStep : -panStep;
            break;
        case 'right':
            pan = invertPan ? -panStep : panStep;
            break;
        case 'zoomin':
            zoom = zoomStep;
            break;
        case 'zoomout':
            zoom = -zoomStep;
            break;
        case 'stop':
        default:
            pan = 0;
            tilt = 0;
            zoom = 0;
    }

    const baseUrl = `http://${cameraIp}/stw-cgi/ptzcontrol.cgi`;
    const makeQs = (p, t, z) =>
        `?msubmenu=relative&action=control&Channel=${Number(channel) || 0}&Pan=${p}&Tilt=${t}&Zoom=${z}`;

    const agent = new http.Agent({ keepAlive: true, keepAliveMsecs: 5000, maxSockets: 16 });
    const client = new DigestFetch(username, password, { algorithm: 'MD5' });

    for (let i = 0; i < burstCount; i++) {
        try {
            await client.fetch(baseUrl + makeQs(pan, tilt, zoom), {
                method: 'GET',
                headers: { 'Connection': 'keep-alive', 'Cache-Control': 'no-cache' },
                agent
            });
        } catch (e) {
            logger.warn(`[HANWHA PTZ] burst#${i + 1}/${burstCount} error: ${e.message}`);
        }
        if (i < burstCount - 1) await sleep(burstDelayMs);
    }
    return true;
}

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

function firstTruthy(...xs) {
    for (const x of xs) if (x) return x;
    return undefined;
}

function pickXAddr(svc) {
    return firstTruthy(svc?.XAddr, svc?.xaddr, svc?.Address, svc?.Url);
}

function getPtzXAddr(rawServices = []) {
    const services = normalizeServices(rawServices);
    const svc = services.find((s) => {
        const x = String(pickXAddr(s) || '').toLowerCase();
        const ns = String(s?.Namespace || '').toLowerCase();
        return x.includes('/onvif/ptz') || ns.includes('ptz');
    });
    return pickXAddr(svc);
}

function getMediaXAddr(rawServices = []) {
    const services = normalizeServices(rawServices);
    const svc = services.find((s) => {
        const x = String(pickXAddr(s) || '').toLowerCase();
        const ns = String(s?.Namespace || '').toLowerCase();
        return x.includes('/onvif/media') || ns.includes('media');
    });
    return pickXAddr(svc);
}

function ensureHttpUrl(xaddr, host) {
    if (!xaddr) return `http://${host}/onvif/PTZ`;
    if (/^http(s)?:\/\//i.test(xaddr)) return xaddr;
    return `http://${host}${xaddr.startsWith('/') ? '' : '/'}${xaddr}`;
}

const SOAP12 = 'application/soap+xml; charset=utf-8';
const SOAP_ACTION_CM = 'http://www.onvif.org/ver20/ptz/wsdl/ContinuousMove';
const SOAP_ACTION_STOP = 'http://www.onvif.org/ver20/ptz/wsdl/Stop';

const soapEnv = (body, header = '<s:Header/>') => `
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
    ${header}
    <s:Body>${body}</s:Body>
  </s:Envelope>
`.trim();

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

const buildStop = (token, stopPanTilt = true, stopZoom = true) => `
  <tptz:Stop xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
    <tptz:ProfileToken>${token}</tptz:ProfileToken>
    <tptz:PanTilt>${stopPanTilt}</tptz:PanTilt>
    <tptz:Zoom>${stopZoom}</tptz:Zoom>
  </tptz:Stop>
`.trim();

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

const onvifSpeedFrom = (cmd, base = 0.04) => {
    const v = clamp(base, 0.02, 0.3);
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
        res = await digestAuth.request(axiosCfg);
    } else if (authMode === 'basic') {
        res = await axios.request({ ...axiosCfg, auth: basicAuth });
    } else {
        res = await axios.request(axiosCfg);
    }

    if (res.status < 200 || res.status >= 300) {
        throw new Error(`ONVIF SOAP ${res.status}: ${String(res.data || '').slice(0, 200)}`);
    }
    return res.data;
}

async function onvifSendPTZ({ camIp, user, pass, profileToken, holdTimeoutSec }, cmd) {
    const u = clean(user), p = clean(pass);
    const digestAuth = getDigest(u, p);
    const raw = await getServices({ digestAuth, CAM_HOST: camIp, CAM_USER: u, CAM_PASS: p }).catch(e => {
        throw new Error(`getServices fail: ${e.message}`);
    });

    const ptzXAddrRaw = getPtzXAddr(raw);
    const ptzXAddr = ensureHttpUrl(ptzXAddrRaw, camIp);
    if (!ptzXAddr) throw new Error('PTZ service XAddr not found');

    const vel = onvifSpeedFrom(cmd, 0.04);
    const xmlBody = buildContinuousMove(profileToken, vel, holdTimeoutSec ?? 8.0);

    try {
        const xml = soapEnv(xmlBody);
        return await onvifSoapCall({ digestAuth, xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'digest' });
    } catch (e1) {
        if (!/401/.test(String(e1.message))) throw e1;
        logger.warn(`[ONVIF] Digest 401 → Basic fallback (${ptzXAddr})`);
        try {
            const xml = soapEnv(xmlBody);
            return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'basic', basicAuth: { username: u, password: p } });
        } catch (e2) {
            if (!/401/.test(String(e2.message))) throw e2;
            logger.warn(`[ONVIF] Basic 401 → WS-Security UsernameToken fallback (${ptzXAddr})`);
            const wsse = buildWsseHeader(u, p);
            const xml = soapEnv(xmlBody, wsse);
            return await onvifSoapCall({ xaddr: ptzXAddr, xml, actionUri: SOAP_ACTION_CM, authMode: 'none' });
        }
    }
}

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

exports.ptzCameraControl = async (args) => {
    const {
        cameraId,
        direction,
        eventType,
        mainServiceName,
        cameraIp = '',
        cameraUser = '',
        cameraPass = '',
        cameraProfileToken = '',
        autoStopMs = 0,
        holdTimeoutSec = 8.0,
    } = args;

    const client = await pool.connect();

    try {
        const cmd = normalizeCommand(direction);
        const isPress = isPressEvent(eventType);

        // Independent 카메라 정보 보충
        let camHost = cameraIp;
        let camUserName = cameraUser;
        let camPassword = cameraPass;
        let profileToken = cameraProfileToken;

        if (!camHost || !camUserName || !camPassword) {
            const list = await client.query(
                cameraMapper.getIndependentCameraDetail(),
                [mainServiceName, 'independent', cameraId]
            );
            if (!list || list.rowCount === 0) {
                throw new Error('독립 카메라 정보를 찾을 수 없습니다.');
            }

            const row = list.rows[0];
            if (!camHost) camHost = row?.ip_address || row?.camera_ip || '';

            const ap = parseAccessPoint(row?.access_point || '');
            if (!camUserName) camUserName = ap.id;
            if (!camPassword) camPassword = ap.pw;
            if (!profileToken) profileToken = ap.profileToken;
        }

        // profileToken 없으면 Media 서비스에서 조회
        if (!profileToken) {
            try {
                const digestAuth = getDigest(camUserName, camPassword);
                const rawSvcs = await getServices({
                    digestAuth,
                    CAM_HOST: camHost,
                    CAM_USER: camUserName,
                    CAM_PASS: camPassword
                });
                const mediaXAddrRaw = getMediaXAddr(rawSvcs);
                const mediaXAddr = ensureHttpUrl(mediaXAddrRaw, camHost);
                const tokens = await getProfileToken({
                    mediaXAddr,
                    digestAuth,
                    CAM_USER: camUserName,
                    CAM_PASS: camPassword
                });
                profileToken = tokens?.[0]?.token || '';
            } catch (e) {
                logger.warn(`[ONVIF token fetch fail] ${e.message}`);
            }
        }

        // ONVIF 시도
        try {
            if (!profileToken) throw new Error('ONVIF profileToken 없음');

            if (isPress) {
                await onvifSendPTZ({
                    camIp: camHost,
                    user: camUserName,
                    pass: camPassword,
                    profileToken,
                    holdTimeoutSec
                }, cmd);

                if (autoStopMs > 0) {
                    setTimeout(() => {
                        onvifSendStop({
                            camIp: camHost,
                            user: camUserName,
                            pass: camPassword,
                            profileToken
                        }).catch((e) => logger.warn(`[ONVIF STOP auto] ${e.message}`));
                    }, autoStopMs);
                }
            } else {
                await onvifSendStop({
                    camIp: camHost,
                    user: camUserName,
                    pass: camPassword,
                    profileToken
                });
            }

            return { success: true, path: 'onvif' };

        } catch (eOnvif) {
            logger.warn(`[ONVIF path failed] ${eOnvif.message} → Hanwha fallback`);
        }

        const hanwhaOk = await maybeHanwhaReachable(camHost);
        if (!hanwhaOk) throw new Error('Hanwha REST 도달 불가');

        if (isPress) {
            await hanwhaSendPTZ(camHost, camUserName, camPassword, cmd);
            if (autoStopMs > 0) {
                setTimeout(() => {
                    hanwhaSendPTZ(camHost, camUserName, camPassword, 'stop').catch(() => { });
                }, autoStopMs);
            }
        } else {
            await hanwhaSendPTZ(camHost, camUserName, camPassword, 'stop').catch(() => { });
        }

        return { success: true, path: 'hanwha' };

    } catch (error) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        logger.error(
            `ptzService.ptzCameraControl error: ${error?.message}` +
            (status ? ` (status=${status} body=${JSON.stringify(data)})` : '')
        );
        throw error;
    } finally {
        await client.release();
    }
};