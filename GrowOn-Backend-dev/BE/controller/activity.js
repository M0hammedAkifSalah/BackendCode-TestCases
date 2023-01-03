/* eslint-disable new-cap */
const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const Const = require('../utils/const');
const activityModel = require('../model/activity');
const roleModel = require('../model/role');
const rewardModel = require('../model/reward');
const Teacher = require('../model/teacher');
const Student = require('../model/student');
const User = require('../model/user');
const parent = require('../model/parent');
const Class = require('../model/class');
const Section = require('../model/section');
const { student_details_count } = require('./student');
const firebaseNoti = require('../firebase');
require('dotenv').config();
const SuccessResponse = require('../utils/successResponse');
const catchAsync = require('../utils/catchAsync');
/// /////////////////////////////// Global ////////////////////////////////////

exports.search = async (req, res, next) => {
	try {
		const { searchValue } = req.body;
		const { filterKeysArray } = req.body;
		const findObj = {};
		const searchArray = [];
		for (const ele of filterKeysArray) {
			const element = {
				[ele]: { $regex: searchValue, $options: 'i' },
			};
			searchArray.push(element);
		}
		if (searchArray && searchArray.length) {
			findObj.$or = searchArray;
		}

		await activityModel.find(findObj, (err, data) => {
			if (err) {
				console.log(err);
				res.status(400).json({
					data: err,
				});
			} else {
				res.status(201).json({
					length: data.length,
					data,
				});
			}
		});
	} catch (error) {
		console.log(error);
	}
};

exports.Updatestatus = async (req, res) => {
	const { id } = req.params;
	try {
		const exam = await activityModel.findById(id);
		if (!exam) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const updateExam = await activityModel.findByIdAndUpdate(id, {
				status: 'Evaluated',
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.UpdatestatusEvaluate = async (req, res) => {
	const { id } = req.params;
	try {
		const exam = await activityModel.findById(id);
		if (!exam) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const updateExam = await activityModel.findByIdAndUpdate(id, {
				status: 'Evaluate',
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GetAll = async (req, res, next) => {
	try {
		const recentDate = new Date().toISOString();
		await activityModel.updateMany(
			{
				'assignTo.status': 'Partially Pending',
				EndTime: { $lt: recentDate },
			},
			{
				$set: {
					'assignTo.$.status': 'Submitted',
				},
			},
			{ multi: true }
		);
		const studentId = req.body.assignTo ? req.body.assignTo.student_id : '';
		const parentId = req.body.assignTo_parent
			? req.body.assignTo_parent.parent_id
			: '';
		let userId;
		if (studentId.length > 0) userId = mongoose.Types.ObjectId(studentId);
		if (parentId.length > 0) userId = mongoose.Types.ObjectId(parentId);
		const features = new APIFeatures(
			activityModel
				.find({}, userId ? Const.activityProjection(userId) : {})
				.populate([
					{
						path: 'teacher_id',
						select:
							'name username mobile profile_type school_id branch_id primary_class secondary_class profile_image links',
					},
					{ path: 'comment.student_id', select: 'name profile_image' },
					{ path: 'comment.teacher_id', select: 'name profile_image' },
					{
						path: 'assignTo.student_id',
						select: 'name profile_image',
						options: { withDeleted: true },
					},
					{
						path: 'teacher_id',
						select: 'profile_type name profile_image',
						populate: { path: 'profile_type', select: 'role_name' },
					},
					{ path: 'assignTo_you.teacher_id', select: 'name profile_image' },
					{ path: 'assignTo_parent.student_id', select: 'name profile_image' },
					{
						path: 'assignTo_parent.parent_id',
						select: 'father_name profile_image',
					},
					{ path: 'submited_by' },
				]),
			req.body
		)
			.sort()
			// .limitFields()
			.paginate()
			.filter();
		const activityData = await features.query;
		const responeData = JSON.parse(JSON.stringify(activityData));
		let responseArray = [];
		if (userId) {
			for (const element of responeData) {
				element.rewardsData = {};
				const rewardData = await rewardModel.findOne(
					{
						activity_id: element._id,
						'student_details.student_id': userId,
					},
					{
						test_details: 1,
						activity_id: 1,
						teacher_details: {
							$filter: {
								input: '$teacher_details',
								as: 'item',
								cond: { $eq: ['$$item.teacher_id', userId] },
							},
						},
						student_details: {
							$filter: {
								input: '$student_details',
								as: 'item',
								cond: { $eq: ['$$item.student_id', userId] },
							},
						},
					}
				);
				if (rewardData) {
					element.rewardsData = rewardData.student_details[0];
				}
				responseArray.push(element);
			}
		} else {
			responseArray = responeData;
		}
		res.status(200).json({
			result: responseArray.length,
			data: responseArray,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.getAllUpdatestatus = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			activityModel
				.find({})
				.populate({
					path: 'teacher_id',
					select:
						'name username mobile profile_type school_id branch_id primary_class secondary_class profile_image ',
				})
				.populate(
					{ path: 'comment.student_id', select: 'name profile_image' },
					{ path: 'comment.teacher_id', select: 'name profile_image' }
				),
			req.body
		)
			.sort()
			.limitFields()
			.paginate()
			.filter();
		// .eleFilter()
		const activityData = await features.query;
		const responeData = JSON.parse(JSON.stringify(activityData));
		for (const element of responeData) {
			if (element.assignTo_parent.length) {
				console.log(element._id);
				for (const ele of element.assignTo_parent) {
					if (!ele.status) {
						ele.status = 'Pending';
					}
				}
				const updateExam = await activityModel.findOneAndUpdate(
					{
						_id: element._id,
					},
					element
				);
			}
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.GetTeachersData = async (req, res, next) => {
	try {
		const s = [];
		if (req.body.status == 'pending' || req.body.status == 'Pending') {
			// eslint-disable-next-line no-unused-expressions
			req.body.status.toLowerCase() == 'pending'
				? s.push('Pending', 'pending')
				: s.push('Pending', 'pending');
			req.body.status = s;
		}
		let responeData = [];
		const features = new APIFeatures(
			activityModel.find({}).populate([
				{ path: 'forwarded_teacher_id' },
				{
					path: 'teacher_id',
					populate: { path: 'profile_type', select: 'role_name' },
				},
				{ path: 'comment.student_id', select: 'name profile_image' },
				{ path: 'comment.teacher_id', select: 'name profile_image' },
				{
					path: 'assignTo.student_id',
					select: 'name profile_image section',
					populate: { path: 'section', select: 'name' },
					options: { withDeleted: true },
				},
				{ path: 'assignTo.class_id', select: 'name' },
				{ path: 'assignTo_you.teacher_id', select: 'name profile_image' },
				{ path: 'assignTo_parent.student_id', select: 'name profile_image' },
				{
					path: 'assignTo_parent.parent_id',
					select: 'father_name profile_image',
				},
			]),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		responeData = await features.query;
		if (responeData && responeData.length) {
			responeData = responeData ? JSON.parse(JSON.stringify(responeData)) : [];
			for (const element of responeData) {
				element.rewardsData = {};
				const rewardData = await rewardModel.find({ activity_id: element._id });
				if (rewardData && rewardData.length) {
					const allRewards = [];
					for (const rew of rewardData) {
						allRewards.push(rew.student_details[0]);
					}
					element.allRewards = allRewards;
				}
			}
		}
		res.status(200).json({
			result: responeData.length,
			data: responeData,
		});
	} catch (error) {
		console.log(error);
		res.json({
			status: 400,
			message: error.message,
		});
	}
};
exports.getById = async (req, res, next) => {
	try {
		const user_id = req.body.view_by;
		console.log('req body', req.body);
		let userId;
		if (user_id) userId = mongoose.Types.ObjectId(user_id);
		const activityData = await activityModel
			.findById(req.params.id, userId ? Const.activityProjection(userId) : {})
			.populate([
				{
					path: 'teacher_id',
					select:
						'name username mobile profile_type school_id branch_id primary_class secondary_class profile_image links',
				},
				{ path: 'comment.student_id', select: 'name profile_image' },
				{ path: 'comment.teacher_id', select: 'name profile_image' },
				{
					path: 'assignTo.student_id',
					select: 'name profile_image',
					options: { withDeleted: true },
				},
				{
					path: 'teacher_id',
					select: 'profile_type name profile_image',
					populate: { path: 'profile_type', select: 'role_name' },
				},
				{ path: 'assignTo_you.teacher_id', select: 'name profile_image' },
				{ path: 'assignTo_parent.student_id', select: 'name profile_image' },
				{
					path: 'assignTo_parent.parent_id',
					select: 'father_name profile_image',
				},
			]);
		let responseData = {};
		if (activityData) {
			responseData = JSON.parse(JSON.stringify(activityData));
			if (userId) {
				responseData.rewardsData = {};
				const rewardData = await rewardModel.findOne(
					{
						activity_id: req.params.id,
						'student_details.student_id': userId,
					},
					{
						test_details: 1,
						activity_id: 1,
						teacher_details: {
							$filter: {
								input: '$teacher_details',
								as: 'item',
								cond: { $eq: ['$$item.teacher_id', userId] },
							},
						},
						student_details: {
							$filter: {
								input: '$student_details',
								as: 'item',
								cond: { $eq: ['$$item.student_id', userId] },
							},
						},
					}
				);
				if (rewardData) {
					responseData.rewardsData = rewardData.student_details[0];
				}
			}
		}
		console.log('rrrrrr', responseData);
		res.json({
			status: 200,
			data: responseData,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err.message,
		});
	}
};

/// ///////////////////  started By////////////
exports.Viewed = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'View' ? 1 : -1;
		await activityModel.findByIdAndUpdate(id, {
			$inc: { view: counter },
			$push: { view_by: req.body.view_by },
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// /////////////////////////////////////////////////////// Acknowledge portion ////////////////////
exports.AcknowledgeCreate = async (req, res, next) => {
	console.log('log....................');
	const { sections } = req.body;
	let students = null;
	if (!sections.length) {
		students = req.body.assignTo;
	} else {
		students = await Student.find({
			section: {
				$in: sections,
			},
		}).select('_id school_id section class');
		students = students.map(ele => ({
			student_id: ele._id,
			section_id: ele.section,
			class_id: ele.class,
			school_id: ele.school_id,
		}));
	}

	try {
		console.log('log....................');
		const activity = new activityModel({
			_id: new mongoose.Types.ObjectId(),
			activity_type: req.body.activity_type,
			isOffline: req.body.isOffline || false,
			title: req.body.title,
			image: req.body.image,
			teacher_id: req.body.teacher_id,
			file: req.body.file,
			like: req.body.like,
			publish_date: req.body.publish_date,
			publishedWith: req.body.publishedWith,
			view: req.body.view,
			dueDate: req.body.dueDate,
			EndTime: req.body.EndTime,
			coin: req.body.coin,
			description: req.body.description,
			status: req.body.status,
			assignTo_you: req.body.assignTo_you,
			assignTo_parent: req.body.assignTo_parent,
			assignTo: students,
			acknowledge_by: req.body.acknowledge_by,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});

		const teacherData = await User.findById(req.body.teacher_id);

		const arrOfDeviceToken = [];
		for (const ele of req.body.assignTo_you) {
			const studentData = await User.findById(ele.teacher_id);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo) {
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'announcement.assigned': studentData.announcement.assigned + 1,
					},
				}
			);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo_parent) {
			const parentData = await parent.findById(ele.parent_id);
			await parent.findOneAndUpdate(
				{
					_id: ele.parent_id,
				},
				{
					$set: {
						'announcement.assigned': parentData.announcement.assigned + 1,
					},
				}
			);
			if (parentData && parentData.DeviceToken) {
				arrOfDeviceToken.push(parentData.DeviceToken);
			}
		}

		let image;
		if (!teacherData.profile_image) {
			image = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.activity_type,
				body: req.body.title,
				image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		activity
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
					status: 201,
					data: activity,
				});
			})
			.catch(err => {
				res.json({
					error: err.message,
					status: 411,
				});
			});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
};

/// /////////////////////////////////////////////////////// Acknowledge portion ////////////////////

/// //////////////////// completed by ////////////////
exports.AcknowledgeUpdate = async (req, res, next) => {
	try {
		const { id } = req.params;
		const acknowledge_by = {
			acknowledge_by: req.body.acknowledge_by,
			submitted_date: req.body.submitted_date,
		};
		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo.student_id': req.body.acknowledge_by,
			},
			{
				$set: {
					acknowledge_by,
					'assignTo.$.status': 'Submitted',
				},
			}
		);
		const studentData = await Student.findById(req.body.acknowledge_by);
		await Student.findOneAndUpdate(
			{
				_id: req.body.acknowledge_by,
			},
			{
				$set: {
					'announcement.completed': studentData.announcement.completed + 1,
				},
			}
		);

		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!studentData.profile_image) {
				image = '';
			} else {
				const imageele = studentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} Acknowledged`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		console.log(updateExam);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: 'error',
		});
	}
};
/// ///////////////////////////////////////////////////////////////
/// //////////////////// completed by Parent////////////////
exports.AcknowledgeByParent = async (req, res, next) => {
	try {
		const { id } = req.params;
		const acknowledge_by_parent = {
			acknowledge_by_parent: req.body.acknowledge_by_parent,
			submitted_date: req.body.submitted_date,
		};

		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_parent.parent_id': req.body.acknowledge_by_parent,
			},
			{
				$set: {
					acknowledge_by_parent,
					'assignTo_parent.$.status': 'Submitted',
				},
			}
		);

		const parentData = await parent.findById(req.body.acknowledge_by_parent);
		await parent.findOneAndUpdate(
			{
				_id: req.body.acknowledge_by_parent,
			},
			{
				$set: {
					'announcement.completed': parentData.announcement.completed + 1,
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_parent) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!parentData.profile_image) {
				image = '';
			} else {
				const imageele = parentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} Acknowledged`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// //////////////////// completed by teacher////////////////
exports.AcknowledgeByTeacher = async (req, res, next) => {
	try {
		const { id } = req.params;
		const acknowledge_by_teacher = {
			acknowledge_by_teacher: req.body.acknowledge_by_teacher,
		};

		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_you.teacher_id': req.body.acknowledge_by_teacher,
			},
			{
				$set: {
					acknowledge_by_teacher,
					'assignTo_you.$.status': 'Submitted',
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_you) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}

		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};
/// //////////////////////////////// Assignment ////////////////////////////////////////////////////

exports.AssignmentCreate = async (req, res, next) => {
	try {
		const AssignmentData = await activityModel.create({
			_id: new mongoose.Types.ObjectId(),
			activity_type: req.body.activity_type,
			isOffline: req.body.isOffline || false,
			title: req.body.title,
			image: req.body.image,
			teacher_id: req.body.teacher_id,
			like: req.body.like,
			view: req.body.view,
			publish_date: req.body.publish_date,
			file: req.body.file,
			publishedWith: req.body.publishedWith,
			class_name: req.body.class_name,
			subject: req.body.subject,
			StartTime: req.body.StartTime,
			EndTime: req.body.EndTime,
			learning_Outcome: req.body.learning_Outcome,
			tags: req.body.tags,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			reward: req.body.reward,
			total_score: req.body.total_score,
			description: req.body.description,
			status: req.body.status,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			assignTo_you: req.body.assignTo_you,
			assignTo_parent: req.body.assignTo_parent,
			assignTo: req.body.assignTo,
			submited_by: req.body.submited_by,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});
		const teacherData = await User.findById(req.body.teacher_id);

		const arrOfDeviceToken = [];
		for (const ele of req.body.assignTo) {
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'assignment.assigned': studentData.assignment.assigned + 1,
					},
				}
			);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo_parent) {
			const parentData = await parent.findById(ele.parent_id);
			await parent.findOneAndUpdate(
				{
					_id: ele.parent_id,
				},
				{
					$set: {
						'assignment.assigned': parentData.assignment.assigned + 1,
					},
				}
			);
			if (parentData && parentData.DeviceToken) {
				arrOfDeviceToken.push(parentData.DeviceToken);
			}
		}

		let image;
		if (!teacherData.profile_image) {
			image = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.activity_type,
				body: req.body.title,
				image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		res.status(201).json({
			status: 201,
			message: 'created successfully',
			data: AssignmentData,
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
};

/// ///////////////// Assignment started by //////////
exports.AssignmentStarted = async (req, res, next) => {
	try {
		const Anouncement_id = req.params.id;
		const updateExam = await activityModel.findByIdAndUpdate(Anouncement_id, {
			$push: { assignment_started: req.body.assignment_started },
		});
		console.log(updateExam);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// /////////////////////// Assignment completed
function add(old) {
	const obj = {
		student_id: old[0].student_id,
		message: old[0].message,
		submitted_at: Date.now(),
	};
	return obj;
}
exports.Assignmentcompleted = async (req, res, next) => {
	try {
		let statusMsg;
		const { editFlag } = req.body;
		const studentId = req.body.submited_by[0].student_id;
		const Anouncement_id = req.params.id;

		if (!editFlag) {
			const submitedStatus = await activityModel.find({
				_id: Anouncement_id,
				'assignTo.student_id': req.body.submited_by[0].student_id,
			});
			for (const element of submitedStatus) {
				for (const element1 of element.assignTo) {
					if (element1.student_id == req.body.submited_by[0].student_id) {
						if (element1.status == 'Re-work') {
							statusMsg = 'Re-Submitted';
						} else {
							statusMsg = 'Submitted';
						}
					}
				}
			}
			await activityModel.findOneAndUpdate(
				{
					_id: Anouncement_id,
					'assignTo.student_id': req.body.submited_by[0].student_id,
				},
				{
					$set: {
						'assignTo.$.status': statusMsg,
						'assignTo.$.comment': req.body.comment,
					},
				}
			);
			const updateExam = await activityModel.findOneAndUpdate(
				{
					_id: Anouncement_id,
					'submited_by.student_id': req.body.submited_by[0].student_id,
				},
				{
					$push: { 'submited_by.$.message': req.body.submited_by[0].message },
				}
			);
			if (!updateExam) {
				await activityModel.findOneAndUpdate(
					{
						_id: Anouncement_id,
					},
					{
						$push: { submited_by: req.body.submited_by },
					}
				);
			}
			const studentData = await Student.findById(
				req.body.submited_by[0].student_id
			);
			await Student.findOneAndUpdate(
				{
					_id: req.body.submited_by[0].student_id,
				},
				{
					$set: {
						'assignment.completed': studentData.assignment.completed + 1,
					},
				}
			);

			const activity = await activityModel.find({
				_id: Anouncement_id,
			});
			if (activity) {
				let ispending = false;
				for (const ele of activity[0].assignTo) {
					if (ele.status == 'Pending' || ele.status == 'Re-work') {
						ispending = true;
					}
				}
				if (ispending == false) {
					await activityModel.findOneAndUpdate(
						{
							_id: Anouncement_id,
						},
						{
							$set: {
								status: 'Evaluate',
							},
						}
					);
				}
			}
			if (activity) {
				const arrOfDeviceToken = [];
				const teacherData = await User.findById(activity[0].teacher_id);
				if (teacherData && teacherData.DeviceToken) {
					arrOfDeviceToken.push(teacherData.DeviceToken);
				}
				let image;
				if (!studentData.profile_image) {
					image = '';
				} else {
					const imageele = studentData.profile_image.split('/');
					image = `${process.env.cloudFront100x100}${
						imageele[imageele.length - 1]
					}`;
				}
				const payload = {
					notification: {
						title: `${activity[0].activity_type} Submitted`,
						body: activity[0].title,
						image,
						click_action: 'FLUTTER_NOTIFICATION_CLICK',
						collapse_key: 'grow_on',
						icon: '@drawable/notification_icon',
						channel_id: 'messages',
					},
					data: {
						type: 'activity',
					},
				};
				firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
			}
		} else {
			let activityData = await activityModel.findOne({
				_id: Anouncement_id,
			});
			if (activityData) {
				activityData = JSON.parse(JSON.stringify(activityData));
				if (activityData.submited_by && activityData.submited_by.length) {
					const studentSubmissionData = activityData.submited_by.filter(
						ele => ele.student_id == studentId
					);
					if (studentSubmissionData && studentSubmissionData.length) {
						// eslint-disable-next-line prefer-destructuring
						studentSubmissionData[0].message[
							studentSubmissionData[0].message.length - 1
						] = req.body.submited_by[0].message[0];
						await activityModel.findOneAndUpdate(
							{
								_id: Anouncement_id,
							},
							activityData
						);
					}
				}
			}
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.offlineAssignment = async (req, res, next) => {
	try {
		let statusMsg;
		const Assignment_id = req.params.id;
		for (const ele of req.body.submited_by) {
			const studentId = ele.student_id;

			const submitedStatus = await activityModel.findOne({
				_id: Assignment_id,
				'assignTo.student_id': ele.student_id,
			});

			for (const element1 of submitedStatus.assignTo) {
				if (element1.student_id == ele.student_id) {
					if (element1.status == 'Re-work') {
						statusMsg = 'Re-Submitted';
					} else {
						statusMsg = 'Submitted';
					}
				}
			}

			await activityModel.findOneAndUpdate(
				{
					_id: Assignment_id,
					'assignTo.student_id': ele.student_id,
				},
				{
					$set: {
						'assignTo.$.status': statusMsg,
						'assignTo.$.comment': req.body.comment,
					},
				}
			);
			const updateExam = await activityModel.findOneAndUpdate(
				{
					_id: Assignment_id,
					'submited_by.student_id': ele.student_id,
				},
				{
					$push: { 'submited_by.$.message': ele.message },
				}
			);
			if (!updateExam) {
				await activityModel.findOneAndUpdate(
					{
						_id: Assignment_id,
					},
					{
						$push: { submited_by: req.body.submited_by },
					}
				);
			}
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'assignment.completed': studentData.assignment.completed + 1,
					},
				}
			);
		}
		const activity = await activityModel.find({
			_id: Assignment_id,
		});
		if (activity) {
			let ispending = false;
			for (const ele of activity[0].assignTo) {
				if (ele.status == 'Pending' || ele.status == 'Re-work') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: Assignment_id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		// if (activity) {
		// 	const arrOfDeviceToken = [];
		// 	const teacherData = await User.findById(activity[0].teacher_id);
		// 	if (teacherData && teacherData.DeviceToken) {
		// 		arrOfDeviceToken.push(teacherData.DeviceToken);
		// 	}
		// 	let image;
		// 	if (!studentData.profile_image) {
		// 		image = '';
		// 	} else {
		// 		const imageele = studentData.profile_image.split('/');
		// 		image = `${process.env.cloudFront100x100}${
		// 			imageele[imageele.length - 1]
		// 		}`;
		// 	}
		// 	const payload = {
		// 		notification: {
		// 			title: `${activity[0].activity_type} Submitted`,
		// 			body: activity[0].title,
		// 			image,
		// 			click_action: 'FLUTTER_NOTIFICATION_CLICK',
		// 			collapse_key: 'grow_on',
		// 			icon: '@drawable/notification_icon',
		// 			channel_id: 'messages',
		// 		},
		// 		data: {
		// 			type: 'activity',
		// 		},
		// 	};
		// 	firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		// }

		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
};

/// /////////////////////////////////////////// Event /////////////////////////////////////////

exports.EventCreate = async (req, res, next) => {
	try {
		const activity = new activityModel({
			_id: new mongoose.Types.ObjectId(),
			activity_type: req.body.activity_type,
			isOffline: req.body.isOffline || false,
			title: req.body.title,
			image: req.body.image,
			teacher_id: req.body.teacher_id,
			like: req.body.like,
			view: req.body.view,
			description: req.body.description,
			status: req.body.status,
			file: req.body.file,
			publish_date: req.body.publish_date,
			EndTime: req.body.EndTime,
			publishedWith: req.body.publishedWith,
			assignTo_you: req.body.assignTo_you,
			assignTo_parent: req.body.assignTo_parent,
			assignTo: req.body.assignTo,
			locations: req.body.locations,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});
		const teacherData = await User.findById(req.body.teacher_id);

		const arrOfDeviceToken = [];
		for (const ele of req.body.assignTo_you) {
			const studentData = await User.findById(ele.teacher_id);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}
		for (const ele of req.body.assignTo) {
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'event.assigned': studentData.event.assigned + 1,
					},
				}
			);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo_parent) {
			const parentData = await parent.findById(ele.parent_id);
			await parent.findOneAndUpdate(
				{
					_id: ele.parent_id,
				},
				{
					$set: {
						'event.assigned': parentData.event.assigned + 1,
					},
				}
			);
			if (parentData && parentData.DeviceToken) {
				arrOfDeviceToken.push(parentData.DeviceToken);
			}
		}

		let image;
		if (!teacherData.profile_image) {
			image = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.activity_type,
				body: req.body.title,
				image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		activity
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
					status: 201,
				});
			})
			.catch(err => {
				res.json({
					error: err,
					status: 411,
				});
			});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};

exports.EventGoingUpdate = async (req, res, next) => {
	try {
		const { id } = req.params;
		await activityModel.findByIdAndUpdate(id, {
			$pull: { not_going: req.body.student_id[0] },
		});
		const activity1 = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo.student_id': req.body.student_id,
			},
			{
				$push: { going: req.body.student_id },
				$set: {
					'assignTo.$.status': 'Going',
				},
			}
		);
		const studentData = await Student.findById(req.body.student_id);
		await Student.findOneAndUpdate(
			{
				_id: req.body.student_id,
			},
			{
				$set: {
					'event.completed': studentData.event.completed + 1,
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});

		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!studentData.profile_image) {
				image = '';
			} else {
				const imageele = studentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} OnGoing`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.EventNotGoingUpdate = async (req, res, next) => {
	try {
		const activityId = req.params.id;
		await activityModel.updateOne(
			{ _id: activityId },
			{
				$pull: { going: req.body.student_id[0] },
			}
		);
		const activity1 = await activityModel.findOneAndUpdate(
			{
				_id: activityId,
				'assignTo.student_id': req.body.student_id,
			},
			{
				$pull: { going: req.body.student_id[0] },
				$push: { not_going: req.body.student_id },
				$set: {
					'assignTo.$.status': 'Not-Going',
				},
			}
		);

		const studentData = await Student.findById(req.body.student_id);
		await Student.findOneAndUpdate(
			{
				_id: req.body.student_id,
			},
			{
				$set: {
					'event.completed': studentData.event.completed + 1,
				},
			}
		);
		const activity = await activityModel.find({
			_id: activityId,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: activityId,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!studentData.profile_image) {
				image = '';
			} else {
				const imageele = studentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} NotGoing`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};
/// ////////////////////////////// event by Parent ///////////////////////////
exports.EventGoingUpdateByParent = async (req, res, next) => {
	try {
		const { id } = req.params;
		await activityModel.findByIdAndUpdate(id, {
			$pull: { not_going_by_parent: req.body.parent_id[0] },
		});
		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_parent.parent_id': req.body.parent_id,
			},
			{
				$push: { going_by_parent: req.body.parent_id },
				$set: {
					'assignTo_parent.$.status': 'Going',
				},
			}
		);

		const parentData = await parent.findById(req.body.parent_id);
		await parent.findOneAndUpdate(
			{
				_id: req.body.parent_id,
			},
			{
				$set: {
					'event.completed': parentData.event.completed + 1,
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_parent) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!parentData.profile_image) {
				image = '';
			} else {
				const imageele = parentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} OnGoing`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.EventNotGoingUpdateByParent = async (req, res, next) => {
	try {
		const { id } = req.params;
		await activityModel.findByIdAndUpdate(id, {
			$pull: { going_by_parent: req.body.parent_id[0] },
		});
		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_parent.parent_id': req.body.parent_id,
			},
			{
				$push: { not_going_by_parent: req.body.parent_id },
				$set: {
					'assignTo_parent.$.status': 'Not-Going',
				},
			}
		);

		const parentData = await parent.findById(req.body.parent_id);
		await parent.findOneAndUpdate(
			{
				_id: req.body.parent_id,
			},
			{
				$set: {
					'event.completed': parentData.event.completed + 1,
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_parent) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		if (activity) {
			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!parentData.profile_image) {
				image = '';
			} else {
				const imageele = parentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: `${activity[0].activity_type} NotGoing`,
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// //////////// event by teacher //////////////////////
exports.EventUpdateByTeacher = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_you.teacher_id': req.body.teacher,
			},
			{
				$push: { going_by_teacher: req.body.teacher },
				$set: {
					'assignTo_you.$.status': 'Going',
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_you) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}

		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.EventNotGoingUpdateByteacher = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await activityModel.findOneAndUpdate(
			{
				_id: id,
				'assignTo_you.teacher_id': req.body.teacher,
			},
			{
				$push: { not_going_by_teacher: req.body.teacher },
				$set: {
					'assignTo_you.$.status': 'Not going',
				},
			}
		);
		const activity = await activityModel.find({
			_id: id,
		});
		if (activity && activity.length) {
			let ispending = false;
			for (const ele of activity[0].assignTo_you) {
				if (ele.status == 'Pending') {
					ispending = true;
				}
			}
			if (ispending == false) {
				await activityModel.findOneAndUpdate(
					{
						_id: id,
					},
					{
						$set: {
							status: 'Evaluate',
						},
					}
				);
			}
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// ///////////////////// live pool //////////////////////

exports.createLivepool = async (req, res, next) => {
	try {
		const livePool = await activityModel.create({
			_id: new mongoose.Types.ObjectId(),
			activity_type: req.body.activity_type,
			title: req.body.title,
			image: req.body.image,
			like: req.body.like,
			teacher_id: req.body.teacher_id,
			view: req.body.view,
			file: req.body.file,
			publish_date: req.body.publish_date,
			description: req.body.description,
			status: req.body.status,
			EndTime: req.body.EndTime,
			publishedWith: req.body.publishedWith,
			assignTo: req.body.assignTo,
			assignTo_you: req.body.assignTo_you,
			assignTo_parent: req.body.assignTo_parent,
			options: req.body.options,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});
		const teacherData = await User.findById(req.body.teacher_id);

		const arrOfDeviceToken = [];
		for (const ele of req.body.assignTo_you) {
			const studentData = await User.findById(ele.teacher_id);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}
		for (const ele of req.body.assignTo) {
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'livepoll.assigned': studentData.livepoll.assigned + 1,
					},
				}
			);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo_parent) {
			const parentData = await parent.findById(ele.parent_id);
			await parent.findOneAndUpdate(
				{
					_id: ele.parent_id,
				},
				{
					$set: {
						'livepoll.assigned': parentData.livepoll.assigned + 1,
					},
				}
			);
			if (parentData && parentData.DeviceToken) {
				arrOfDeviceToken.push(parentData.DeviceToken);
			}
		}

		let image;
		if (!teacherData.profile_image) {
			image = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.activity_type,
				body: req.body.title,
				image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		res.status(201).json({
			status: 201,
			data: 'created successfully',
		});
	} catch (err) {
		console.log('error in live pool', err);
		res.status(401).json({
			status: 401,
			data: err.message,
		});
	}
};

/// ///////////Update livePool //////////////
exports.UpdatelivePool = async (req, res, next) => {
	try {
		const { id } = req.params;
		const selectedByStudent = req.body.selected_options[0].selected_by;
		const activityList = await activityModel.findById(req.params.id);
		const studnt_id_list = activityList.selected_livepool;
		const selectedByParent = req.body.selected_options[0].selected_by_parent;
		const selectedByTeacher = req.body.selected_options[0].selected_by_teacher;

		if (selectedByStudent) {
			const obj = studnt_id_list.find(d => d.selected_by == selectedByStudent);
			if (obj == undefined) {
				console.log('----');
				const activity1 = await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo.student_id': selectedByStudent,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo.$.status': 'Submitted',
						},
					}
				);

				const studentData = await Student.findById(selectedByStudent);
				await Student.findOneAndUpdate(
					{
						_id: selectedByStudent,
					},
					{
						$set: {
							'livepoll.completed': studentData.event.completed + 1,
						},
					}
				);
				const activity = await activityModel.find({
					_id: id,
				});
				if (activity && activity.length) {
					let ispending = false;
					for (const ele of activity[0].assignTo) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}
				if (activity) {
					const arrOfDeviceToken = [];
					const teacherData = await User.findById(activity[0].teacher_id);
					if (teacherData && teacherData.DeviceToken) {
						arrOfDeviceToken.push(teacherData.DeviceToken);
					}
					let image;
					if (!studentData.profile_image) {
						image = '';
					} else {
						const imageele = studentData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: `${activity[0].activity_type} Submitted`,
							body: activity[0].title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'activity',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}
				res.status(200).json({
					status: 'success',
				});
			} else {
				console.log('----------', obj.selected_by);
				await activityModel.findOneAndUpdate(
					{
						selected_livepool: {
							$elemMatch: { selected_by: selectedByStudent },
						},
					},
					{
						$pull: { selected_livepool: { selected_by: obj.selected_by } },
					}
				);
				const activity1 = await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo.student_id': selectedByStudent,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo.$.status': 'Submitted',
						},
					}
				);
				const studentData = await Student.findById(selectedByStudent);
				await Student.findOneAndUpdate(
					{
						_id: selectedByStudent,
					},
					{
						$set: {
							'livepoll.completed': studentData.event.completed + 1,
						},
					}
				);

				const activity = await activityModel.find({
					_id: id,
				});
				if (activity) {
					let ispending = false;
					for (const ele of activity[0].assignTo) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}
				if (activity) {
					const arrOfDeviceToken = [];
					const teacherData = await User.findById(activity[0].teacher_id);
					if (teacherData && teacherData.DeviceToken) {
						arrOfDeviceToken.push(teacherData.DeviceToken);
					}
					let image;
					if (!studentData.profile_image) {
						image = '';
					} else {
						const imageele = studentData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: `${activity[0].activity_type} Submitted`,
							body: activity[0].title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'activity',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}

				res.status(200).json({
					status: 'updated successfully',
				});
			}
		} else if (selectedByTeacher) {
			const obj = studnt_id_list.find(
				d => d.selected_by_teacher == selectedByTeacher
			);
			if (obj == undefined) {
				console.log('----');
				await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo_you.teacher_id': selectedByTeacher,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo_you.$.status': 'Submitted',
						},
					}
				);
				const activity = await activityModel.find({
					_id: id,
				});
				if (activity) {
					let ispending = false;
					for (const ele of activity[0].assignTo_you) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}

				res.status(200).json({
					status: 'success',
				});
			} else {
				console.log('----------', obj.selected_by_teacher);
				await activityModel.findOneAndUpdate(
					{
						selected_livepool: {
							$elemMatch: { selected_by_teacher: selectedByTeacher },
						},
					},
					{
						$pull: {
							selected_livepool: { selected_by_teacher: selectedByTeacher },
						},
					}
				);
				await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo_you.teacher_id': selectedByTeacher,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo_you.$.status': 'Submitted',
						},
					}
				);
				const activity = await activityModel.find({
					_id: id,
				});
				if (activity) {
					let ispending = false;
					for (const ele of activity[0].assignTo_you) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}

				res.status(200).json({
					status: 'updated successfully',
				});
			}
		} else {
			const obj = studnt_id_list.find(
				d => d.selected_by_parent == selectedByParent
			);
			if (obj == undefined) {
				console.log('----');
				const activity1 = await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo_parent.parent_id': selectedByParent,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo_parent.$.status': 'Submitted',
						},
					}
				);
				const parentData = await parent.findById(selectedByParent);
				await parent.findOneAndUpdate(
					{
						_id: selectedByParent,
					},
					{
						$set: {
							'livepoll.completed': parentData.event.completed + 1,
						},
					}
				);

				const activity = await activityModel.find({
					_id: id,
				});
				if (activity) {
					let ispending = false;
					for (const ele of activity[0].assignTo_parent) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}
				if (activity) {
					const arrOfDeviceToken = [];
					const teacherData = await User.findById(activity[0].teacher_id);
					if (teacherData && teacherData.DeviceToken) {
						arrOfDeviceToken.push(teacherData.DeviceToken);
					}
					let image;
					if (!parentData.profile_image) {
						image = '';
					} else {
						const imageele = parentData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: `${activity[0].activity_type} Submitted`,
							body: activity[0].title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'activity',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}
				res.status(200).json({
					status: 'success',
				});
			} else {
				console.log('----------', obj.selected_by);
				await activityModel.findOneAndUpdate(
					{
						selected_livepool: {
							$elemMatch: { selected_by_parent: selectedByParent },
						},
					},
					{
						$pull: {
							selected_livepool: { selected_by_parent: selectedByParent },
						},
					}
				);
				const activity1 = await activityModel.findOneAndUpdate(
					{
						_id: id,
						'assignTo_parent.parent_id': selectedByParent,
					},
					{
						$push: { selected_livepool: req.body.selected_options },
						$set: {
							'assignTo_parent.$.status': 'Submitted',
						},
					}
				);
				const parentData = await parent.findById(selectedByParent);
				await parent.findOneAndUpdate(
					{
						_id: selectedByParent,
					},
					{
						$set: {
							'livepoll.completed': parentData.event.completed + 1,
						},
					}
				);
				const activity = await activityModel.find({
					_id: id,
				});
				if (activity) {
					let ispending = false;
					for (const ele of activity[0].assignTo_parent) {
						if (ele.status == 'Pending') {
							ispending = true;
						}
					}
					if (ispending == false) {
						await activityModel.findOneAndUpdate(
							{
								_id: id,
							},
							{
								$set: {
									status: 'Evaluate',
								},
							}
						);
					}
				}
				if (activity) {
					const arrOfDeviceToken = [];
					const teacherData = await User.findById(activity[0].teacher_id);
					if (teacherData && teacherData.DeviceToken) {
						arrOfDeviceToken.push(teacherData.DeviceToken);
					}
					let image;
					if (!parentData.profile_image) {
						image = '';
					} else {
						const imageele = parentData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: `${activity[0].activity_type} Submitted`,
							body: activity[0].title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'activity',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}

				res.status(200).json({
					status: 'updated successfully',
				});
			}
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: 'error',
		});
	}
};

/// ///////////////////// Check List //////////////////////

exports.createCheckList = async (req, res, next) => {
	try {
		console.log('checklist');
		const checklist = await activityModel.create({
			_id: new mongoose.Types.ObjectId(),
			activity_type: req.body.activity_type,
			title: req.body.title,
			image: req.body.image,
			like: req.body.like,
			publish_date: req.body.publish_date,
			view: req.body.view,
			teacher_id: req.body.teacher_id,
			file: req.body.file,
			publishedWith: req.body.publishedWith,
			description: req.body.description,
			status: req.body.status,
			assignTo: req.body.assignTo,
			assignTo_you: req.body.assignTo_you,
			assignTo_parent: req.body.assignTo_parent,
			options: req.body.options,
			EndTime: req.body.EndTime,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});

		const teacherData = await User.findById(req.body.teacher_id);

		const arrOfDeviceToken = [];
		for (const ele of req.body.assignTo_you) {
			const studentData = await User.findById(ele.teacher_id);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}
		for (const ele of req.body.assignTo) {
			const studentData = await Student.findById(ele.student_id);
			await Student.findOneAndUpdate(
				{
					_id: ele.student_id,
				},
				{
					$set: {
						'checklist.assigned': studentData.checklist.assigned + 1,
					},
				}
			);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
		}

		for (const ele of req.body.assignTo_parent) {
			const parentData = await parent.findById(ele.parent_id);
			await parent.findOneAndUpdate(
				{
					_id: ele.parent_id,
				},
				{
					$set: {
						'checklist.assigned': parentData.checklist.assigned + 1,
					},
				}
			);
			if (parentData && parentData.DeviceToken) {
				arrOfDeviceToken.push(parentData.DeviceToken);
			}
		}
		let image;
		if (!teacherData.profile_image) {
			image = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.activity_type,
				body: req.body.title,
				image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		res.status(201).json({
			status: 201,
			data: 'created successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};

/// ///////////Update Checklist //////////////
exports.UpdateCheckListStatus = async (req, res, next) => {
	try {
		const { id } = req.params;
		const selectedByStudent = req.body.selected_options[0].selected_by;
		const activityList = await activityModel.findById(req.params.id);
		const selectedByParent = req.body.selected_options[0].selected_by_parent;
		const selectedByTeacher = req.body.selected_options[0].selected_by_teacher;
		let checkListStatus = req.body.checklist_status;
		checkListStatus = checkListStatus || 'Submitted';
		if (selectedByStudent) {
			await activityModel.findByIdAndUpdate(id, {
				$pull: { selected_checkList: { selected_by: selectedByStudent } },
			});
			await activityModel.findOneAndUpdate(
				{
					_id: id,
					'assignTo.student_id': selectedByStudent,
				},
				{
					$push: { selected_checkList: req.body.selected_options },
					$set: {
						'assignTo.$.status': checkListStatus,
					},
				}
			);
			const studentData = await Student.findById(selectedByStudent);

			if (checkListStatus == 'Submitted') {
				await Student.findOneAndUpdate(
					{
						_id: selectedByStudent,
					},
					{
						$set: {
							'checklist.completed': studentData.checklist.completed + 1,
						},
					}
				);

				const activity = await activityModel.find({
					_id: id,
					$or: [
						{ 'assignTo.status': 'Pending' },
						{ 'assignTo.status': 'Partially Pending' },
					],
				});
				if (!activity.length) {
					await activityModel.findByIdAndUpdate(id, {
						$set: {
							status: 'Evaluate',
						},
					});
				}
			}

			const arrOfDeviceToken = [];
			const teacherData = await User.findById(activityList.teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!studentData.profile_image) {
				image = '';
			} else {
				const imageele = studentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					// eslint-disable-next-line no-undef
					title: `${activity[0].activity_type} Submitted`,
					// eslint-disable-next-line no-undef
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		} else if (selectedByTeacher) {
			await activityModel.findByIdAndUpdate(id, {
				$pull: {
					selected_checkList: { selected_by_teacher: selectedByTeacher },
				},
			});
			await activityModel.findOneAndUpdate(
				{
					_id: id,
					'assignTo_you.teacher_id': selectedByTeacher,
				},
				{
					$push: { selected_checkList: req.body.selected_options },
					$set: {
						'assignTo_you.$.status': checkListStatus,
					},
				}
			);

			const activity = await activityModel.find({
				_id: id,
				$or: [
					{ 'assignTo_you.status': 'Pending' },
					{ 'assignTo_you.status': 'Partially Pending' },
				],
			});
			if (!activity.length) {
				await activityModel.findByIdAndUpdate(id, {
					$set: {
						status: 'Evaluate',
					},
				});
			}
		} else {
			await activityModel.findByIdAndUpdate(id, {
				$pull: { selected_checkList: { selected_by_parent: selectedByParent } },
			});
			await activityModel.findOneAndUpdate(
				{
					_id: id,
					'assignTo_parent.parent_id': selectedByParent,
				},
				{
					$push: { selected_checkList: req.body.selected_options },
					$set: {
						'assignTo_parent.$.status': checkListStatus,
					},
				}
			);

			const parentData = await parent.findById(selectedByParent);
			if (checkListStatus == 'Submitted') {
				await parent.findOneAndUpdate(
					{
						_id: selectedByParent,
					},
					{
						$set: {
							'checklist.completed': parentData.checklist.completed + 1,
						},
					}
				);
				const activity = await activityModel.find({
					_id: id,
					$or: [
						{ 'assignTo_parent.status': 'Pending' },
						{ 'assignTo_parent.status': 'Partially Pending' },
					],
				});
				if (!activity.length) {
					await activityModel.findByIdAndUpdate(id, {
						$set: {
							status: 'Evaluate',
						},
					});
				}
			}
			const arrOfDeviceToken = [];
			// eslint-disable-next-line no-undef
			const teacherData = await User.findById(activity[0].teacher_id);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
			let image;
			if (!parentData.profile_image) {
				image = '';
			} else {
				const imageele = parentData.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					// eslint-disable-next-line no-undef
					title: `${activity[0].activity_type} Submitted`,
					// eslint-disable-next-line no-undef
					body: activity[0].title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'activity',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: err.message,
		});
	}
};

/// ////////////// Activity Comment /////////////////////
exports.ActivityComment = async (req, res, next) => {
	try {
		const { id } = req.params;
		const doubtStatus = req.body.comment[0].doubt_status;

		await activityModel.findByIdAndUpdate(id, {
			$push: { comment: req.body.comment },
		});
		// if status is cleared update all the status with cleared
		if (doubtStatus == 'cleared') {
			await activityModel.updateOne(
				{
					$and: [
						{
							_id: id,
						},
						{
							'comment.student_id': mongoose.Types.ObjectId(
								req.body.comment[0].student_id
							),
						},
					],
				},
				{
					$set: {
						'comment.$[elem].doubt_status': doubtStatus,
					},
				},
				{
					multi: true,
					arrayFilters: [
						{
							'elem.student_id': mongoose.Types.ObjectId(
								req.body.comment[0].student_id
							),
						},
					],
				}
			);
		}

		const boardData1 = await activityModel.findOneAndUpdate(
			{ $and: [{ 'comment.doubt_status': 'uncleared' }, { _id: id }] },
			{
				$set: {
					activity_status: 'uncleared',
				},
			}
		);
		if (!boardData1) {
			await activityModel.findOneAndUpdate(
				{ _id: id },
				{
					$set: {
						activity_status: 'cleared',
					},
				}
			);
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: 'error',
			err,
		});
	}
};

/// ////////////// Activity Comment /////////////////////
exports.setActivityStatus = async (req, res, next) => {
	try {
		const allActivity = await activityModel.find();
		for (const activity of allActivity) {
			const id = activity._id;
			const boardData1 = await activityModel.findOneAndUpdate(
				{ $and: [{ 'comment.doubt_status': 'uncleared' }, { _id: id }] },
				{
					$set: {
						activity_status: 'uncleared',
					},
				}
			);
			if (!boardData1) {
				await activityModel.findOneAndUpdate(
					{ _id: id },
					{
						$set: {
							activity_status: 'cleared',
						},
					}
				);
			}
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: 'error',
			err,
		});
	}
};

/// /////////////////////////////like///////////////
exports.Like = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		if (req.body.action == 'Like') {
			const counter = action === 'Like' ? 1 : 1;
			await activityModel.findByIdAndUpdate(id, {
				$inc: { like: counter },
				$push: { like_by: req.body.like_by },
			});
			res.status(200).json({
				status: 'successfully liked',
			});
		} else {
			const counter = action === 'DisLike' ? -1 : -1;
			await activityModel.findByIdAndUpdate(id, {
				$inc: { like: counter },
				$pull: { like_by: req.body.like_by },
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};
/// ///////////////////////////// dis like///////////////
exports.Dislike = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'Dislike' ? -1 : -1;
		await activityModel.findByIdAndUpdate(id, {
			$inc: { like: counter },
			$pull: { like_by: req.body.like_by },
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// /////////////////////////////View///////////////
exports.View = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'Like' ? 1 : -1;
		console.log('.....', counter);
		await activityModel.findByIdAndUpdate(id, {
			$inc: { view: counter },
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.reassign = async (req, res, next) => {
	try {
		const { id } = req.body;
		const studentId = req.body.student_id;
		const activityId = req.body.activity_id;
		await activityModel.findOneAndUpdate(
			{
				_id: activityId,
				'assignTo.student_id': studentId,
			},
			{
				$set: {
					'assignTo.$.status': 'Re-work',
					'assignTo.$.comment': req.body.text,
					status: 'pending',
				},
			}
		);

		const studentData = await Student.findById(studentId);
		await Student.findOneAndUpdate(
			{
				_id: studentId,
			},
			{
				$set: {
					'assignment.completed': studentData.assignment.completed - 1,
				},
			}
		);

		const activity = await activityModel
			.findOneAndUpdate(
				{
					_id: activityId,
					'submited_by.student_id': studentId,
				},
				{
					$push: {
						'submited_by.$.message': {
							submitted_date: req.body.submitted_date,
							file: req.body.file,
							text: req.body.text,
							evaluator: true,
						},
					},
				},
				{ new: true }
			)
			.populate('teacher_id', 'profile_image');
		const arrOfDeviceToken = [];
		const studentData11 = await Student.findById(studentId);
		if (studentData && studentData.DeviceToken) {
			arrOfDeviceToken.push(studentData11.DeviceToken);
		}
		const payload = {
			notification: {
				title: `Reassigned ${activity.activity_type}`,
				body: activity.title,
				image: activity.teacher_id.profile_image
					? activity.teacher_id.profile_image
					: '',
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'activity',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		res.status(200).json({
			status: 'Re work Assigned successfully',
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.submitTeacherEvaluated = async (req, res, next) => {
	try {
		const studentId = req.body.student_id;
		const activityId = req.body.activity_id;

		await activityModel.findOneAndUpdate(
			{
				_id: activityId,
				'submited_by.student_id': studentId,
			},
			{
				$push: {
					'submited_by.$.message': {
						file: req.body.file,
						text: req.body.text,
						evaluator: true,
					},
				},
			},
			{ new: true }
		);

		res.status(200).json({
			status: 'Added successfully',
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
};
exports.Activityforwaded = async (req, res, next) => {
	try {
		const { id } = req.params;
		const assignTo_you = await activityModel.findByIdAndUpdate(id, {
			teacher_id: req.body.assignTo_you[0].teacher_id,
			forward: 'true',
			forwarded_teacher_id: req.body.forwarded_teacher_id,
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.ActivityArchive = async (req, res, next) => {
	try {
		const { id } = req.params;
		const assignTo_you = await activityModel.findByIdAndDelete(id);
		res.status(200).json({
			status: 'success deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.AssignmentUpdate = async (req, res, next) => {
	try {
		const assignmentId = req.params.id;
		const AssignmentData = await activityModel.findByIdAndUpdate(
			assignmentId,
			req.body
		);

		res.status(201).json({
			status: 201,
			data: AssignmentData,
			message: 'Assignment updated successfully',
		});
	} catch (err) {
		console.log('error', err);
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
};

exports.updateAcknowledge = async (req, res, next) => {
	const activityId = req.params.id;
	try {
		const updateAcknowledgeData = await activityModel.findByIdAndUpdate(
			activityId,
			{
				title: req.body.title,
				image: req.body.image,
				file: req.body.file,
				like: req.body.like,
				publish_date: req.body.publish_date,
				publishedWith: req.body.publishedWith,
				view: req.body.view,
				dueDate: req.body.dueDate,
				EndTime: req.body.EndTime,
				coin: req.body.coin,
				description: req.body.description,
				status: req.body.status,
				acknowledge_by: req.body.acknowledge_by,
				repository: req.body.repository,
				created_by: req.body.createdBy,
				updated_by: req.body.updatedBy,
				links: req.body.links,
			}
		);

		res.status(201).json({
			message: 'Announcement updated successfully',
			status: 201,
			data: updateAcknowledgeData,
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};

exports.updateLivepoolData = async (req, res, next) => {
	try {
		const activityId = req.params.id;
		const livePoolUpdateData = await activityModel.findByIdAndUpdate(
			activityId,
			{
				title: req.body.title,
				image: req.body.image,
				like: req.body.like,
				view: req.body.view,
				file: req.body.file,
				publish_date: req.body.publish_date,
				description: req.body.description,
				status: req.body.status,
				EndTime: req.body.EndTime,
				publishedWith: req.body.publishedWith,
				options: req.body.options,
				startDate: req.body.startDate,
				EndDate: req.body.EndDate,
				dueDate: req.body.dueDate,
				coin: req.body.coin,
				repository: req.body.repository,
				created_by: req.body.createdBy,
				updated_by: req.body.updatedBy,
				links: req.body.links,
			}
		);
		res.status(201).json({
			status: 201,
			message: 'live Pool updated successfully',
			data: livePoolUpdateData,
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
};

exports.updateEvent = async (req, res, next) => {
	try {
		const activityId = req.params.id;
		const updateEventData = await activityModel.findByIdAndUpdate(activityId, {
			title: req.body.title,
			image: req.body.image,
			like: req.body.like,
			view: req.body.view,
			description: req.body.description,
			status: req.body.status,
			file: req.body.file,
			publish_date: req.body.publish_date,
			EndTime: req.body.EndTime,
			publishedWith: req.body.publishedWith,
			locations: req.body.locations,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});

		res.status(201).json({
			status: 201,
			message: 'Event updated successfully',
			data: updateEventData,
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
};

exports.updateCheckList = async (req, res, next) => {
	try {
		const activityId = req.params.id;
		const updateChecklist = await activityModel.findByIdAndUpdate(activityId, {
			title: req.body.title,
			image: req.body.image,
			like: req.body.like,
			publish_date: req.body.publish_date,
			view: req.body.view,
			file: req.body.file,
			publishedWith: req.body.publishedWith,
			description: req.body.description,
			status: req.body.status,
			options: req.body.options,
			EndTime: req.body.EndTime,
			startDate: req.body.startDate,
			EndDate: req.body.EndDate,
			dueDate: req.body.dueDate,
			coin: req.body.coin,
			repository: req.body.repository,
			created_by: req.body.createdBy,
			updated_by: req.body.updatedBy,
			links: req.body.links,
		});

		res.status(201).json({
			status: 201,
			data: updateChecklist,
			message: 'Checklist updated successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};

exports.teacherDataActivityStatus = catchAsync(async (req, res, next) => {
	const teacherData = await activityModel.aggregate([
		{
			$match: {
				teacher_id: mongoose.Types.ObjectId(req.params.id),
			},
		},
		{
			$group: {
				_id: null,
				evaluate_count: {
					$sum: {
						$cond: {
							if: {
								$eq: ['$status', 'Evaluate'],
							},
							then: 1,
							else: 0,
						},
					},
				},
				evaluated_count: {
					$sum: {
						$cond: {
							if: {
								$ne: ['$status', 'Evaluated'],
							},
							then: 1,
							else: 0,
						},
					},
				},
				pending_count: {
					$sum: {
						$cond: {
							if: {
								$eq: ['$status', 'Pending'],
							},
							then: 1,
							else: 0,
						},
					},
				},
			},
		},
	]);
	delete teacherData[0]._id;
	res
		.status(200)
		.json(SuccessResponse(teacherData[0], 1, 'fetched successfully'));
});
