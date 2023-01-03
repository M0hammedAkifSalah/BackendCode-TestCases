const mongoose = require('mongoose');
const activityModel = require('../model/activity');
const userModel = require('../model/user');
const studentModel = require('../model/student');
const parentModel = require('../model/parent');
const questionModel = require('../model/objectiveQuestion');
const APIFeatures = require('../utils/apiFeatures');
const scheduleClassModel = require('../model/schedule_class');
const classModel = require('../model/class');
const schoolModel = require('../model/school');
const teacherModel = require('../model/user');
const roleModel = require('../model/role');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const redisClient = require('../config/redisClient');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

exports.userByRole = catchAsync(async (req, res) => {
	const obj = [];
	let count = 0;
	let responseData;
	const foundRoles = await roleModel
		.find({})
		.select(
			'-privilege, -description, -display_name, -createdAt, -updatedAt, -__v'
		);
	const roles = JSON.parse(JSON.stringify(foundRoles));
	const features = new APIFeatures(
		teacherModel
			.find({})
			.populate('subject', 'name')
			.populate('secondary_profile_type', 'display_name')
			.populate('school_id')
			.populate('branch_id', '_id name')
			.select('-createdAt -updatedAt'),
		req.query
	)
		.filter()
		.sort()
		.limitFields();

	const cacheKey = `userByRole:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);

	if (!cachedData) {
		const teacherData = await features.query;
		for (let ele of teacherData) {
			ele = JSON.parse(JSON.stringify(ele));
			const role = roles.find(({ _id }) => _id === ele.profile_type);
			if (role && role.role_name) {
				if (role.role_name == 'management') {
					obj.push(ele);
				} else if (role.role_name == 'principal') {
					obj.push(ele);
				} else if (role.role_name == 'teacher') {
					obj.push(ele);
				}
			}
		}
		count = obj.length;
		responseData = obj;
		await redisClient.SET(cacheKey, JSON.stringify(responseData), {
			EX: 86400,
		});
	} else {
		responseData = JSON.parse(cachedData);
		count = responseData.length;
	}

	res.status(200).json({
		result: count,
		data: responseData,
	});
});

exports.userByRolePost = catchAsync(async (req, res) => {
	const obj = [];
	let count = 0;
	let responseData;
	const foundRoles = await roleModel
		.find({})
		.select(
			'-privilege, -description, -display_name, -createdAt, -updatedAt, -__v'
		);
	const roles = JSON.parse(JSON.stringify(foundRoles));
	const features = new APIFeatures(
		teacherModel
			.find({})
			.populate('subject', 'name')
			.populate('secondary_profile_type', 'display_name')
			.populate('school_id')
			.select('-createdAt -updatedAt'),
		req.query
	)
		.filter()
		.sort()
		.limitFields();

	const cacheKey = `userByRolePost:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);

	if (!cachedData) {
		const teacherData = await features.query;

		for (let ele of teacherData) {
			ele = JSON.parse(JSON.stringify(ele));
			const role = roles.find(({ _id }) => _id === ele.profile_type);
			if (role && role.role_name) {
				if (role.role_name == 'management') {
					obj.push(ele);
				} else if (role.role_name == 'principal') {
					obj.push(ele);
				} else if (role.role_name == 'teacher') {
					obj.push(ele);
				}
			}
		}
		count = obj.length;
		responseData = obj;
		await redisClient.SET(cacheKey, JSON.stringify(responseData), {
			EX: 86400,
		});
	} else {
		responseData = JSON.parse(cachedData);
		count = responseData.length;
	}
	res.status(200).json({
		result: count,
		data: responseData,
	});
});

exports.activityCount = catchAsync(async (req, res, next) => {
	let tours;
	let castList;
	let studentNumber;
	let UserList;
	let QuestionList;
	if (req.query.school_id) {
		tours = await activityModel.aggregate([
			{
				$match: {
					'repository.id': req.query.school_id,
				},
			},
			{
				$group: {
					_id: '$activity_type',
					num: { $sum: 1 },
				},
			},
		]);
		castList = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
				},
			},
			{
				$group: {
					_id: '$caste',
					num: { $sum: 1 },
				},
				// eslint-disable-next-line no-dupe-keys
				$group: {
					_id: '$profile_type',
					num: { $sum: 1 },
				},
			},
		]);
		studentNumber = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
				},
			},
			{
				$group: {
					_id: '$gender',
					num: { $sum: 1 },
				},
			},
		]);
		UserList = await userModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
				},
			},
			{
				$group: {
					_id: '$profile_type',
					num: { $sum: 1 },
				},
			},
		]);
		QuestionList = await questionModel.aggregate([
			{
				$match: {
					'repository.id': req.query.school_id,
				},
			},
			{
				$group: {
					_id: '$questionType',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await activityModel.aggregate([
			{
				$group: {
					_id: '$activity_type',
					num: { $sum: 1 },
				},
			},
		]);
		castList = await studentModel.aggregate([
			{
				$group: {
					_id: '$caste',
					num: { $sum: 1 },
				},
				// eslint-disable-next-line no-dupe-keys
				$group: {
					_id: '$profile_type',
					num: { $sum: 1 },
				},
			},
		]);
		studentNumber = await studentModel.aggregate([
			{
				$group: {
					_id: '$gender',
					num: { $sum: 1 },
				},
			},
		]);
		UserList = await userModel.aggregate([
			{
				$group: {
					_id: '$profile_type',
					num: { $sum: 1 },
				},
			},
		]);
		QuestionList = await questionModel.aggregate([
			{
				$group: {
					_id: '$questionType',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
		List: castList,
		user: UserList,
		question: QuestionList,
		studentNumber,
	});
});

exports.stdCasteCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [{ caste: { $ne: '' } }, { caste: { $ne: null } }],
				},
			},
			{
				$group: {
					_id: '$caste',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [{ caste: { $ne: '' } }, { caste: { $ne: null } }],
				},
			},
			{
				$group: {
					_id: '$caste',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
	});
});
exports.stdMotherTongeCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [
						{ mother_tongue: { $ne: '' } },
						{ mother_tongue: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$mother_tongue',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [
						{ mother_tongue: { $ne: '' } },
						{ mother_tongue: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$mother_tongue',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
	});
});
exports.stdModeOfTansportCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [
						{ mode_of_transp: { $ne: '' } },
						{ mode_of_transp: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$mode_of_transp',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [
						{ mode_of_transp: { $ne: '' } },
						{ mode_of_transp: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$mode_of_transp',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
	});
});
exports.stdWithGlassCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [
						{ wear_glasses: { $ne: '' } },
						{ wear_glasses: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$wear_glasses',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [
						{ wear_glasses: { $ne: '' } },
						{ wear_glasses: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$wear_glasses',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
	});
});
exports.stdBloodGrCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [{ blood_gr: { $ne: '' } }, { blood_gr: { $ne: null } }],
				},
			},
			{
				$group: {
					_id: '$blood_gr',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [{ blood_gr: { $ne: '' } }, { blood_gr: { $ne: null } }],
				},
			},
			{
				$group: {
					_id: '$blood_gr',
					num: { $sum: 1 },
				},
			},
		]);
	}
	res.status(200).json({
		data: tours,
	});
});
exports.stdIllnessCount = catchAsync(async (req, res, next) => {
	let tours;
	if (req.query.school_id) {
		tours = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.query.school_id),
					$and: [
						{ medical_cond: { $ne: '' } },
						{ medical_cond: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$medical_cond',
					num: { $sum: 1 },
				},
			},
		]);
	} else {
		tours = await studentModel.aggregate([
			{
				$match: {
					$and: [
						{ medical_cond: { $ne: '' } },
						{ medical_cond: { $ne: null } },
					],
				},
			},
			{
				$group: {
					_id: '$medical_cond',
					num: { $sum: 1 },
				},
			},
		]);
	}

	res.status(200).json({
		data: tours,
	});
});

exports.studentCount = catchAsync(async (req, res, next) => {
	let tours = 0;
	const pending = 0;
	let toursRe = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		assignTo: { $elemMatch: { student_id: req.params.id } },
	});
	/// /////////////////////get articular activity number of student //////////
	tours = await activityModel.aggregate([
		{
			$match: {
				submited_by: {
					$elemMatch: { student_id: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Assignment' } },
		},
	]);
	toursRe = await activityModel.aggregate([
		{
			$match: {
				assignTo: {
					$elemMatch: { student_id: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$match: { assignTo: { $elemMatch: { status: 'Re-Submitted' } } },
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Assignment' } },
		},
	]);

	if (tours.length > 0) {
		let reassign;
		if (toursRe.length > 0) {
			reassign = toursRe[0].num;
		} else {
			reassign = 0;
		}
		const avg = (tours[0].num / activityList.length) * 100;

		const pendingdata = activityList.length - tours[0].num;
		res.status(200).json({
			Assignment: {
				completed: tours[0].num,
				total: activityList.length,
				totalAssignment:
					tours[0].num + toursRe && toursRe.length ? toursRe[0].num : 0,
				average: avg,
				pending: pendingdata,
				reAssign: reassign,
			},
		});
	} else {
		res.status(200).json({
			Assignment: {
				completed: 0,
				total: activityList.length,
				average: 0,
				pending: 0,
				reAssign: 0,
			},
		});
	}
});

exports.lateSubmission = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const assignment = await activityModel.aggregate([
		{
			$match: {
				'assignTo.student_id': id,
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: {
							$eq: ['$$item.student_id', id],
						},
					},
				},
				submited_by: {
					$filter: {
						input: '$submited_by',
						as: 'item',
						cond: {
							$eq: ['$$item.student_id', id],
						},
					},
				},
				acknowledge_by: {
					$filter: {
						input: '$acknowledge_by',
						as: 'item',
						cond: {
							$eq: ['$$item.acknowledge_by', id],
						},
					},
				},
				not_going: {
					$filter: {
						input: '$not_going',
						as: 'item',
						cond: {
							$eq: ['$$item._id', id],
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: {
					$sum: 1,
				},
				completed: {
					$sum: {
						$cond: [
							{
								$in: [
									{
										$first: '$assignTo.status',
									},
									['Submitted', 'Evaluated', 'Re-Submitted'],
								],
							},
							1,
							0,
						],
					},
				},
				lateSubmission1: {
					$sum: {
						$cond: [
							{
								$gt: [
									{
										$first: '$acknowledge_by.submitted_date',
									},
									'$dueDate',
								],
							},
							1,
							0,
						],
					},
				},
				lateSubmission: {
					$sum: {
						$cond: [
							{
								$gt: [
									{
										$first: '$submited_by.submitted_date',
									},
									'$dueDate',
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				total: 1,
				completed: 1,
				late_Submission: {
					$sum: ['$lateSubmission', '$lateSubmission1'],
				},
			},
		},
	]);
	let late_Submission = 0;
	let average = 0;
	let completed = 0;
	let total = 0;
	if (assignment && assignment.length) {
		for (const ele of assignment) {
			completed += ele.completed;
			late_Submission += ele.late_Submission;
			total += ele.total;
		}
		average = (late_Submission / completed) * 100;
		res.status(200).json({
			total,
			completed,
			late_Submission,
			average,
		});
	} else {
		res.status(400).json({
			Assignment: {
				completed: 0,
				total: 0,
				average: 0,
				pending: 0,
				lateSubmission: 0,
				reAssign: 0,
			},
		});
	}
});

exports.assignmentStats = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const assignment = await activityModel.aggregate([
		{
			$match: {
				assignTo: { $elemMatch: { student_id: id } },
				activity_type: 'Assignment',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				submited_by: {
					$filter: {
						input: '$submited_by',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: { $sum: 1 },
				completed: {
					$sum: {
						$cond: [
							{
								// $or: [
								//     { $eq: [{ $first: "$assignTo.status" }, "Evaluated"] },
								//     { $eq: [{ $first: "$assignTo.status" }, "Submitted"] },
								//     { $eq: [{ $first: "$assignTo.status" }, "Re-Submitted"] }
								// ]
								$in: [
									{ $first: '$assignTo.status' },
									['Submitted', 'Evaluated', 'Re-Submitted'],
								],
								// $eq: [{ $first: "$submited_by.student_id" }, id]
							},
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Pending'] }, 1, 0],
					},
				},
				lateSubmission: {
					$sum: {
						$cond: [
							{
								$gt: [{ $first: '$submited_by.submitted_date' }, '$dueDate'],
							},
							1,
							0,
						],
					},
				},
				reAssign: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Re-work'] }, 1, 0],
					},
				},
			},
		},
		{
			$addFields: {
				average: {
					$multiply: [
						{
							$divide: [
								{
									$cond: [
										{
											$gt: [{ $subtract: ['$completed', '$reAssign'] }, 0],
										},
										{ $subtract: ['$completed', '$reAssign'] },
										0,
									],
								},
								'$total',
							],
						},
						100,
					],
				},
			},
		},
	]);
	if (assignment && assignment.length) {
		delete assignment[0]._id;
		res.status(200).json({ Assignment: assignment[0] });
	} else {
		res.status(200).json({
			Assignment: {
				completed: 0,
				total: 0,
				average: 0,
				pending: 0,
				lateSubmission: 0,
				reAssign: 0,
			},
		});
	}
});

exports.AllStats = catchAsync(async (req, res, next) => {
	const obj = [];
	let livePool = 0;
	let Announcement = 0;
	let Event = 0;
	let CheckList = 0;
	let total = 0;
	let totalNum = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const totalLivePoll = await activityModel.find({
		$and: [
			{ assignTo: { $elemMatch: { student_id: req.params.id } } },
			{ activity_type: 'LivePoll' },
		],
	});
	const totalAnnouncement = await activityModel.find({
		$and: [
			{ assignTo: { $elemMatch: { student_id: req.params.id } } },
			{ activity_type: 'Announcement' },
		],
	});
	const totalEvent = await activityModel.find({
		$and: [
			{ assignTo: { $elemMatch: { student_id: req.params.id } } },
			{ activity_type: 'Event' },
		],
	});
	const totalCheckList = await activityModel.find({
		$and: [
			{ assignTo: { $elemMatch: { student_id: req.params.id } } },
			{ activity_type: 'Check List' },
		],
	});
	const totalAssignment = await activityModel.find({
		$and: [
			{ assignTo: { $elemMatch: { student_id: req.params.id } } },
			{ activity_type: 'Assignment' },
		],
	});

	/// /////////////////////get articular activity number of student //////////
	livePool = await activityModel.aggregate([
		{
			$match: {
				selected_livepool: {
					$elemMatch: { selected_by: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'LivePoll' } },
		},
	]);

	Announcement = await activityModel.aggregate([
		{
			$match: {
				acknowledge_by: {
					$elemMatch: {
						acknowledge_by: mongoose.Types.ObjectId(req.params.id),
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Announcement' } },
		},
	]);
	Event = await activityModel.aggregate([
		{
			$match: { going: mongoose.Types.ObjectId(req.params.id) },
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Event' } },
		},
	]);
	CheckList = await activityModel.aggregate([
		{
			$match: {
				selected_checkList: {
					$elemMatch: { selected_by: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Check List' } },
		},
	]);
	const tours = await activityModel.aggregate([
		{
			$match: {
				submited_by: {
					$elemMatch: { student_id: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Assignment' } },
		},
	]);
	if (livePool.length > 0) {
		const live = (livePool[0].num / totalLivePoll.length) * 100;
		obj.push({
			livepool: {
				completed: livePool[0].num,
				total: totalLivePoll.length,
				average: live,
			},
		});
	} else {
		obj.push({
			livepool: {
				completed: 0,
				total: totalLivePoll.length,
				average: livePool.length,
			},
		});
	}
	if (Announcement && Announcement.length > 0) {
		const Announcementavg =
			(Announcement[0].num / totalAnnouncement.length) * 100;
		obj.push({
			Announcement: {
				completed: Announcement[0].num,
				total: totalAnnouncement.length,
				average: Announcementavg,
			},
		});
	} else {
		obj.push({
			Announcement: {
				completed: 0,
				total: totalAnnouncement.length,
				average: Announcement.length,
			},
		});
	}
	if (Event.length > 0) {
		const Eventavg = (Event[0].num / totalEvent.length) * 100;
		obj.push({
			Event: {
				completed: Event[0].num,
				total: totalEvent.length,
				average: Eventavg,
			},
		});
	} else {
		obj.push({
			Event: {
				completed: 0,
				total: totalEvent.length,
				average: Event.length,
			},
		});
	}
	if (tours.length > 0) {
		const toursavg = (tours[0].num / totalAssignment.length) * 100;
		obj.push({
			Assignment: {
				completed: tours[0].num,
				total: totalAssignment.length,
				average: toursavg,
			},
		});
	} else {
		obj.push({
			Assignment: {
				completed: 0,
				total: totalAssignment.length,
				// eslint-disable-next-line no-undef
				average: toursavg.length,
			},
		});
	}
	if (CheckList.length > 0) {
		const CheckListavg = (CheckList[0].num / totalCheckList.length) * 100;
		obj.push({
			CheckList: {
				completed: CheckList[0].num,
				total: totalCheckList.length,
				average: CheckListavg,
			},
		});
	} else {
		obj.push({
			CheckList: {
				completed: 0,
				total: totalCheckList.length,
				average: CheckList.length,
			},
		});
	}
	total =
		totalLivePoll.length +
		totalAnnouncement.length +
		totalEvent.length +
		totalAssignment.length +
		totalCheckList.length;
	totalNum =
		obj[0].livepool.completed +
		obj[1].Announcement.completed +
		obj[2].Event.completed +
		obj[3].Assignment.completed +
		obj[4].CheckList.completed;
	const totalAvg =
		obj[0].livepool.average +
		obj[1].Announcement.average +
		obj[2].Event.average +
		obj[3].Assignment.average +
		obj[4].CheckList.average;
	if (total > 0) {
		const totalavg = totalAvg / obj.length;
		obj.push({
			Total: {
				completed: totalNum,
				total,
				average: totalavg,
			},
		});
	} else {
		obj.push({
			Total: {
				completed: 0,
				total,
				average: 0,
			},
		});
	}
	res.status(200).json({
		data: obj,
	});
});

exports.livepoolStatsTeacher = catchAsync(async (req, res, next) => {
	let livePool = 0;
	let counter = 0;

	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		$and: [
			{ assignTo_you: { $elemMatch: { teacher_id: req.params.id } } },
			{ activity_type: 'LivePoll' },
		],
	});
	/// /////////////////////get articular activity number of student //////////
	livePool = await activityModel.aggregate([
		{
			$match: {
				selected_livepool: {
					$elemMatch: {
						selected_by_teacher: mongoose.Types.ObjectId(req.params.id),
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'LivePoll' } },
		},
	]);
	if (livePool.length > 0) {
		for (const ele of activityList) {
			for (const ele2 of ele.selected_livepool) {
				if (ele2.submitted_date > ele.EndTime) {
					counter += 1;
				}
			}
		}
		const live = (livePool[0].num / activityList.length) * 100;
		res.status(200).json({
			livepool: {
				completed: livePool[0].num,
				total: activityList.length,
				average: live,
				delayedSubmission: counter,
			},
		});
	} else {
		res.status(200).json({
			livepool: {
				completed: 0,
				total: activityList.length,
				average: livePool.length,
				delayedSubmission: 0,
			},
		});
	}
});

exports.livepoolStats = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const livepoll = await activityModel.aggregate([
		{
			$match: {
				assignTo: { $elemMatch: { student_id: id } },
				activity_type: 'LivePoll',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				selected_livepool: {
					$filter: {
						input: '$selected_livepool',
						as: 'item',
						cond: { $eq: ['$$item.selected_by', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: { $sum: 1 },
				completed: {
					$sum: {
						$cond: [
							{
								// $or: [
								//     { $eq: [{ $first: "$assignTo.status" }, "Evaluated"] },
								//     { $eq: [{ $first: "$assignTo.status" }, "Submitted"] }
								// ]
								$in: [
									{ $first: '$assignTo.status' },
									['Submitted', 'Evaluated'],
								],
							},
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Pending'] }, 1, 0],
					},
				},
				delayedSubmission: {
					$sum: {
						$cond: [
							{
								$gt: [
									{ $first: '$selected_livepool.submitted_date' },
									'$dueDate',
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$addFields: {
				average: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
			},
		},
	]);
	if (livepoll && livepoll.length) {
		delete livepoll[0]._id;
		res.status(200).json({ livepool: livepoll[0] });
	} else {
		res.status(200).json({
			livepool: {
				completed: 0,
				pending: 0,
				total: 0,
				average: 0,
				delayedSubmission: 0,
			},
		});
	}
});

exports.AnnuncncementStat = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const announcement = await activityModel.aggregate([
		{
			$match: {
				assignTo: { $elemMatch: { student_id: id } },
				activity_type: 'Announcement',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				acknowledge_by: {
					$filter: {
						input: '$acknowledge_by',
						as: 'item',
						cond: { $eq: ['$$item.acknowledge_by', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: { $sum: 1 },
				completed: {
					$sum: {
						$cond: [
							{ $eq: [{ $first: '$acknowledge_by.acknowledge_by' }, id] },
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Pending'] }, 1, 0],
					},
				},
				delayedSubmission: {
					$sum: {
						$cond: [
							{
								$or: [
									{
										$gt: [
											{ $first: '$acknowledge_by.submitted_date' },
											'$dueDate',
										],
									},
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$addFields: {
				average: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
			},
		},
	]);
	if (announcement && announcement.length) {
		delete announcement[0]._id;
		res.status(200).json({ Announcement: announcement[0] });
	} else {
		res.status(200).json({
			Announcement: {
				completed: 0,
				pending: 0,
				total: 0,
				average: 0,
				delayedSubmission: 0,
			},
		});
	}
});

exports.AnnuncncementStatTeacher = catchAsync(async (req, res, next) => {
	let counter = 0;
	let Announcement = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		$and: [
			{ assignTo_you: { $elemMatch: { teacher_id: req.params.id } } },
			{ activity_type: 'Announcement' },
		],
	});
	/// /////////////////////get articular activity number of student //////////
	Announcement = await activityModel.aggregate([
		{
			$match: {
				acknowledge_by_teacher: {
					$elemMatch: {
						acknowledge_by_teacher: mongoose.Types.ObjectId(req.params.id),
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Announcement' } },
		},
	]);
	if (Announcement.length > 0) {
		for (const ele of activityList) {
			for (const ele2 of ele.acknowledge_by_teacher) {
				if (ele2.submitted_date > ele.EndTime) {
					counter += 1;
				}
			}
		}
		const Announcementavg = (Announcement[0].num / activityList.length) * 100;
		res.status(200).json({
			Announcement: {
				completed: Announcement[0].num,
				total: activityList.length,
				average: Announcementavg,
				delayedSubmission: counter,
			},
		});
	} else {
		res.status(200).json({
			Announcement: {
				completed: 0,
				total: activityList.length,
				average: Announcement.length,
				delayedSubmission: 0,
			},
		});
	}
});

exports.EventStats = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const events = await activityModel.aggregate([
		{
			$match: {
				assignTo: { $elemMatch: { student_id: id } },
				activity_type: 'Event',
			},
		},
		{
			$project: {
				activity_type: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				going: {
					$filter: {
						input: '$going',
						as: 'item',
						cond: { $eq: ['$$item', id] },
					},
				},
				not_going: {
					$filter: {
						input: '$not_going',
						as: 'item',
						cond: { $eq: ['$$item', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: { $sum: 1 },
				completed: {
					$sum: {
						$cond: [
							{
								$or: [
									{ $eq: [{ $first: '$going' }, id] },
									{ $eq: [{ $first: '$not_going' }, id] },
								],
							},
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Pending'] }, 1, 0],
					},
				},
			},
		},
		{
			$addFields: {
				average: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
			},
		},
	]);
	if (events && events.length) {
		delete events[0]._id;
		res.status(200).json({ Event: events[0] });
	} else {
		res.status(200).json({
			Event: {
				total: 0,
				completed: 0,
				pending: 0,
				average: 0,
			},
		});
	}
});

exports.EventStatsTeacher = catchAsync(async (req, res, next) => {
	let Event = 0;
	let not_goingEvent = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		$and: [
			{ assignTo_you: { $elemMatch: { teacher_id: req.params.id } } },
			{ activity_type: 'Event' },
		],
	});
	/// /////////////////////get articular activity number of student //////////
	Event = await activityModel.aggregate([
		{
			$match: { going_by_teacher: mongoose.Types.ObjectId(req.params.id) },
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Event' } },
		},
	]);

	not_goingEvent = await activityModel.aggregate([
		{
			$match: {
				not_going_by_teacher: mongoose.Types.ObjectId(req.params.id),
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Event' } },
		},
	]);
	if (Event.length > 0) {
		const Eventavg = (Event[0].num / activityList.length) * 100;
		res.status(200).json({
			Event: {
				completed: Event[0].num,
				total: activityList.length,
				average: Eventavg,
				pending:
					activityList.length -
					(!not_goingEvent[0] ? 0 : not_goingEvent[0].num) -
					Event[0].num,
			},
		});
	} else {
		res.status(200).json({
			Event: {
				completed: 0,
				total: activityList.length,
				average: Event.length,
				pending:
					activityList.length -
					(!not_goingEvent[0] ? 0 : not_goingEvent[0].num) -
					0,
			},
		});
	}
});

exports.checkList = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const checkList = await activityModel.aggregate([
		{
			$match: {
				assignTo: { $elemMatch: { student_id: id } },
				activity_type: 'Check List',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				selected_checkList: {
					$filter: {
						input: '$selected_checkList',
						as: 'item',
						cond: { $eq: ['$$item.selected_by', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				total: { $sum: 1 },
				completed: {
					$sum: {
						$cond: [
							{ $eq: [{ $first: '$selected_checkList.selected_by' }, id] },
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo.status' }, 'Pending'] }, 1, 0],
					},
				},
				delayedSubmission: {
					$sum: {
						$cond: [
							{
								$or: [
									{
										$gt: [
											{ $first: '$selected_checkList.submitted_date' },
											'$dueDate',
										],
									},
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$addFields: {
				average: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
			},
		},
	]);
	if (checkList && checkList.length) {
		delete checkList[0]._id;
		res.status(200).json({ CheckList: checkList[0] });
	} else {
		res.status(200).json({
			CheckList: {
				total: 0,
				completed: 0,
				pending: 0,
				delayedSubmission: 0,
				average: 0,
			},
		});
	}
});

exports.checkListTeacher = catchAsync(async (req, res, next) => {
	let counter = 0;
	let CheckList = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		$and: [
			{ assignTo_you: { $elemMatch: { teacher_id: req.params.id } } },
			{ activity_type: 'Check List' },
		],
	});
	/// /////////////////////get articular activity number of student //////////
	CheckList = await activityModel.aggregate([
		{
			$match: {
				selected_checkList: {
					$elemMatch: {
						selected_by_teacher: mongoose.Types.ObjectId(req.params.id),
					},
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Check List' } },
		},
	]);

	if (CheckList.length > 0) {
		for (const ele of activityList) {
			for (const ele2 of ele.selected_checkList) {
				if (ele2.submitted_date > ele.EndTime) {
					counter += 1;
				}
			}
		}
		const CheckListavg = (CheckList[0].num / activityList.length) * 100;
		res.status(200).json({
			CheckList: {
				completed: CheckList[0].num,
				total: activityList.length,
				average: CheckListavg,
				delayedSubmission: counter,
			},
		});
	} else {
		res.status(200).json({
			CheckList: {
				completed: 0,
				total: activityList.length,
				average: CheckList.length,
				delayedSubmission: 0,
			},
		});
	}
});

exports.totalStats = catchAsync(async (req, res, next) => {
	let sum = 0;
	let events = 0;
	let Announcement = 0;
	let livePool = 0;
	let tours = 0;
	/// /////////////////////// get activity number of a student /////////
	const { id } = req.params;
	const activityList = await activityModel.find({
		assignTo: { $elemMatch: { student_id: req.params.id } },
	});

	events = await activityModel.aggregate([
		{
			$match: { going: mongoose.Types.ObjectId(req.params.id) },
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Event' } },
		},
	]);
	tours = await activityModel.aggregate([
		{
			$match: {
				submited_by: {
					$elemMatch: { student_id: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Assignment' } },
		},
	]);

	livePool = await activityModel.aggregate([
		{
			$match: {
				selected_livepool: {
					$elemMatch: { student_id: mongoose.Types.ObjectId(req.params.id) },
				},
			},
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'LivePoll' } },
		},
	]);

	Announcement = await activityModel.aggregate([
		{
			$match: { acknowledge_by: mongoose.Types.ObjectId(req.params.id) },
		},
		{
			$group: {
				_id: '$activity_type',
				num: { $sum: 1 },
			},
		},
		{
			$match: { _id: { $eq: 'Announcement' } },
		},
	]);
	sum = events[0].num + Announcement[0].num + tours[0].num;
	const average = (sum / activityList.length) * 100;
	res.status(200).json({
		completed: sum,
		total: activityList.length,
		average,
	});
});
/// /////////////////////////////// faculty list //////////////////////
exports.totalFaculty = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(userModel.find({}), req.body)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const cacheKey = `totalFaculty:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	let records = 0;
	let responseData;
	if (!cachedData) {
		const teacherData = await features.query;
		responseData = teacherData;
		records = teacherData.length;
		await redisClient.SET(cacheKey, JSON.stringify(responseData), {
			EX: 86400,
		});
	} else {
		responseData = JSON.parse(cachedData);
		records = responseData.length;
	}

	res.json({
		status: 200,
		count: records,
		result: responseData,
	});
});
/// /////////////////////////////// parent list //////////////////////
exports.totalParent = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		studentModel
			.find({})
			.select(
				'-repository -subject -createdAt -updatedAt -username -password -profile_type -school_id -branch_id -contact_number -section -dob -gender -email -address -aadhar -sts_no -rte_student -caste -mother_tongue -blood_gr -mode_of_transp -medical_cond -wear_glasses -class -profile_image -about_me -hobbies'
			),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const cacheKey = `totalParent:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	const obj = [];
	let responseData;
	let records = 0;

	if (!cachedData) {
		const parentData = await features.query;
		// eslint-disable-next-line no-shadow
		for (const element of parentData) {
			const parentData1 = await parentModel.findById(element.parent_id);
			if (parentData1) {
				obj.push({
					parentId: parentData1._id,
					parentName: parentData1.father_name,
					parentNumber: parentData1.f_contact_number,
					studentId: element._id,
					studentName: element.name,
				});
			}
		}
		// parentData = obj;
		const element = obj;
		responseData = obj;
		records = responseData.length;
		await redisClient.SET(cacheKey, JSON.stringify(responseData), {
			EX: 86400,
		});
	} else {
		responseData = JSON.parse(cachedData);
		records = responseData.length;
	}
	res.json({
		status: 200,
		count: records,
		result: responseData,
	});
});
/// ///////////////////////////// total student ///////////////////////////////////
exports.studentListCount = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(studentModel.find({}), req.body)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const cacheKey = `studentListCount:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	let count = 0;
	if (!cachedData) {
		const studentData = await features.query;
		count = studentData.length;
		await redisClient.SET(cacheKey, count, { EX: 86400 });
	} else {
		count = cachedData;
	}
	res.json({
		status: 200,
		result: count,
	});
});

exports.classprogress = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(studentModel.find({}), req.body)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const studentData = await features.query;
	/// ///////////////////////////////////////////////////////////////////////////
	const Announcement = await activityModel.aggregate([
		{
			$group: {
				_id: '$assignTo.class_id',
				num: { $sum: 1 },
			},
		},
	]);
	res.json({
		status: 200,
		result: studentData.length,
		calculatedData: Announcement,
	});
});
exports.classprogressActivity = async (req, res) => {
	/// /////////////////////////////////////////////////////////////////////////////
	const { id } = req.params;
	let payload = null;
	if (req.body['assignTo.class_id']) {
		payload = {
			'assignTo.class_id': mongoose.Types.ObjectId(
				req.body['assignTo.class_id']
			),
			'repository.id': id,
		};
	} else if (req.body['assignTo_you.teacher_id']) {
		payload = {
			'assignTo_you.teacher_id': mongoose.Types.ObjectId(
				req.body['assignTo_you.teacher_id']
			),
			'repository.id': id,
		};
	} else {
		payload = {
			'assignTo.student_id': mongoose.Types.ObjectId(
				req.body['assignTo.student_id']
			),
			'repository.id': id,
		};
	}

	const activity = await activityModel.aggregate([
		{
			$match: payload,
		},
		{
			$group: {
				_id: '$activity_type',
				num: {
					$sum: 1,
				},
				completed: {
					$sum: {
						$cond: [
							{
								$in: [
									{
										$first: '$assignTo.status',
									},
									['Submitted', 'Evaluated', 'Re-Submitted'],
								],
							},
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [
							{
								$in: [
									{
										$first: '$assignTo.status',
									},
									['Pending', 'Re-Assign'],
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				num: 1,
				pending: 1,
				completed: 1,
			},
		},
	]);
	let completed = 0;
	let num = 0;
	let pending = 0;
	if (activity && activity.length) {
		for (const ele of activity) {
			completed += ele.completed;
			num += ele.num;
			pending += ele.pending;
		}
	}
	const avgData = (completed / num) * 100;
	res.status(200).json({
		num,
		completed,
		pending,
		avgData,
	});
};

exports.scheduleClassCount = catchAsync(async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const classes = await scheduleClassModel.aggregate([
		{
			$match: { assign_To: { $elemMatch: { student_id: id } } },
		},
		{
			$project: {
				assign_To: {
					$filter: {
						input: '$assign_To',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
				student_join_class: {
					$filter: {
						input: '$student_join_class',
						as: 'item',
						cond: { $eq: ['$$item.student_id', id] },
					},
				},
			},
		},
		{
			$group: {
				_id: { $first: '$assign_To.student_id' },
				total: { $sum: 1 },
				AttendClass: {
					$sum: {
						$cond: [
							{ $eq: [{ $first: '$student_join_class.student_id' }, id] },
							1,
							0,
						],
					},
				},
			},
		},
		{
			$addFields: {
				average: {
					$multiply: [{ $divide: ['$AttendClass', '$total'] }, 100],
				},
			},
		},
	]);
	if (classes && classes.length) {
		delete classes[0]._id;
		res.status(200).json({ attendance_details: classes[0] });
	} else {
		res.status(200).json({
			attendance_details: {
				total: 0,
				AttendClass: 0,
				average: 0,
			},
		});
	}
});

exports.schooldetailsStats = catchAsync(async (req, res, next) => {
	try {
		// eslint-disable-next-line no-shadow
		const features = new APIFeatures(
			studentModel.find({}).populate({ path: 'class', select: 'name' }),
			req.query
		)
			.filter()
			.sort();

		// eslint-disable-next-line no-shadow
		const getAllStudent = await features.query;

		res.status(200).json({
			status: 'success',
			result: getAllStudent.length,
			data: getAllStudent,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
});

exports.dashbaordStatsdetails = catchAsync(async (req, res, next) => {
	const id = req.query.school_id;
	const features = new APIFeatures(
		studentModel
			.find({})
			.populate({ path: 'class', select: 'name' })
			.populate({ path: 'school_id', select: 'schoolName' }),
		req.query
	)
		.filter()
		.sort();

	const getAllStudent = await features.query;
	const activityList = await studentModel.aggregate([
		{
			$match: { school_id: mongoose.Types.ObjectId(id) },
		},
		{
			$group: {
				_id: '$class',
				num: { $sum: 1 },
			},
		},
	]);
	// const schoolModel = require('./../model/school');
	const features_school = new APIFeatures(schoolModel.find({}), req.query)
		.filter()
		.sort();

	const getAllSchool = await features_school.query;
	res.status(200).json({
		status: 'success',
		studentCount: getAllStudent.length,
		classList: activityList,
		data: getAllStudent,
	});
});

exports.branchCount = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(schoolModel.find({}), req.query)
		.filter()
		.sort();
	const cacheKey = `branchCount:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	let count = 0;

	if (!cachedData) {
		const getAllSchool = await features.query;
		const branchArray = [getAllSchool.branch];
		count = branchArray.length;
		await redisClient.SET(cacheKey, count, { EX: 86400 });
	} else {
		count = cachedData;
	}
	res.status(200).json({
		status: 'success',
		branchList: count,
	});
});

exports.studentdashboardCount = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		studentModel.find({}).populate({
			path: 'school_id',
			select: '_id schoolName school_code',
		}),
		req.query
	)
		.filter()
		.sort()
		.limitFields();

	let groupValues;
	const cacheKey = `studDashCount:${JSON.stringify(features.queryString)}`;
	const cachedGroupValues = await redisClient.GET(cacheKey);

	if (!cachedGroupValues) {
		const foundStudData = await features.query;
		const studData = JSON.parse(JSON.stringify(foundStudData));

		const group_to_values = studData.reduce((obj, item) => {
			if (item.school_id) {
				obj[item.school_id._id] = obj[item.school_id._id] || {};
				obj[item.school_id._id].school = obj[item.school_id._id].school || {};
				obj[item.school_id._id].gender = obj[item.school_id._id].gender || [];
				obj[item.school_id._id].totalStudentInSchool =
					obj[item.school_id._id].totalStudentInSchool || 0;
				obj[item.school_id._id].boys = obj[item.school_id._id].boys || 0;
				obj[item.school_id._id].girls = obj[item.school_id._id].girls || 0;

				obj[item.school_id._id].school.schoolId = item.school_id._id;
				obj[item.school_id._id].school.schoolName = item.school_id.schoolName;
				obj[item.school_id._id].school.schoolCode = item.school_id.school_code;
				obj[item.school_id._id].gender.push(item.gender);
				obj[item.school_id._id].totalStudentInSchool += 1;
				if (item?.gender?.toLowerCase() === 'male') {
					obj[item.school_id._id].boys += 1;
				} else if (item?.gender?.toLowerCase() === 'female') {
					obj[item.school_id._id].girls += 1;
				}
			}
			return obj;
		}, {});

		groupValues = Object.values(group_to_values);
		// set redis key value with expiration of 24hrs
		await redisClient.SET(cacheKey, JSON.stringify(groupValues), { EX: 86400 });
	} else {
		groupValues = JSON.parse(cachedGroupValues);
	}

	res.json({
		status: 200,
		count: groupValues.length,
		groups: groupValues,
	});
});

exports.studentdashboardCountPost = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(studentModel.find({}), req.body)
		.filter()
		.sort()
		.limitFields();

	const cacheKey = `studDashCountPost:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	let count = 0;

	if (!cachedData) {
		const studentData = await features.query;

		const group_to_values = studentData.reduce((obj, item) => {
			obj[item.school_id] = obj[item.school_id] || [];
			obj[item.school_id].push(item.gender);
			return obj;
		}, {});

		const groupValues = Object.keys(group_to_values);
		count = groupValues.length;
		await redisClient.SET(cacheKey, count, { EX: 86400 });
	} else {
		count = cachedData;
	}

	res.json({
		status: 200,
		count,
	});
});

exports.studentClassList = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(studentModel.find({}), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const cacheKey = `studentClassList:${JSON.stringify(features.queryString)}`;
	const cachedData = await redisClient.GET(cacheKey);
	let count = 0;
	const groups = [];
	/// ///////////////////////////////////////////////////////////////////////////
	if (!cachedData) {
		const studentData = await features.query;

		const group_to_values = studentData.reduce((obj, item) => {
			count += 1;
			obj[item.class] = obj[item.class] || [];
			obj[item.class].push(item.gender);
			return obj;
		}, {});
		let classList = [];
		const groupValues = Object.keys(group_to_values);
		for (const key of groupValues) {
			const className = await classModel.findById(key);
			classList = { classId: className._id, className: className.name };
			let boys = 0;
			let girls = 0;
			for (let i = 0; i < group_to_values[key].length; i++) {
				if (group_to_values[key][i] == 'Male') {
					boys += 1;
				}
				if (group_to_values[key][i] == 'Female') {
					girls += 1;
				}
			}
			groups.push({
				class: classList,
				gender: group_to_values[key],
				totalStudentInClass: group_to_values[key].length,
				totalStudentInSchool: count,
				boys,
				girls,
			});
		}

		await redisClient.SET(cacheKey, JSON.stringify(groups), { EX: 86400 });
	} else {
		groups.push([...JSON.parse(cachedData)]);
	}
	res.json({
		status: 200,
		groups,
	});
});

exports.studentClassListCount = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(studentModel.find({}), req.query)
		.filter()
		.sort();

	const cacheKey = `studentClassListCount:${JSON.stringify(
		features.queryString
	)}`;
	const cachedData = await redisClient.GET(cacheKey);
	const studentData = await features.query;
	let count = 0;
	let groupCount = 0;
	/// ///////////////////////////////////////////////////////////////////////////
	if (!cachedData) {
		const group_to_values = studentData.reduce((obj, item) => {
			count += 1;
			obj[item.class] = obj[item.class] || [];
			obj[item.class].push(item.gender);
			return obj;
		}, {});
		let classList = [];
		const groupValues = Object.keys(group_to_values);
		const groups = [];
		for (const key of groupValues) {
			const className = await classModel.findById(key);
			classList = { classId: className._id, className: className.name };
			let boys = 0;
			let girls = 0;
			for (let i = 0; i < group_to_values[key].length; i++) {
				if (group_to_values[key][i] == 'Male') {
					boys += 1;
				}
				if (group_to_values[key][i] == 'Female') {
					girls += 1;
				}
			}
			groups.push({
				class: classList,
				gender: group_to_values[key],
				totalStudentInClass: group_to_values[key].length,
				totalStudentInSchool: count,
				boys,
				girls,
			});
		}
		groupCount = groups.length;
		await redisClient.SET(cacheKey, groupCount, { EX: 86400 });
	} else {
		groupCount = cachedData;
	}

	res.json({
		status: 200,
		length: groupCount,
	});
});

exports.genderCount = catchAsync(async (req, res, next) => {
	let features = null;
	const { school_id } = req.query;
	if (school_id) {
		features = await studentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(school_id),
				},
			},
			{
				$group: {
					_id: '$school_id',
					totalBoys: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Male'],
								},
								1,
								0,
							],
						},
					},
					totalGirls: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Female'],
								},
								1,
								0,
							],
						},
					},
				},
			},
		]);
	} else {
		features = await studentModel.aggregate([
			{
				$group: {
					_id: '$school_id',
					totalBoys: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Male'],
								},
								1,
								0,
							],
						},
					},
					totalGirls: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Female'],
								},
								1,
								0,
							],
						},
					},
				},
			},
			{
				$group: {
					_id: 0,
					totalBoys: {
						$sum: '$totalBoys',
					},
					totalGirls: {
						$sum: '$totalGirls',
					},
				},
			},
			{
				$project: {
					_id: 0,
					totalBoys: 1,
					totalGirls: 1,
				},
			},
		]);
	}
	if (!features) {
		return next(new ErrorResponse('No Students Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(features, 1, 'Students count fetched successfully'));
});

exports.classGenderCount = catchAsync(async (req, res, next) => {
	const limit = req.query.limit ? parseInt(req.query.limit) : 10;
	const skip = req.query.page ? parseInt(req.query.page) * limit : 0;
	const cacheKey = `school:${req.params.school_id}:classGenderCount:${skip}&${limit}`;
	const cachedData = await redisClient.GET(cacheKey);

	let finalData = null;

	if (!cachedData) {
		const id = mongoose.Types.ObjectId(req.params.school_id);

		const foundClasses = await studentModel.aggregate([
			{
				$match: {
					school_id: id,
				},
			},
			{
				$project: {
					class: 1,
					gender: 1,
				},
			},
			{
				$group: {
					_id: '$class',
					students: {
						$sum: 1,
					},
					boys: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Male'],
								},
								1,
								0,
							],
						},
					},
					girls: {
						$sum: {
							$cond: [
								{
									$eq: ['$gender', 'Female'],
								},
								1,
								0,
							],
						},
					},
				},
			},
			{ $sort: { _id: 1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$lookup: {
					from: 'classes',
					let: {
						classId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$classId'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'class',
				},
			},
			{
				$project: {
					_id: 0,
					className: {
						$first: '$class.name',
					},
					students: 1,
					boys: 1,
					girls: 1,
				},
			},
		]);

		const data = {
			totalStudents: 0,
			totalBoys: 0,
			totalGirls: 0,
			classes: foundClasses,
		};

		foundClasses.forEach(cl => {
			data.totalStudents += cl.students;
			data.totalBoys += cl.boys;
			data.totalGirls += cl.girls;
		});

		finalData = data;
		await redisClient.SET(cacheKey, JSON.stringify(finalData), {
			EX: 60 * 60 * 24,
		});
	} else {
		finalData = JSON.parse(cachedData);
	}

	res.status(200).json(SuccessResponse(finalData, finalData.classes.length));
});
