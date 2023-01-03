const mongoose = require('mongoose');
const featuresModel = require('../model/features');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

exports.create = catchAsync(async (req, res, next) => {
	if (!(req.body.name || req.body.application || req.body.flag)) {
		return next(
			new ErrorResponse('Please provide all the required fields', 400)
		);
	}
	const isExist = await featuresModel.findOne({
		name: req.body.name,
		application: req.body.application,
	});
	if (isExist) {
		return next(
			new ErrorResponse(`Feature ${req.body.name} already exist`, 400)
		);
	}
	await featuresModel
		.create({
			_id: new mongoose.Types.ObjectId(),
			name: req.body.name,
			description: req.body.description,
			application: req.body.application,
			flag: req.body.flag,
		})
		.then(feature => {
			res
				.status(201)
				.json(SuccessResponse(feature, 1, 'Feature created successfully'));
		})
		.catch(err => {
			res.status(400).json(err.message);
			// console.log(err.message);
		});
});

exports.getAll = catchAsync(async (req, res, next) => {
	const queryObj = new APIFeatures(featuresModel.find(), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const features = await queryObj.query;
	const data = JSON.parse(JSON.stringify(features));
	if (!data) {
		return next(new ErrorResponse(`No features found`, 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, data.length, 'fetched successfully'));
});

exports.get = catchAsync(async (req, res, next) => {
	const feature = await featuresModel.findById(req.params.id);
	if (!feature) {
		return next(
			new ErrorResponse(`No feature found with id ${req.params.id}`, 404)
		);
	}
	res.status(200).json(SuccessResponse(feature, 1, 'fetched successfully'));
});

exports.update = catchAsync(async (req, res, next) => {
	const feature = await featuresModel.findByIdAndUpdate(
		req.params.id,
		req.body,
		{
			new: true,
			runValidators: true,
		}
	);
	if (!feature) {
		return next(
			new ErrorResponse(`No feature found with id ${req.params.id}`, 404)
		);
	}
	res.status(200).json(SuccessResponse(feature, 1, 'updated successfully'));
});

exports.delete = catchAsync(async (req, res, next) => {
	const feature = await featuresModel.findByIdAndDelete(req.params.id);
	if (!feature) {
		return next(
			new ErrorResponse(`No feature found with id ${req.params.id}`, 404)
		);
	}
	res.status(200).json(SuccessResponse(feature, 1, 'deleted successfully'));
});
