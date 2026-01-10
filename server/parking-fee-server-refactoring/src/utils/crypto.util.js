const crypto = require('crypto');

// .env에서 키를 가져옵니다. (32바이트 = 64 hex characters)
// 실제 운영 시엔 반드시 환경변수로 관리해야 합니다.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '01234567890123456789012345678901'; // 32 chars
const IV_LENGTH = 16; // AES block size

/**
 * 양방향 암호화 (AES-256-CBC)
 */
const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // IV와 암호문을 : 로 구분하여 저장 (복호화 때 IV가 필요함)
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * 양방향 복호화
 */
const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error);
        return text; // 복호화 실패 시 원본(암호문) 혹은 에러 반환
    }
};

/**
 * 단방향 해시 (검색용, SHA-256)
 */
const createSHA256Hash = (data) => {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = { encrypt, decrypt, createSHA256Hash };