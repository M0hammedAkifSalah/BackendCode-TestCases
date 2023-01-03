/* eslint-disable no-dupe-keys */
const mongoose = require('mongoose');
const curriculumModel = require('../model/curriculum');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.create = catchAsync(async (req, res, next) => {
	const isExist = await curriculumModel.find({ name: req.body.name });
	if (isExist.length > 0) {
		return next(new ErrorResponse('Curriculum already exist', 400));
	}
	await curriculumModel
		.create({
			_id: mongoose.Types.ObjectId(),
			name: req.body.name,
			description: req.body.description,
			institute_id: req.body.institute_id,
			priority: req.body.priority,
			groups: req.body.groups,
			created_by: req.body.created_by,
			updated_by: req.body.updated_by,
		})
		.then(result => {
			res
				.status(201)
				.json(
					SuccessResponse(
						result,
						result.length,
						'Curriculum created successfully'
					)
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to create', 411));
		});
});

exports.getAll = catchAsync(async (req, res, next) => {
	const curriculum = new APIFeatures(
		curriculumModel.find({}).populate('institute_id', 'name').populate({
			path: 'groups',
			select: 'group_name',
		}),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const result = await curriculum.query;
	if (!result || result.length === 0) {
		return next(new ErrorResponse('No curriculum found', 404));
	}
	return res.status(200).json(SuccessResponse(result, result.length));
});

exports.get = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const curriculum = await curriculumModel
		.findById(id)
		.populate({
			path: 'groups',
			select: 'group_name',
		})
		.populate('institute_id', 'name')
		.populate('created_by', 'name');
	if (!curriculum) {
		return next(new ErrorResponse('No curriculum found', 404));
	}
	return res.status(200).json(SuccessResponse(curriculum, curriculum.length));
});

exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const isExist = await curriculumModel.findById(id);
	if (!isExist || isExist.length === 0) {
		return next(new ErrorResponse('No Curriculum Found', 404));
	}
	await curriculumModel
		.findByIdAndUpdate(id, req.body, { new: true })
		.then(result => {
			res
				.status(201)
				.json(
					SuccessResponse(
						result,
						result.length,
						'Curriculum updated successfully'
					)
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to update', 411));
		});
});

exports.delete = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const isExist = await curriculumModel.findById(id);
	if (!isExist || isExist.length === 0) {
		return next(new ErrorResponse('No Curriculum Found', 404));
	}
	await curriculumModel
		.findByIdAndDelete(id)
		.exec()
		.then(result => {
			res
				.status(200)
				.json(
					SuccessResponse(
						result,
						result.length,
						'Curriculum deleted successfully'
					)
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to delete', 411));
		});
});
