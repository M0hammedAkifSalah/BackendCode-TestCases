const moment = require('moment');

const CoinModel = require('../model/coin');

const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.GetAll = catchAsync(async (req, res, next) => {
	const { user: { _id: loggedInUserId = null } = { _id: null } } = req;
	const { userId = loggedInUserId, weekDate } = req.query;

	if (!userId) {
		return next(new ErrorResponse('user id is required', 401));
	}

	if (!weekDate) {
		return next(new ErrorResponse('Week Date is required', 400));
	}

	const date = moment(weekDate);

	const week = date.week();
	const year = date.year();

	const foundCoins = await CoinModel.find({
		userId,
		week,
		year,
	});

	res
		.status(200)
		.json(SuccessResponse(foundCoins, foundCoins.length, 'successfully found'));
});
