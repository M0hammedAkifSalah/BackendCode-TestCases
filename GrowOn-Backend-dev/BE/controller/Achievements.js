const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const AchievementModule = require('../model/Achievements');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.Create = catchAsync(async (req, res, next) => {
	const board = new AchievementModule({
		_id: mongoose.Types.ObjectId(),
		title: req.body.title,
		class_id: req.body.class_id,
		teacher_id: req.body.teacher_id,
		description: req.body.description,
		repository: req.body.repository,
	});

	board
		.save()
		.then(result =>
			res
				.status(201)
				.json(
					SuccessResponse(
						result,
						result.length,
						'achievement created successfully'
					)
				)
		)
		.catch(err =>
			next(new ErrorResponse(err.message || 'Failed to create', 411))
		);
});

exports.getAllData = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(AchievementModule.find({}), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const board = await features.query;

	return res.status(200).json(SuccessResponse(board, board.length));
});

exports.getByID = catchAsync(async (req, res, next) => {
	const board = await AchievementModule.findById(req.params.id);

	if (!board) {
		return next(
			new ErrorResponse(`Board not found for id ${req.params.id}`, 404)
		);
	}

	return res.status(200).json(SuccessResponse(board, 1));
});

exports.Update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const board = await AchievementModule.findById(id);

	if (!board) {
		return next(
			new ErrorResponse(`Board not found for id ${req.params.id}`, 404)
		);
	}

	const updatedAchievement = await AchievementModule.findByIdAndUpdate(
		id,
		{
			title: req.body.title,
			class_id: req.body.class_id,
			teacher_id: req.body.teacher_id,
			description: req.body.description,
			repository: req.body.repository,
		},
		{ new: true }
	);

	return res
		.status(201)
		.json(SuccessResponse(updatedAchievement, 1, 'updated successfully'));
	// res.status(200).json({
	// 	status: 'success',
	// });
});
