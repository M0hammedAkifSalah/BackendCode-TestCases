const mongoose = require('mongoose');
const postModel = require('../model/post');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const ContentModel = require('../model/contentGroup');

exports.create = catchAsync(async (req, res, next) => {
	if (
		!req.body.group_id ||
		!req.body.uploaded_by ||
		!req.body.file_name ||
		!req.body.file
	) {
		return next(new ErrorResponse('Please provide all required fields', 400));
	}

	const foundPost = await postModel.findOne({
		file_name: req.body.file_name,
		group_id: req.body.group_id,
	});

	if (foundPost) {
		return next(new ErrorResponse('File Already created', 400));
	}

	await postModel
		.create({
			_id: mongoose.Types.ObjectId(),
			file: req.body.file,
			description: req.body.description,
			file_name: req.body.file_name,
			group_id: req.body.group_id,
			uploaded_by: req.body.uploaded_by,
		})
		.then(async result => {
			await ContentModel.findByIdAndUpdate(req.body.group_id, {
				$push: {
					posts: result._id,
				},
			});
			res
				.status(201)
				.json(
					SuccessResponse(result, result.length, 'Post created successfully')
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to create', 411));
		});
});

exports.getAll = catchAsync(async (req, res, next) => {
	const queryObj = new APIFeatures(
		postModel
			.find({})
			.populate({
				path: 'group_id',
				select: 'group_name',
			})
			.populate({
				path: 'uploaded_by',
				select: 'name',
			}),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const posts = await queryObj.query;
	if (!posts) {
		return next(new ErrorResponse('No post found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(posts, posts.length, 'Posts fetched successfully'));
});

exports.get = catchAsync(async (req, res, next) => {
	const post = await postModel
		.findById(req.params.id)
		.populate({
			path: 'group_id',
			select: 'group_name',
		})
		.populate({
			path: 'uploaded_by',
			select: 'name',
		});
	if (!post) {
		return next(new ErrorResponse('No post found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(post, post.length, 'Post fetched successfully'));
});

exports.update = catchAsync(async (req, res, next) => {
	const post = await postModel
		.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		})
		.populate({
			path: 'group_id',
			select: 'group_name',
		})
		.populate({
			path: 'uploaded_by',
			select: 'name',
		});
	if (!post) {
		return next(new ErrorResponse('No post found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(post, post.length, 'Post updated successfully'));
});

exports.delete = catchAsync(async (req, res, next) => {
	const post = await postModel.findByIdAndDelete(req.params.id);
	if (!post) {
		return next(new ErrorResponse('No post found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(post, post.length, 'Post deleted successfully'));
});
