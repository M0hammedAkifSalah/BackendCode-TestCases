/* eslint-disable no-dupe-keys */
const mongoose = require('mongoose');
const contentModel = require('../model/contentGroup');
const APIFeatures = require('../utils/apiFeatures');
const SuccessResponse = require('../utils/successResponse');
const userModel = require('../model/user');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const firebaseNoti = require('../firebase');
const curriculumModel = require('../model/curriculum');
const PostModel = require('../model/post');

exports.addContentGroup = catchAsync(async (req, res, next) => {
	const isExist = await contentModel.findOne({
		group_name: req.body.group_name,
	});
	if (isExist && isExist.length > 0) {
		return next(new ErrorResponse('Group already exist', 400));
	}
	await contentModel
		.create({
			_id: mongoose.Types.ObjectId(),
			group_name: req.body.group_name,
			description: req.body.description,
			curriculum: req.body.curriculum,
			created_by: req.body.created_by,
		})
		.then(async result => {
			await curriculumModel.findByIdAndUpdate(result.curriculum, {
				$push: {
					groups: result._id,
				},
			});
			res
				.status(201)
				.json(
					SuccessResponse(result, result.length, 'Group added successfully')
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to create', 400));
		});
});

exports.getContentGroup = catchAsync(async (req, res, next) => {
	const queryObj = new APIFeatures(
		contentModel
			.find({})
			.populate({
				path: 'userList.teacher_id',
				select: 'name',
				populate: {
					path: 'school_id city state',
					select: 'schoolName state_name city_name',
				},
			})
			.populate({
				path: 'curriculum',
				select: 'name',
			})
			.populate({
				path: 'created_by',
				select: 'name',
			}),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const result = await queryObj.query;
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group fetched successfully'));
});

exports.deleteGroupById = catchAsync(async (req, res, next) => {
	const posts = await PostModel.deleteMany({ group_id: req.params.id });
	const result = await contentModel.deleteOne({ _id: req.params.id });
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res.status(200).json({
		message: 'Group deleted successfully',
		postsDeleted: posts.length,
		groupDeleted: result.group_name,
	});
});

exports.updateGroupById = catchAsync(async (req, res, next) => {
	const result = await contentModel.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
	});
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group updated successfully'));
});

exports.getTeacherStatus = catchAsync(async (req, res, next) => {
	const curriculum = mongoose.Types.ObjectId(req.body.curriculum);
	const user_id = mongoose.Types.ObjectId(req.body.user_id);
	const limit = req.body.limit ? parseInt(req.body.limit) : 10;
	const skip = req.body.page ? parseInt(req.body.page) * limit : 0;
	const result = await contentModel.aggregate([
		{
			$match: {
				curriculum,
			},
		},
		{
			$project: {
				_id: 1,
				group_name: 1,
				status: {
					$filter: {
						input: '$userList',
						as: 'num',
						cond: {
							$eq: ['$$num.teacher_id', user_id],
						},
					},
				},
			},
		},
		{
			$unwind: {
				path: '$status',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				statusone: {
					$cond: {
						if: '$status.status',
						then: '$status.status',
						else: 'NOT_ENROLLED',
					},
				},
			},
		},
		{
			$group: {
				_id: '$_id',
				data: {
					$push: '$group_name',
				},
				status: {
					$push: '$statusone',
				},
			},
		},
		{
			$project: {
				_id: 1,
				group_name: {
					$arrayElemAt: ['$data', 0],
				},
				status: {
					$arrayElemAt: ['$status', 0],
				},
			},
		},
		{ $skip: skip },
		{ $limit: limit },
	]);
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group fetched successfully'));
});

exports.addUserToGroup = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const isExist = await contentModel.find({
		_id: mongoose.Types.ObjectId(id),
		'userList.teacher_id': req.body.user_id,
	});
	if (isExist && isExist.length > 0) {
		return next(new ErrorResponse('User already exist in group', 400));
	}
	await contentModel
		.findByIdAndUpdate(
			id,
			{
				$push: {
					userList: { teacher_id: req.body.user_id },
				},
			},
			{ new: true }
		)
		.then(result => {
			res
				.status(201)
				.json(
					SuccessResponse(
						result,
						result.length,
						'User added to group successfully'
					)
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to add user', 400));
		});
});

exports.getGroupById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const result = await contentModel
		.findById(id)
		.populate({
			path: 'userList.teacher_id',
			select: 'name',
			populate: {
				path: 'school_id city state',
				select: 'schoolName state_name city_name',
			},
		})
		.populate({
			path: 'curriculum',
			select: 'name',
		})
		.populate({
			path: 'created_by',
			select: 'name',
		});
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group fetched successfully'));
});

exports.updateGroupById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const result = await contentModel.findByIdAndUpdate(id, req.body, {
		new: true,
	});
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group updated successfully'));
});

exports.deleteGroupById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const result = await contentModel.findByIdAndDelete(id);
	if (!result) {
		return next(new ErrorResponse('No data found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Group deleted successfully'));
});

exports.getUsersList = catchAsync(async (req, res, next) => {
	const payload = {};
	payload['userList.status'] = req.query.status;
	const finalobj = [];
	const { page } = req.query;
	const { limit } = req.query;
	const skip = (page - 1) * limit;
	const { id } = req.params;
	const result = await contentModel.aggregate([
		{
			$match: {
				_id: mongoose.Types.ObjectId(id),
			},
		},
		{
			$project: {
				userList: 1,
			},
		},
		{
			$unwind: '$userList',
		},
		{
			$lookup: {
				from: 'users',
				let: {
					user_id: '$userList.teacher_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$user_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
							school_id: 1,
						},
					},
					{
						$lookup: {
							from: 'schools',
							let: {
								school_id: '$school_id',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$school_id'],
										},
									},
								},
								{
									$project: {
										schoolName: 1,
										city: 1,
										state: 1,
									},
								},
							],
							as: 'school_id',
						},
					},
				],
				as: 'result',
			},
		},
		{
			$unwind: '$result',
		},
		{
			$project: {
				teacher_id: '$userList.teacher_id',
				name: '$result.name',
				schoolName: {
					$first: '$result.school_id',
				},
				status: '$userList.status',
				requestedAt: '$userList.requested_At',
			},
		},
		{
			$lookup: {
				from: 'cities',
				let: {
					city: '$schoolName.city',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$city'],
							},
						},
					},
					{
						$project: {
							city_name: 1,
						},
					},
				],
				as: 'city',
			},
		},
		{
			$lookup: {
				from: 'states',
				let: {
					state: '$schoolName.state',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$state'],
							},
						},
					},
					{
						$project: {
							state_name: 1,
						},
					},
				],
				as: 'state',
			},
		},
		{
			$sort: {
				name: 1,
			},
		},
		{
			$group: {
				_id: '$status',
				users: {
					$push: {
						teacher_id: '$teacher_id',
						name: '$name',
						schoolName: '$schoolName.schoolName',
						status: '$status',
						city: {
							$first: '$city.city_name',
						},
						state: {
							$first: '$state.state_name',
						},
						requestedAt: '$requestedAt',
					},
				},
			},
		},
	]);
	const list = JSON.parse(JSON.stringify(result));
	if (list.length > 0 && list[0]._id == req.query.status) {
		for (
			let i = skip;
			i < parseInt(limit) + skip && i < list[0].users.length;
			i++
		) {
			finalobj.push(list[0].users[i]);
		}
		res
			.status(200)
			.json(
				SuccessResponse(finalobj, finalobj.length, 'Users fetched successfully')
			);
	} else {
		for (
			let i = skip;
			i < parseInt(limit) + skip && i < list[1].users.length;
			i++
		) {
			finalobj.push(list[1].users[i]);
		}
		res
			.status(200)
			.json(
				SuccessResponse(finalobj, finalobj.length, 'Users fetched successfully')
			);
	}
});

exports.changeStatus = catchAsync(async (req, res, next) => {
	const payload = {};
	let list = null;
	payload._id = req.params.id;
	const userList = req.body.users;
	for (const user of userList) {
		// const newObj = null;
		// let image;
		if (user.status == 'approved') {
			payload[`userList.teacher_id`] = user.user_id;
			list = await contentModel.findOneAndUpdate(
				payload,
				{
					$set: {
						'userList.$.status': user.status,
					},
				},
				{ new: true }
			);
		} else if (user.status == 'rejected') {
			payload[`userList.teacher_id`] = user.user_id;
			list = await contentModel.findOneAndUpdate(
				payload,
				{
					$pull: {
						userList: {
							teacher_id: user.user_id,
						},
					},
				},
				{ new: true }
			);
		}
		// newObj = await userModel
		// 	.findById(user.user_id)
		// 	.select('DeviceToken profile_image');

		// if (!newObj.profile_image) {
		// 	image = '';
		// } else {
		// 	const imageele = newObj.profile_image.split('/');
		// 	image = `${process.env.cloudFront100x100}${
		// 		imageele[imageele.length - 1]
		// 	}`;
		// }
		// const msgObj = {
		// 	notification: {
		// 		title: 'Group',
		// 		body: `Your request has been ${user.status} by the group admin`,
		// 		image,
		// 		click_action: 'FLUTTER_NOTIFICATION_CLICK',
		// 		collapse_key: 'grow_on',
		// 		icon: '@drawable/notification_icon',
		// 		channel_id: 'messages',
		// 	},
		// 	data: {
		// 		type: 'Group',
		// 	},
		// };
		// firebaseNoti.sendToDeviceFirebase(msgObj, newObj.DeviceToken);
	}
	res
		.status(201)
		.json(SuccessResponse(list, list.length, 'Status updated successfully'));
});

exports.getCount = catchAsync(async (req, res, next) => {
	const limit = req.query.limit ? parseInt(req.query.limit) : 10;
	const skip = req.query.page ? parseInt(req.query.page) * limit : 0;
	await contentModel
		.aggregate([
			{
				$match: {
					curriculum: mongoose.Types.ObjectId(req.body.curriculum),
				},
			},
			{
				$project: {
					_id: 1,
					group_name: 1,
					description: 1,
					approved_count: {
						$size: {
							$filter: {
								input: '$userList',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'approved'],
								},
							},
						},
					},
					requested_count: {
						$size: {
							$filter: {
								input: '$userList',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'requested'],
								},
							},
						},
					},
				},
			},
			{ $skip: skip },
			{ $limit: limit },
		])
		.then(result => {
			if (!result) {
				return next(new ErrorResponse('No groups found', 404));
			}
			res
				.status(200)
				.json(
					SuccessResponse(result, result.length, 'Count fetched successfully')
				);
		})
		.catch(err => {
			next(new ErrorResponse(err.message || 'Failed to fetch count', 400));
		});
});
