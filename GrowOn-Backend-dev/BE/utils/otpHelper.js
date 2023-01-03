const request = require('request');
const axios = require('axios').default;

const { NODE_ENV, SMS_LAB_AUTHKEY, SMS_LAB_SENDER, SMS_LAB_DLT_TE_ID } =
	process.env;

function genOtp() {
	const isStatic = NODE_ENV !== 'production';

	if (isStatic) {
		return 7654;
	}

	return Math.floor(1000 + Math.random() * 9000);
}

const sendOtp = (mobile, messageId = '') =>
	new Promise((resolve, reject) => {
		const otp = genOtp();

		const sendBaseUrl = `http://sms.smslab.in/api/otp.php?authkey=${SMS_LAB_AUTHKEY}&sender=${SMS_LAB_SENDER}&DLT_TE_ID=${SMS_LAB_DLT_TE_ID}&otp_expiry=10`;
		const message = `Please use the OTP ${otp} \n
				Welcome to the new era of learning. Your school has registered you on growOn \n
				Together Let's growOn \n learn.set.go\n
				Thank you.
				${messageId}
				CUMINT`;

		const url = `${sendBaseUrl}&mobile=${mobile}&message=${message}&otp=${otp}`;

		if (NODE_ENV !== 'production') {
			resolve({ message: 'OTP sent successfully', status: 200 });
		}

		axios
			.get(url)
			.then(res => {
				const { data } = res;

				if (data.type === 'success') {
					resolve(data);
				}

				// SEND ERROR DETAILS
				data.name = 'SMS_LABS';
				reject(data);
			})
			.catch(err => {
				reject(err);
			});
	});

const verifyOtp = (mobile, otp) =>
	new Promise((resolve, reject) => {
		const verifyBaseUrl = `http://sms.smslab.in/api/verifyRequestOTP.php?authkey=${SMS_LAB_AUTHKEY}`;

		const url = `${verifyBaseUrl}&mobile=${mobile}&otp=${otp}`;

		if (NODE_ENV !== 'production') {
			if (Number(otp) === 7654) {
				resolve({ message: 'OTP verified' });
			}

			reject(new Error('OTP Invalid'));
		}

		axios
			.get(url)
			.then(res => {
				const { data } = res;

				if (data.type === 'success') {
					resolve(data);
				}

				// SEND ERROR DETAILS
				data.name = 'SMS_LABS';
				reject(data);
			})
			.catch(err => {
				reject(err);
			});
	});

class OTP {
	constructor() {}

	sendOTP(clientServerOptions) {
		return new Promise((resolve, reject) => {
			if (NODE_ENV !== 'production') {
				resolve({
					message: 'OTP Send Successfully',
					status: 200,
				});
			}

			request(clientServerOptions, (err, req, res, next) => {
				try {
					if (err) {
						reject({
							error: err,
							status: 500,
						});
					} else if (res != undefined) {
						console.log(res);

						const obj = JSON.parse(res);
						console.log(obj, '1111111111111');
						if (obj.type == 'success') {
							resolve({
								message: 'OTP Send Successfully',
								status: 201,
							});
						} else {
							reject({
								message: res,
								status: 500,
							});
						}
					} else {
						reject({
							error: res,
							status: 500,
						});
					}
				} catch (err) {
					reject({
						error: err,
						status: 500,
					});
				}
			});
		});
	}

	verifyOTP(clientServerOptions) {
		return new Promise((resolve, reject) => {
			if (NODE_ENV !== 'production') {
				const isValid = clientServerOptions.includes('&otp=7654');

				if (isValid) {
					resolve({
						message: 'OTP Verified Successfully',
						status: 201,
					});
				}

				reject(new Error('OTP Invalid'));
			}

			request(clientServerOptions, (err, req, res, next) => {
				try {
					if (err) {
						reject({
							error: err,
							status: 500,
						});
					} else if (res != undefined) {
						const obj = JSON.parse(res);
						if (obj.type == 'success') {
							resolve({
								message: 'OTP Verified Successfully',
								status: 201,
							});
						} else if (obj.type == 'error') {
							reject({
								message: 'OTP Did Not Match',
								status: 811,
							});
						} else {
							reject({
								message: res,
								status: 500,
							});
						}
					} else {
						reject({
							error: res,
							status: 500,
						});
					}
				} catch (err) {
					reject({
						error: err,
						status: 500,
					});
				}
			});
		});
	}
}

module.exports = { OTP, sendOtp, verifyOtp };
