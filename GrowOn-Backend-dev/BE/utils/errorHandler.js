const ErrorResponse = require('./errorResponse');
const winston = require('../config/winston');

const { NODE_ENV } = process.env;

const modifyError = error => {
	const err = { ...error };

	if (err.name === 'SMS_LABS') {
		let message = null;
		let statusCode = null;

		switch (err.message) {
			case 'otp_expired':
				message = 'OTP expired resend again';
				statusCode = 401;
				break;
			case 'otp_not_verified':
				message = 'Invalid OTP';
				statusCode = 401;
				break;
			case 'already_verified':
				message = 'Invalid OTP';
				statusCode = 401;
				break;
			default:
				message = err.message;
				statusCode = err.statusCode;
				break;
		}

		return new ErrorResponse(message, statusCode);
	}

	// JWT Expired
	if (error.name === 'TokenExpiredError') {
		const message = 'Invalid Token';
		return new ErrorResponse(message, 401);
	}

	if (error.name === 'JsonWebTokenError') {
		const message = 'Invalid Token';
		return new ErrorResponse(message, 401);
	}

	// Mongoose bad ObjectId
	if (error.name === 'CastError') {
		const message = `Invalid ${err.path}: ${err.value}`;
		return new ErrorResponse(message, 400);
	}

	// Mongoose duplicate key
	if (error.code === 11000) {
		const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
		const message = `Duplicate field value: ${value}. Please use anothe value!`;
		return new ErrorResponse(message, 400);
	}

	// Mongoose validation error
	if (error.name === 'ValidationError') {
		const errors = Object.values(err.errors).map(el => el.message);

		const message = `Invalid input data. ${errors.join('. ')}`;
		return new ErrorResponse(message, 400);
	}

	// ENOTFOUND
	if (error.code === 'ENOTFOUND') {
		const message = `ERROR`;
		return new ErrorResponse(message, 500);
	}

	if (error.code === 'ESOCKET') {
		const message = `Network Error`;
		return new ErrorResponse(message, 400);
	}

	// verify email
	if (error.name === 'emailverifier') {
		const message = `Invalid Email`;
		return new ErrorResponse(message, 400);
	}

	// File system error
	if (error.code === 'ENOENT') {
		const message = 'Page not found';
		return new ErrorResponse(message, 404);
	}

	return error;
};

const errorHandler = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	console.error('ERROR: ', err);

	winston.error(
		`${err.status || 500} - ${err.message} - ${req.originalUrl} - 
		${req.method} - ${req.ip}`
	);

	const modifiedError = modifyError(err);

	const errData = {
		isSuccess: false,
		status: modifiedError.status,
		message: modifiedError.message,
	};

	if (NODE_ENV === 'preprod' || NODE_ENV === 'production') {
		if (!modifiedError.isOperational) {
			modifiedError.statusCode = 500;
			errData.status = 'error';
			errData.message = 'something went wrong';
		}
	} else {
		errData.error = err;
		errData.stack = err.stack || null;
	}

	return res.status(modifiedError.statusCode).json(errData);
};

module.exports = errorHandler;
