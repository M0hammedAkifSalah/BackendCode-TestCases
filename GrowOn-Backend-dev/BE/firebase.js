const firebase = require('firebase-admin');

exports.sendToDeviceFirebase = async (payload, firebaseToken) => {
	try {
		const options = {
			priority: 'high',
			timeToLive: 60 * 60 * 24, // 1 day
		};
		const response = await firebase
			.messaging()
			.sendToDevice(firebaseToken, payload, options);
		return response;
	} catch (error) {
		console.error('Firebase Error: ', error.errorInfo.message);
		return error;
	}
};
