const catchAsync = require('../utils/catchAsync');

const Student = require('../model/student');
const Parent = require('../model/parent');
const User = require('../model/user');

const otpHelper = require('../utils/otpHelper');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.SendOtp = catchAsync(async (req, res, next) => {
	const { mobile, app_signature = '' } = req.body;

	if (!mobile) return next(new ErrorResponse('Mobile number is required', 400));

	const response = await otpHelper.sendOtp(mobile, app_signature);

	res.status(200).json(SuccessResponse(response, 0, 'OTP sent successfully'));
});

exports.VerifyOtp = catchAsync(async (req, res, next) => {
	const { mobile, otp } = req.body;

	if (!mobile || !otp) {
		return next(new ErrorResponse('Mobile number and otp is required', 400));
	}

	const response = await otpHelper.verifyOtp(mobile, otp);

	res.status(200).json(SuccessResponse(response, 0, response.message));
});

// delete these function after adapting above
const otpObject = new otpHelper.OTP();

const { NODE_ENV, SMS_LAB_AUTHKEY, SMS_LAB_SENDER, SMS_LAB_DLT_TE_ID } =
	process.env;

const verifyBaseUrl = `http://sms.smslab.in/api/verifyRequestOTP.php?authkey=${SMS_LAB_AUTHKEY}`;

function genOtp() {
	const isStatic = NODE_ENV !== 'production';

	if (isStatic) {
		return 7654;
	}

	return Math.floor(1000 + Math.random() * 9000);
}

function getOtpOptions(mobile, msgId) {
	const otp = genOtp();

	const sendBaseUrl = `http://sms.smslab.in/api/otp.php?authkey=${SMS_LAB_AUTHKEY}&sender=${SMS_LAB_SENDER}&DLT_TE_ID=${SMS_LAB_DLT_TE_ID}`;
	const message = `Please use the OTP ${otp} \n
	Welcome to the new era of learning. Your school has registered you on growOn \n
	Together Let's growOn \n learn.set.go\n
	Thank you.
	${msgId}
	CUMINT`;

	return {
		url: `${sendBaseUrl}&mobile=${mobile}&message=${message}&otp=${otp}`,
		method: 'GET',
	};
}

exports.otp = catchAsync(async (req, res, next) => {
	const {
		mobile,
		username,
		type,
		profile_type,
		otp: verifyOtp,
		app_signature = '',
	} = req.body;

	if (type == 'send') {
		if (profile_type == 'student') {
			await Student.findOne({
				username,
			})
				.then(async student => {
					if (!student) {
						return res.status(404).send({
							err: 'User Not Found',
							status: 404,
						});
					}
					try {
						const repos = await otpObject.sendOTP(
							getOtpOptions(mobile, app_signature)
						);

						res.send({
							message: repos,
							status: 201,
						});
					} catch (err) {
						res.json({
							error: err,
							status: 411,
						});
					}
				})
				.catch(err =>
					res.send({
						err,
						status: 411,
					})
				);
		} else if (profile_type == 'parent') {
			await Parent.findOne({
				username,
			})
				.then(async student => {
					if (!student) {
						return res.send({
							err: 'User Not Found',
							status: 404,
						});
					}
					try {
						const repos = await otpObject.sendOTP(
							getOtpOptions(mobile, app_signature)
						);

						res.send({
							message: repos,
							status: 201,
						});
					} catch (err) {
						res.json({
							error: err.message,
							status: 411,
						});
					}
				})
				.catch(err =>
					res.send({
						err,
						status: 411,
					})
				);
		} else if (profile_type == 'teacher') {
			await User.findOne({
				username,
			})
				.then(async student => {
					if (!student) {
						return res.send({
							err: 'User Not Found',
							status: 404,
						});
					}
					try {
						const repos = await otpObject.sendOTP(
							getOtpOptions(mobile, app_signature)
						);
						res.send({
							message: repos,
							status: 201,
						});
					} catch (err) {
						res.json({
							error: err.message,
							status: 411,
						});
					}
				})
				.catch(err =>
					res.send({
						err: err.message,
						status: 411,
					})
				);
		}
	} else if (type == 'verify') {
		if (verifyOtp == '') {
			return res.json({
				error: 'Please provide session id & otp',
				status: 411,
			});
		}
		const clientServerOptions = {
			url: `${verifyBaseUrl}&mobile=${mobile}&otp=${verifyOtp}`,
			method: 'GET',
		};

		try {
			const repos = await otpObject.verifyOTP(clientServerOptions);
			///  await otpObject.checkDevices(is_driver_login, is_customer_login, mobile, req.body.device_token);
			try {
				res.send({
					verification: 'OTP Verified Successfully',
					status: 201,
				});
			} catch (error) {
				res.json({
					error: error.message,
					status: 411,
				});
			}
		} catch (err) {
			res.json({
				error: err.message,
				status: 411,
			});
		}
	}
});
