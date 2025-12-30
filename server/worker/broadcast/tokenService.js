const axios = require('axios');

// 토큰 관리 변수
 let cachedToken = null;
 let tokenExpiresAt = 0;
 let isFetchingToken = false; 

// Azure AD B2C Access Token 가져오기
exports.fetchToken = async () => {
  if (isFetchingToken) return; // 중복 요청 방지
  isFetchingToken = true;

  try {
    const url =
      "https://towncast.b2clogin.com/towncast.onmicrosoft.com/B2C_1_sign_in/oauth2/v2.0/token";

    const data = new URLSearchParams();
    data.append("grant_type", "client_credentials");
    data.append("client_id", process.env.CLIENT_ID);
    data.append("client_secret", process.env.CLIENT_SECRET);
    data.append("scope", process.env.SCOPE);

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    cachedToken = response.data.access_token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + response.data.expires_in - 60; 

    console.log("토큰 발급 완료");
    return cachedToken;
  } catch (error) {
    console.error("토큰 발급 오류:", error.message || error);
    return null; 
  } finally {
    isFetchingToken = false; 
  }
};


// 1시간마다 자동 갱신
exports.updateTokenPeriodically = async () => {
  try {
    await this.fetchToken();
    setInterval(this.fetchToken, 3600 * 1000);
  } catch (error) {
    console.error("주기적 토큰 갱신 오류:", error.message || error);
  }
};
 
// 토큰 검증
exports.ensureValidToken = async(req, res, next) => {
    try {
      const now = Math.floor(Date.now() / 1000);
  
      if (!cachedToken || now >= tokenExpiresAt) {
        await this.fetchToken(); 
      }
  
      req.accessToken = cachedToken; 
      next();
    } catch (error) {
      res.status(500).json({ error: "토큰 갱신 중 오류 발생" });
    }
  }
  

exports.getCachedToken = () => cachedToken;
exports.getTokenExpiresAt = () => tokenExpiresAt;
