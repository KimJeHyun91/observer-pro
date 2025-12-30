const crypto = require('crypto');

function sha256Hash(password, salt) {
	const hash = crypto.createHash('sha256');
	hash.update(password + salt);
	return hash.digest('hex');
}

function generateSalt() {
	const length = 16;
	return crypto.randomBytes(length).toString('hex');
}

exports.hashPassword = (password) => {
	const salt = generateSalt();
	const hashedPassword = sha256Hash(password, salt);
	return { hashedPassword, salt };
}

exports.verifyPassword = (password, hashedPassword, salt) => {
	const rehashedPassword = sha256Hash(password, salt);
	return rehashedPassword === hashedPassword;
};