const AxiosDigestAuth = require('@mhoc/axios-digest-auth');
const axios = require('axios');
const crypto = require('crypto');

async function getServerOffsetMs(xaddr) {
  try {
    const r = await axios.get(xaddr, { validateStatus: () => true, timeout: 3000 });
    const srv = r.headers?.date ? new Date(r.headers.date).getTime() : null;
    return srv ? (srv - Date.now()) : 0;
  } catch {
    return 0; // 없으면 로컬시간 사용
  }
}

function buildWsseHeader(username, password, offsetMs = 0, soapPrefix = 's') {
  const user = String(username ?? '');
  const pwd  = String(password ?? '');
  if (!user || !pwd) throw new Error('WSSE: empty username/password');

  const now = Date.now() + (Number.isFinite(offsetMs) ? offsetMs : 0);
  const created = new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z');

  const nonceRaw = crypto.randomBytes(16);
  const digest = crypto.createHash('sha1')
    .update(Buffer.concat([
      nonceRaw,
      Buffer.from(created, 'utf8'),
      Buffer.from(pwd, 'utf8'),
    ]))
    .digest('base64');
  const nonceB64 = nonceRaw.toString('base64');

  // soapPrefix: 's' (SOAP1.2) 또는 'soapenv' (SOAP1.1)
  return `
  <wsse:Security 
    xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
    xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
    ${soapPrefix}:mustUnderstand="1"
  >
    <wsse:UsernameToken>
      <wsse:Username>${user}</wsse:Username>
      <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</wsse:Password>
      <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</wsse:Nonce>
      <wsu:Created>${created}</wsu:Created>
    </wsse:UsernameToken>
  </wsse:Security>`;
}

function envelopeWithHeaders({ body, wsse, action, to, soap12 = true }) {
  return soap12
    ? `<?xml version="1.0" encoding="UTF-8"?>
        <s:Envelope 
          xmlns:s="http://www.w3.org/2003/05/soap-envelope"
          xmlns:wsa="http://www.w3.org/2005/08/addressing">
        <s:Header>
          <wsa:Action>${action}</wsa:Action>
          <wsa:To>${to}</wsa:To>
          ${wsse}
        </s:Header>
        <s:Body>${body}</s:Body>
      </s:Envelope>`
    : `<?xml version="1.0" encoding="UTF-8"?>
        <soapenv:Envelope 
          xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
          xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
        <soapenv:Header>
        <wsa:Action>${action}</wsa:Action>
        <wsa:To>${to}</wsa:To>
        ${wsse}
        </soapenv:Header>
        <soapenv:Body>${body}</soapenv:Body>
      </soapenv:Envelope>`;
}

// 2) 응답 XML에서 RTSP URI 추출(네임스페이스 다양성 대응)
function extractRtspUri(xml) {
  const s = String(xml);
  return (
    s.match(/<tt:Uri>([^<]+)<\/tt:Uri>/)?.[1] ||
    s.match(/<(?:\w+:)?Uri>(rtsp:[^<]+)<\/(?:\w+:)?Uri>/)?.[1] ||
    s.match(/<(?:\w+:)?MediaUri>[\s\S]*?<(?:\w+:)?Uri>(rtsp:[^<]+)<\/(?:\w+:)?Uri>/)?.[1] ||
    null
  );
}

exports.getServices = async ({ digestAuth, CAM_HOST, CAM_USER, CAM_PASS, CAM_ONVIF_PORT = 80 }) => {
  const deviceXAddr = `http://${CAM_HOST}:${CAM_ONVIF_PORT}/onvif/device_service`;
  const action = 'http://www.onvif.org/ver10/device/wsdl/GetServices';
  const body = `
    <tds:GetServices xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
      <tds:IncludeCapability>false</tds:IncludeCapability>
    </tds:GetServices>`;
  const offset = await getServerOffsetMs(deviceXAddr);
  const wsse = buildWsseHeader(CAM_USER, CAM_PASS, offset);
  try {
      // 1) SOAP 1.2
    const xml12 = envelopeWithHeaders({ body, wsse, action, to: deviceXAddr, soap12: true });
    const r12 = await digestAuth.request({
      url: deviceXAddr,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8'
      },
      method: 'POST',
      data: xml12,
      timeout: 8000,
      validateStatus: () => true,
    });
  if (r12.status >= 200 && r12.status < 300) return r12.data;
  // 2) SOAP 1.1 (일부 장비 전용)
  const xml11 = envelopeWithHeaders({ body, wsse, action, to: deviceXAddr, soap12: false });
  const r11 = await digestAuth.request({
    url: deviceXAddr,
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${action}"`,
    },
    data: xml11,
    timeout: 8000,
    validateStatus: () => true,
  });
  if (r11.status >= 200 && r11.status < 300) return r11.data;
    throw new Error(`status=${r12.status}/${r11.status}`);
  } catch(error){
    throw new Error('ONVIF 서비스 조회 실패: ' + error.message);
  }
};
  
exports.getProfiles = (xml) => {
  const result = findXAddrByNamespaceRegex(xml, 'http://www.onvif.org/ver20/media/wsdl');
  if(!result) {
    throw new Error(`ONVIF Media Service URL 조회 실패, result: ${result}`);
  };
  return result;
  function findXAddrByNamespaceRegex(xml, targetNs) {
    const serviceRe = /<(?:\w+:)?Service\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Service>/g;
    let m;
    while ((m = serviceRe.exec(xml)) !== null) {
      const block = m[1];
      const nsMatch = block.match(/<(?:\w+:)?Namespace>([^<]+)<\/(?:\w+:)?Namespace>/);
      if (nsMatch && nsMatch[1].trim() === targetNs) {
        const xMatch = block.match(/<(?:\w+:)?XAddr>([^<]+)<\/(?:\w+:)?XAddr>/);
        if (xMatch) return xMatch[1].trim();
      }
    }
    return null;
  }
};

/**
* getProfileToken:
* - HTTP Digest(digestAuth) + WSSE + WS-Addressing + SOAP1.2→1.1 폴백
* - Media v20 먼저, 실패 시 v10 재시도
*/
exports.getProfileToken = async ({ mediaXAddr, mediaVersionHint, digestAuth, CAM_USER, CAM_PASS }) => {
  // 1) 서버 시간 오프셋 구하기(401이어도 대부분 Date 헤더는 줍니다)
  const offsetMs = await getServerOffsetMs(mediaXAddr);

  // 2) 버전별 시도 순서: 힌트가 있으면 그쪽을 우선
  const order = mediaVersionHint === 'v20'
    ? ['v20','v10']
    : mediaVersionHint === 'v10'
      ? ['v10','v20']
      : ['v10','v20'];

  const tries = {
    v10: {
      ns: 'http://www.onvif.org/ver10/media/wsdl',
      action: 'http://www.onvif.org/ver10/media/wsdl/GetProfiles',
      body: ns => `<trt:GetProfiles xmlns:trt="${ns}"/>`,
    },
    v20: {
      ns: 'http://www.onvif.org/ver20/media/wsdl',
      action: 'http://www.onvif.org/ver20/media/wsdl/GetProfiles',
      body: ns => `<tr2:GetProfiles xmlns:tr2="${ns}"/>`,
    }
  };

  let lastErr;
  for (const ver of order) {
    const t = tries[ver];

    // --- SOAP 1.2 ---
    const wsse12 = buildWsseHeader(CAM_USER, CAM_PASS, offsetMs, 's'); // 매 요청 재생성
    const soap12 = envelopeWithHeaders({
      body: t.body(t.ns),
      wsse: wsse12,
      action: t.action,
      to: mediaXAddr,
      soap12: true,
    });

    try {
      let res = await digestAuth.request({
        url: mediaXAddr,
        method: 'POST',
        data: soap12,
        headers: { 
          'Content-Type': 'application/soap+xml; charset=utf-8' 
        },
        timeout: 8000,
        validateStatus: () => true,
      });
      if (res.status === 401) throw new Error('WSSE/HTTP 인증 실패 (SOAP1.2)');
      if (res.status >= 200 && res.status < 300 && res.data) {
        const tokensAndNames = extractProfileTokensAndNames(res.data);
        if (tokensAndNames.length) return tokensAndNames;
      }

      // --- SOAP 1.1 ---
      const wsse11 = buildWsseHeader(CAM_USER, CAM_PASS, offsetMs, 'soapenv');
      const soap11 = envelopeWithHeaders({
        body: t.body(t.ns),
        wsse: wsse11,
        action: t.action,
        to: mediaXAddr,
        soap12: false,
      });

      res = await digestAuth.request({
        url: mediaXAddr,
        method: 'POST',
        data: soap11,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"${t.action}"`,
        },
        timeout: 8000,
        validateStatus: () => true,
      });

      if (res.status === 401) throw new Error('WSSE/HTTP 인증 실패 (SOAP1.1)');
      if (res.status >= 200 && res.status < 300 && res.data) {
        const tokensAndNames = extractProfileTokensAndNames(res.data);
        if (tokensAndNames.length) return tokensAndNames;
      }
      lastErr = new Error(`GetProfiles ${ver} 실패: status=${res.status}`);
    } catch (e) {
      lastErr = e;
      // 다음 버전으로 폴백
    }
  }

  throw new Error('ONVIF Profile Token 조회 실패: ' + (lastErr?.message || 'unknown'));


  function extractProfileTokensAndNames(xml) {
    const s = String(xml);
    const out = [];

    // Profiles 블록 전체를 잡아서 내부에서 token과 Name을 뽑는다
    const reProfiles = /<(?:\w+:)?Profiles\b[^>]*token="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?Profiles>/g;
    let m;
    while ((m = reProfiles.exec(s)) !== null) {
      const token = m[1];
      const block = m[2];

      // 해당 Profiles 블록 안에서 "첫 번째 Name"을 프로필 이름으로 사용
      const nameMatch = /<(?:\w+:)?Name>\s*([^<]+)\s*<\/(?:\w+:)?Name>/g.exec(block);
      const name = nameMatch ? nameMatch[1] : null;

      out.push({ token, name });
    }
    return out;
  }
}

/**
 * ONVIF 프로토콜을 이용해 카메라에서 RTSP URL 얻기
*/
exports.getRtspFromOnvif = async ({ CAM_HOST, CAM_USER, CAM_PASS, CAM_ONVIF_PORT = 80, CAM_RTSP_PORT = 554, userProfileToken }) => {
  
  const digestAuth = new AxiosDigestAuth.default({
    username: CAM_USER,
    password: CAM_PASS
  });

  const services = await this.getServices({ CAM_HOST, CAM_ONVIF_PORT, digestAuth, CAM_RTSP_PORT, CAM_USER, CAM_PASS });
  if(!services) {
    throw new Error('ONVIF 서비스 조회 실패');
  }
  const mediaXAddr = await this.getProfiles(services);
  if(!mediaXAddr) {
    throw new Error('ONVIF Media Service URL 조회 실패');
  };

  const profileTokens = await this.getProfileToken({ mediaXAddr, digestAuth, CAM_USER, CAM_PASS });
  if(!profileTokens || profileTokens.length === 0) {
    throw new Error('ONVIF Profile Token 조회 실패');
  };
  const profileToken = profileTokens.length === 1 ? profileTokens[0].token : userProfileToken ? profileTokens.find(t => t.token === userProfileToken).token||profileTokens[1].token:profileTokens[1].token;
  let rtspUrls = await getStreamUri(mediaXAddr, profileToken, {
    username: CAM_USER,
    password: CAM_PASS,
    digestAuth,
    mediaVersionHint: 'v10',  
  });
  if(!rtspUrls) {
    throw new Error(`ONVIF Stream URI 조회 실패, RTSP URL: ${rtspUrls}`);
  }
  rtspUrls = rtspUrls.replace('rtsp://', `rtsp://${CAM_USER}:${encodeURIComponent(CAM_PASS)}@`);
  return rtspUrls;

  async function getStreamUri(url, profileToken, opts) {
    const { username, password, digestAuth, mediaVersionHint } = opts;
    const to = url;
    const offsetMs = await getServerOffsetMs(url);

    // v20과 v10 각각에서 여러 벤더 폼을 차례로 시도
    const bodiesV20 = [
      {
        action: 'http://www.onvif.org/ver20/media/wsdl/GetStreamUri',
        xml: () => `
          <m:GetStreamUri xmlns:m="http://www.onvif.org/ver20/media/wsdl">
            <m:StreamSetup>
              <tt:Stream xmlns:tt="http://www.onvif.org/ver10/schema">
                RTP-Unicast
              </tt:Stream>
              <tt:Transport xmlns:tt="http://www.onvif.org/ver10/schema">
                <tt:Protocol>
                  RTSP
                </tt:Protocol>
              </tt:Transport>
            </m:StreamSetup>
            <m:ProfileToken>
              ${profileToken}
            </m:ProfileToken>
        </m:GetStreamUri>`
      },
      // 일부 장비: tt:StreamSetup 태그만 허용
      {
        action: 'http://www.onvif.org/ver20/media/wsdl/GetStreamUri',
        xml: () => `
          <tr2:GetStreamUri xmlns:tr2="http://www.onvif.org/ver20/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
            <tt:StreamSetup>
              <tt:Stream>
                RTP-Unicast
              </tt:Stream>
              <tt:Transport>
                <tt:Protocol>
                  RTSP
                </tt:Protocol>
              </tt:Transport>
            </tt:StreamSetup>
            <tr2:ProfileToken>
              ${profileToken}
            </tr2:ProfileToken>
          </tr2:GetStreamUri>`
    },
    // 표준 tr2:StreamSetup
    {
      action: 'http://www.onvif.org/ver20/media/wsdl/GetStreamUri',
      xml: () => `
        <tr2:GetStreamUri xmlns:tr2="http://www.onvif.org/ver20/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
          <tr2:StreamSetup>
            <tt:Stream>
              RTP-Unicast
            </tt:Stream>
            <tt:Transport>
              <tt:Protocol>
                RTSP
              </tt:Protocol>
            </tt:Transport>
          </tr2:StreamSetup>
          <tr2:ProfileToken>
            ${profileToken}
          </tr2:ProfileToken>
        </tr2:GetStreamUri>`
    },
    // StreamSetup 생략
    {
      action: 'http://www.onvif.org/ver20/media/wsdl/GetStreamUri',
      xml: () => `
        <tr2:GetStreamUri xmlns:tr2="http://www.onvif.org/ver20/media/wsdl">
          <tr2:ProfileToken>
            ${profileToken}
          </tr2:ProfileToken>
        </tr2:GetStreamUri>`
    },
  ];

  const bodiesV10 = [
        {
      action: 'http://www.onvif.org/ver10/media/wsdl/GetStreamUri',
      xml: () => `<m:GetStreamUri xmlns:m="http://www.onvif.org/ver10/media/wsdl">
            <m:StreamSetup>
              <tt:Stream xmlns:tt="http://www.onvif.org/ver10/schema">RTP-Unicast</tt:Stream>
              <tt:Transport xmlns:tt="http://www.onvif.org/ver10/schema">
                <tt:Protocol>RTSP</tt:Protocol>
              </tt:Transport>
            </m:StreamSetup>
            <m:ProfileToken>${profileToken}</m:ProfileToken>
          </m:GetStreamUri>`
    },
    // StreamSetup 생략 (구형에서 잘 됨)
    {
      action: 'http://www.onvif.org/ver10/media/wsdl/GetStreamUri',
      xml: () => `<trt:GetStreamUri xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
          <trt:ProfileToken>
            ${profileToken}
          </trt:ProfileToken>
        </trt:GetStreamUri>`
    },
    // Transport만
    {
      action: 'http://www.onvif.org/ver10/media/wsdl/GetStreamUri',
      xml: () => `
        <trt:GetStreamUri xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
          <trt:StreamSetup>
            <tt:Transport>
              <tt:Protocol>
                RTSP
              </tt:Protocol>
            </tt:Transport>
          </trt:StreamSetup>
          <trt:ProfileToken>
            ${profileToken}
          </trt:ProfileToken>
        </trt:GetStreamUri>`
    },
    // 표준 (Stream + Transport)
    {
      action: 'http://www.onvif.org/ver10/media/wsdl/GetStreamUri',
      xml: () => `
        <trt:GetStreamUri xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
          <trt:StreamSetup>
            <tt:Stream>
              RTP-Unicast
            </tt:Stream>
            <tt:Transport>
              <tt:Protocol>
                RTSP
              </tt:Protocol>
            </tt:Transport>
          </trt:StreamSetup>
          <trt:ProfileToken>
            ${profileToken}
          </trt:ProfileToken>
      </trt:GetStreamUri>`
    },
  ];

  const sets = mediaVersionHint === 'v20'
    ? [bodiesV20, bodiesV10]
    : mediaVersionHint === 'v10'
      ? [bodiesV10, bodiesV20]
      : [bodiesV20, bodiesV10]; // 모르면 v20 먼저

  let lastErr;
  for (const bodies of sets) {
    for (const b of bodies) {
      // SOAP 1.2 시도 (WSSE는 매번 새로 생성!)
      const wsse12 = buildWsseHeader(username, password, offsetMs, 's');
      const soap12 = envelopeWithHeaders({ body: b.xml(), wsse: wsse12, action: b.action, to, soap12: true });
      try {
        let res = await digestAuth.request({
          url,
          method: 'POST',
          data: soap12,
          headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
          timeout: 30000,
          validateStatus: () => true
        });
        if (res.status === 401) throw new Error('WSSE/HTTP 인증 실패 (SOAP1.2)');
        if (res.status >= 200 && res.status < 300) {
          const uri = extractRtspUri(res.data);
          if (uri) return uri;
        }

        // SOAP 1.1 폴백
        const wsse11 = buildWsseHeader(username, password, offsetMs, 'soapenv');
        const soap11 = envelopeWithHeaders({ body: b.xml(), wsse: wsse11, action: b.action, to, soap12: false });
        res = await digestAuth.request({
          url: to,
          method: 'POST',
          data: soap11,
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `"${b.action}"`
          },
          timeout: 30000,
          validateStatus: () => true,
        });
        if (res.status === 401) throw new Error('WSSE/HTTP 인증 실패 (SOAP1.1)');
        if (res.status >= 200 && res.status < 300) {
          const uri = extractRtspUri(res.data);
          if (uri) return uri;
        }

        lastErr = new Error(`GetStreamUri 실패: status=${res.status}`);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw new Error('ONVIF Stream URI 조회 실패: ' + (lastErr?.message || 'unknown'));
  }
}