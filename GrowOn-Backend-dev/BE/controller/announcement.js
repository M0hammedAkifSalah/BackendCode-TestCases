const axios = require('axios').default;
const {
	Types: { ObjectId },
} = require('mongoose');

const AnnouncementModel = require('../model/announcement');
const StudentModel = require('../model/student');
const UserModel = require('../model/user');
const SchoolModel = require('../model/school');

const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

const firebaseNoti = require('../firebase');

const {
	NODE_ENV,
	SMS_LAB_AUTHKEY,
	SMS_LAB_SENDERA,
	SMS_LAB_DLT_TE_IDA,
	SMS_LAB_DLT_ANNOUNCEMENT,
} = process.env;

exports.Create = catchAsync(async (req, res, next) => {
	const {
		title,
		attachments = [],
		description,
		school_id,
		assignedTo,
		notifyMethods,
	} = req.body;

	if (!req.user || !req.user._id) {
		return next(new ErrorResponse('User must logged in', 401));
	}

	if (!school_id || !title || !assignedTo) {
		return next(new ErrorResponse('All fields are required'));
	}

	const createdAnnouncement = await AnnouncementModel.create({
		title,
		attachments,
		teacher_id: req.user._id,
		description,
		school_id,
		assignedTo,
	});

	res
		.status(201)
		.json(SuccessResponse(createdAnnouncement, 1, 'Successfully created'));

	const foundSchool = await SchoolModel.findOne({ _id: school_id }).select(
		'schoolName'
	);

	let allStudents = [];
	let allTeachers = [];

	switch (assignedTo) {
		case 'BOTH': {
			allStudents = await StudentModel.find({ school_id })
				.select('DeviceToken name username')
				.lean();

			allTeachers = await UserModel.find({ school_id })
				.select('DeviceToken name username')
				.lean();

			break;
		}
		case 'STUDENT': {
			allStudents = await StudentModel.find({ school_id })
				.select('DeviceToken name username')
				.lean();

			break;
		}
		case 'TEACHER': {
			allTeachers = await UserModel.find({ school_id })
				.select('DeviceToken name username')
				.lean();

			break;
		}
		default:
			break;
	}

	const payload = {
		notification: {
			title: 'Announcement',
			body: title,
			click_action: 'FLUTTER_NOTIFICATION_CLICK',
			collapse_key: 'grow_on',
			icon: '@drawable/notification_icon',
			channel_id: 'messages',
		},
		data: {
			type: 'Announcement',
		},
	};

	const deviceIds = [];
	const allUsers = [];

	allTeachers.forEach(t => {
		if (t.DeviceToken) {
			deviceIds.push(t.DeviceToken);
		}

		if (t.username) {
			allUsers.push({
				...t,
				userType: 'Teacher',
			});
		}
	});

	allStudents.forEach(s => {
		if (s.DeviceToken) {
			deviceIds.push(s.DeviceToken);
		}

		if (s.username) {
			allUsers.push({
				...s,
				userType: 'Parent',
			});
		}
	});

	try {
		firebaseNoti.sendToDeviceFirebase(payload, deviceIds);

		const { permissions: { can_send_announcement_sms = false } = {} } =
			req.user;

		if (
			(NODE_ENV === 'production' || NODE_ENV === 'preprod') &&
			notifyMethods.includes('SMS') &&
			can_send_announcement_sms
		) {
			allUsers.forEach(async usr => {
				const sendBaseUrl = `http://sms.smslab.in/api/sendhttp.php?authkey=${SMS_LAB_AUTHKEY}&sender=${SMS_LAB_SENDERA}&route=4&country=91&response=json&DLT_TE_ID=${SMS_LAB_DLT_ANNOUNCEMENT}`;

				const smsTitle = typeof title === 'string' ? title.slice(0, 40) : '';
				const smsSchoolName =
					typeof foundSchool.schoolName === 'string' ? title.slice(0, 17) : '';
				const redirectUrl = 'GrowOn App';

				const message = `Dear ${usr.userType},\nThere is Announcement ${smsTitle}\nLogin to ${redirectUrl} for more details.\nRegards, ${smsSchoolName} CUMINT`;

				const url = `${sendBaseUrl}&mobiles=${usr.username}&message=${message}`;

				await axios.get(url);
			});
		}
	} catch (err) {
		console.error(err);
	}
});

exports.GetAll = catchAsync(async (req, res) => {
	const {
		limit = 10,
		page = 1,
		teacher_id,
		school_id,
		assignedTo,
		isAcknowledged = null,
		searchVal,
	} = req.query;

	const loggedInUserId = ObjectId(req.user ? req.user._id : null);

	const findQuery = {};

	if (teacher_id) findQuery.teacher_id = ObjectId(teacher_id);
	if (school_id) findQuery.school_id = ObjectId(school_id);
	if (assignedTo) findQuery.assignedTo = assignedTo;
	if (isAcknowledged !== null && loggedInUserId) {
		if (isAcknowledged === true || isAcknowledged === 'true') {
			findQuery.acknowledgements = {
				$in: [loggedInUserId],
			};
		} else {
			findQuery.acknowledgements = {
				$nin: [loggedInUserId],
			};
		}
	}
	if (searchVal) {
		findQuery.$text = { $search: searchVal };
	}

	const limitInt = limit ? parseInt(limit) : 10;
	const skip = page ? parseInt(page - 1) * limitInt : 0;

	const foundAnnouncements = await AnnouncementModel.aggregate([
		{ $match: findQuery },
		{ $sort: { createdAt: -1 } },
		{ $skip: skip },
		{ $limit: limitInt },
		{
			$lookup: {
				from: 'users',
				let: {
					teacherId: '$teacher_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$teacherId'],
							},
						},
					},
					{
						$project: {
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: 'teacher_id',
			},
		},
		{
			$project: {
				title: 1,
				description: 1,
				attachments: 1,
				teacher_id: { $first: '$teacher_id' },
				school_id: 1,
				assignedTo: 1,
				isLiked: {
					$in: [loggedInUserId, { $ifNull: ['$likes', []] }],
				},
				isAcknowledged: {
					$in: [loggedInUserId, { $ifNull: ['$acknowledgements', []] }],
				},
				likesCount: {
					$cond: [{ $gt: ['$likes', null] }, { $size: '$likes' }, 0],
				},
				createdAt: 1,
			},
		},
	]);

	res
		.status(200)
		.json(SuccessResponse(foundAnnouncements, foundAnnouncements.length));
});

exports.GetById = catchAsync(async (req, res, next) => {
	const loggedInUserId = ObjectId(req.user ? req.user._id : null);

	const foundAnnouncement = await AnnouncementModel.aggregate([
		{
			$match: {
				_id: ObjectId(req.params.id),
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					teacherId: '$teacher_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$teacherId'],
							},
						},
					},
					{
						$project: {
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: 'teacher_id',
			},
		},
		{
			$project: {
				title: 1,
				description: 1,
				attachments: 1,
				teacher_id: { $first: '$teacher_id' },
				school_id: 1,
				assignedTo: 1,
				isLiked: {
					$in: [loggedInUserId, { $ifNull: ['$likes', []] }],
				},
				isAcknowledged: {
					$in: [loggedInUserId, { $ifNull: ['$acknowledgements', []] }],
				},
				likesCount: {
					$cond: [{ $gt: ['$likes', null] }, { $size: '$likes' }, 0],
				},
				createdAt: 1,
			},
		},
	]);

	if (!foundAnnouncement) {
		return next(new ErrorResponse('Announcement not found', 404));
	}

	res.status(200).json(SuccessResponse(foundAnnouncement[0], 200));
});

exports.Update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const {
		title = null,
		description = null,
		assignedTo = null,
		attachments = null,
	} = req.body;

	const updateObj = {};

	if (title) updateObj.title = title;
	if (description) updateObj.description = description;
	if (assignedTo) updateObj.assignedTo = assignedTo;
	if (attachments) updateObj.attachments = attachments;

	const updatedAnnouncement = await AnnouncementModel.findOneAndUpdate(
		{ _id: id },
		updateObj,
		{
			new: true,
		}
	).select({
		title: 1,
		description: 1,
		assignedTo: 1,
		attachments: 1,
	});

	if (!updatedAnnouncement) {
		return next(new ErrorResponse('Announcement not found', 404));
	}

	res.status(201).json(SuccessResponse(updatedAnnouncement, 1));
});

exports.Delete = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const foundAnnouncement = await AnnouncementModel.findById(id);

	if (!foundAnnouncement) {
		return next(new ErrorResponse('Announcement not found', 404));
	}

	const deletedAnnouncement = await AnnouncementModel.findOneAndDelete({
		_id: id,
	});

	if (!deletedAnnouncement) {
		return next(new ErrorResponse('Announcement not found', 404));
	}

	res.status(201).json(SuccessResponse(null, 1, 'Deleted successfully'));
});

exports.AddLike = catchAsync(async (req, res, next) => {
	const {
		params: { id },
		user,
	} = req;

	if (!user || !user._id) {
		return next(new ErrorResponse('User must logged in', 401));
	}

	await AnnouncementModel.updateOne(
		{ _id: id },
		{ $addToSet: { likes: user._id } }
	);

	res.status(201).json(SuccessResponse(null, 1, 'Like added'));
});

exports.RemoveLike = catchAsync(async (req, res, next) => {
	const {
		params: { id },
		user,
	} = req;

	if (!user || !user._id) {
		return next(new ErrorResponse('User must logged in', 401));
	}

	await AnnouncementModel.updateOne(
		{ _id: id },
		{ $pull: { likes: user._id } }
	);

	res.status(201).json(SuccessResponse(null, 1, 'Like Removed'));
});

exports.AddAcknowledge = catchAsync(async (req, res, next) => {
	const {
		params: { id },
		user,
	} = req;

	if (!user || !user._id) {
		return next(new ErrorResponse('User must logged in', 401));
	}

	await AnnouncementModel.updateOne(
		{ _id: id },
		{ $addToSet: { acknowledgements: user._id } }
	);

	res.status(201).json(SuccessResponse(null, 1, 'Acknowledge Added'));
});
