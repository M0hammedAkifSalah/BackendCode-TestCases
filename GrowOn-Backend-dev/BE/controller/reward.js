const mongoose = require('mongoose');
const split = require('split-object');
const rewardModel = require('../model/reward');
const APIFeatures = require('../utils/apiFeatures');
const activityModel = require('../model/activity');
const Student = require('../model/student');
const User = require('../model/user');
const parent = require('../model/parent');
const firebaseNoti = require('../firebase');

exports.GetAllWithRank = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			rewardModel
				.find({})
				.populate({ path: 'student_id', select: 'name profile_image' }),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		let studentData = {};
		const reward = await features.query;
		for (const element2 of reward) {
			// eslint-disable-next-line no-loop-func
			element2.student_details.forEach(element1 => {
				let coin = studentData[element1.student_id]
					? studentData[element1.student_id]
					: 0;
				coin = element1.coin + element1.extra_coin + coin;
				studentData[element1.student_id] = coin;
			});
		}
		let obj = [];
		studentData = split(studentData).map(studentCoin => {
			obj = {
				student_id: studentCoin.key,
				total_coin: studentCoin.value,
			};
			return obj;
		});
		studentData.sort((a, b) =>
			// eslint-disable-next-line no-nested-ternary
			a.total_coin < b.total_coin ? 1 : b.total_coin < a.total_coin ? -1 : 0
		);

		const count = 1;
		studentData.forEach(element => {
			element.rank = count + 1;
		});
		if (!studentData[0]) {
			studentData[0] = {
				student_id: req.body['student_details.student_id'],
				total_coin: 0,
				rank: 0,
			};
		}

		res.status(200).json({
			status: 200,
			data: studentData,
		});
	} catch (err) {
		console.log('err', err);
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.GetAll = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			rewardModel
				.find({})
				.populate({ path: 'student_id', select: 'name profile_image' }),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const reward = await features.query;

		res.status(200).json({
			status: 200,
			data: reward,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.CreateReward = async (req, res, next) => {
	try {
		const id = req.body.activity_id;

		const activityId = await activityModel.findByIdAndUpdate(id, {
			status: 'Evaluated',
		});
		if (req.body.student_details && req.body.student_details.length) {
			for (const element of req.body.student_details) {
				if (element.status) {
					for (const ele of activityId.assignTo) {
						if (ele.student_id == element.student_id) {
							const arrOfDeviceToken = [];
							const studentData11 = await Student.findById(ele.student_id);
							const activity = await activityModel.findById(id);
							if (studentData11 && studentData11.DeviceToken) {
								arrOfDeviceToken.push(studentData11.DeviceToken);
							}
							const payload = {
								notification: {
									title: `Evaluated ${activity.activity_type}`,
									body: activity.title,
									image: '',
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

							const aa = await activityModel.findOneAndUpdate(
								{ _id: id, 'assignTo.student_id': ele.student_id },
								{
									$set: {
										'assignTo.$.status': 'Evaluated',
									},
								}
							);
							break;
						}
					}
				}
			}
		}
		if (req.body.parent_details && req.body.parent_details.length) {
			for (const element of req.body.parent_details) {
				if (element.status) {
					for (const ele of activityId.assignTo_parent) {
						if (ele.parent_id == element.parent_id) {
							const arrOfDeviceToken = [];
							const studentData11 = await parent.findById(ele.parent_id);
							const activity = await activityModel.findById(id);
							if (studentData11 && studentData11.DeviceToken) {
								arrOfDeviceToken.push(studentData11.DeviceToken);
							}
							const payload = {
								notification: {
									title: `Evaluated ${activity.activity_type}`,
									body: activity.title,
									image: '',
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

							const aa = await activityModel.findOneAndUpdate(
								{ _id: id, 'assignTo_parent.parent_id': ele.parent_id },
								{
									$set: {
										'assignTo_parent.$.status': 'Evaluated',
									},
								}
							);
							break;
						}
					}
				}
			}
		}
		if (req.body.teacher_details && req.body.teacher_details.length) {
			for (const element of req.body.teacher_details) {
				if (element.status) {
					for (const ele of activityId.assignTo_you) {
						if (ele.teacher_id == element.teacher_id) {
							const aa = await activityModel.findOneAndUpdate(
								{ _id: id, 'assignTo_you.teacher_id': ele.teacher_id },
								{
									$set: {
										'assignTo_you.$.status': 'Evaluated',
									},
								}
							);
							break;
						}
					}
				}
			}
		}
		const reward = await rewardModel.create({
			_id: new mongoose.Types.ObjectId(),
			activity_id: req.body.activity_id,
			test_details: req.body.test_details,
			student_details: req.body.student_details,
			teacher_details: req.body.teacher_details,
			innovaions_id: req.body.innovaions_id,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		console.log('reward', reward);
		res.status(201).json({
			status: 201,
			message: 'successfully Created',
			data: reward,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};
