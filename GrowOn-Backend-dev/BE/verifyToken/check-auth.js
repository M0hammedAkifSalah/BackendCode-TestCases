const jwt = require('jsonwebtoken');
global.credentials = require('../config/credentials.json');

module.exports.jwt_Token = userId => {
	try {
		const token = jwt.sign({ id: userId }, global.credentials.JWT_KEY);
		return token;
	} catch (error) {
		console.log(error);
		return error;
	}
};
