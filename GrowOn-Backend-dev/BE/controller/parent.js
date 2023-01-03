const mongoose = require('mongoose');
const parent = require('../model/parent');
const student = require('../model/student');
const activityModel = require('../model/activity');

const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const passwordUtil = require('../utils/password');

exports.replace = async (req, res, next) => {
	try {
		const getAllParent = await parent.find();

		for (const ele of getAllParent) {
			const allParent = await parent.find({ username: ele.username });

			if (allParent.length > 1) {
				const lastRecordId = allParent[allParent.length - 1]._id;
				for (let i = 0; i < allParent.length - 1; i++) {
					await student.findOneAndUpdate(
						{ parent_id: allParent[i]._id },
						{
							$set: {
								parent_id: lastRecordId,
							},
						}
					);
					await parent.findByIdAndDelete(allParent[i]._id);
				}
			}
		}
		res.status(200).json({
			data: getAllParent,
		});
	} catch (err) {
		res.status(500).json({
			error: err,
		});
	}
};

exports.updateDeviceToken = async (req, res, next) => {
	parent
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				DeviceToken: req.body.device_token,
			}
		)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: 'Updated',
				});
			} else {
				res.status(500).json({
					message: 'fail to update',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.getBySectionId = async (req, res, next) => {
	const features = new APIFeatures(
		student.find({}).select('-createdAt -updatedAt'),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			const obj = {
				student_id: responeData._id,
				parent_id: responeData.parent_id,
			};
			mainObj.push(obj);
		}
		res.status(200).json({
			data: mainObj,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
};
/// ////////////////////////parent update Password //////////
exports.UpdatePassword = async (req, res, next) => {
	try {
		const { id, password } = req.body;

		const parentData = await parent.findById(id);

		parentData.password = password;
		await parentData.save();

		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.login = catchAsync(async (req, res, next) => {
	if (!req.body.password) {
		return next(new ErrorResponse('Please enter password', 400));
	}

	const foundParent = await parent
		.findOne({
			_id: req.body.username,
			activeStatus: true,
		})
		.select('+password');

	if (!foundParent) {
		return next(new ErrorResponse('User not found', 401));
	}

	if (foundParent.profileStatus !== 'APPROVED') {
		return next(
			new ErrorResponse(`User is in ${foundParent.profileStatus} state`, 403)
		);
	}

	let isMatch = null;

	if (foundParent.password === req.body.password) {
		isMatch = true;
		// hash password if it isnt hashed.
		// remove this in future.
		foundParent.password = req.body.password;
		foundParent.markModified('password');
		await foundParent.save();
	} else {
		isMatch = await foundParent.comparePassword(req.body.password);
	}

	if (!isMatch) {
		return next(new ErrorResponse('Invalid credentials', 401));
	}

	const token = await passwordUtil.genJwtToken(foundParent._id);

	return res.status(200).json({
		message: 'Auth successful',
		token,
		user_info: foundParent,
	});
});

exports.find = async (req, res, next) => {
	try {
		parent
			.find({
				username: req.body.username,
			})
			.populate('parent_id')
			.exec()
			// eslint-disable-next-line no-shadow
			.then(parent => {
				if (parent.length < 1) {
					return res.status(401).json({
						status: 401,
						message: 'User does Not Exist',
					});
				}

				return res.status(200).json({
					user_info: parent,
				});
			})
			.catch(err => {
				res.status(500).json({
					error: err,
				});
			});
	} catch (err) {
		res.status(400).jso({
			message: 'error',
		});
	}
};
/// ////////////////////////////////////////////////////////

exports.profile_image = async (req, res, next) => {
	try {
		const { id } = req.params;
		const sudentData = await parent.findByIdAndUpdate(id, {
			profile_image: req.body.profile_image,
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

exports.deleteParent = async (req, res, next) => {
	const deletedData = await parent.delete({
		'repository.id': req.body.schoolId,
	});

	res.status(200).json({
		data: deletedData,
	});
};

async function progressByParentId(parentid) {
	try {
		const obj = [];
		let livePool = 0;
		let Announcement = 0;
		let Event = 0;
		let CheckList = 0;
		let total = 0;
		let totalNum = 0;
		/// /////////////////////// get activity number of a student /////////
		const totalLivePoll = await activityModel.find({
			$and: [
				{ assignTo_parent: { $elemMatch: { parent_id: parentid } } },
				{ activity_type: 'LivePoll' },
			],
		});
		const totalAnnouncement = await activityModel.find({
			$and: [
				{ assignTo_parent: { $elemMatch: { parent_id: parentid } } },
				{ activity_type: 'Announcement' },
			],
		});
		const totalEvent = await activityModel.find({
			$and: [
				{ assignTo_parent: { $elemMatch: { parent_id: parentid } } },
				{ activity_type: 'Event' },
			],
		});
		const totalCheckList = await activityModel.find({
			$and: [
				{ assignTo_parent: { $elemMatch: { parent_id: parentid } } },
				{ activity_type: 'Check List' },
			],
		});

		/// /////////////////////get articular activity number of student //////////
		livePool = await activityModel.aggregate([
			{
				$match: {
					selected_livepool: {
						$elemMatch: {
							selected_by_parent: mongoose.Types.ObjectId(parentid),
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

		Announcement = await activityModel.aggregate([
			{
				$match: {
					acknowledge_by_parent: {
						$elemMatch: {
							acknowledge_by_parent: mongoose.Types.ObjectId(parentid),
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
				$match: { going_by_parent: mongoose.Types.ObjectId(parentid) },
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
		const Eventnotgoing = await activityModel.aggregate([
			{
				$match: { not_going_by_parent: mongoose.Types.ObjectId(parentid) },
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
						$elemMatch: {
							selected_by_parent: mongoose.Types.ObjectId(parentid),
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
		if (livePool.length > 0) {
			const live = (livePool[0].num / totalLivePoll.length) * 100;
			obj.push({
				livepool: {
					completed: livePool[0].num,
					total: totalLivePoll.length,
					average: live,
					pending: totalLivePoll.length - livePool[0].num,
				},
			});
		} else {
			obj.push({
				livepool: {
					completed: 0,
					total: totalLivePoll.length,
					average: livePool.length,
					pending: totalLivePoll.length,
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
					pending: totalAnnouncement.length - Announcement[0].num,
				},
			});
		} else {
			obj.push({
				Announcement: {
					completed: 0,
					total: totalAnnouncement.length,
					average: Announcement.length,
					pending: totalAnnouncement.length,
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
					pending:
						totalEvent.length -
						Event[0].num -
						(!Eventnotgoing[0] ? 0 : Eventnotgoing[0].num),
				},
			});
		} else {
			obj.push({
				Event: {
					completed: 0,
					total: totalEvent.length,
					average: Event.length,
					pending:
						totalEvent.length - (!Eventnotgoing[0] ? 0 : Eventnotgoing[0].num),
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
					pending: totalCheckList.length - CheckList[0].num,
				},
			});
		} else {
			obj.push({
				CheckList: {
					completed: 0,
					total: totalCheckList.length,
					average: CheckList.length,
					pending: totalCheckList.length,
				},
			});
		}
		total =
			totalLivePoll.length +
			totalAnnouncement.length +
			totalEvent.length +
			totalCheckList.length;

		totalNum =
			obj[0].livepool.completed +
			obj[1].Announcement.completed +
			obj[2].Event.completed +
			obj[3].CheckList.completed;
		const totalAvg =
			obj[0].livepool.average +
			obj[1].Announcement.average +
			obj[2].Event.average +
			obj[3].CheckList.average;
		const totalPending =
			obj[0].livepool.pending +
			obj[1].Announcement.pending +
			obj[2].Event.pending +
			obj[3].CheckList.pending;

		if (total > 0) {
			const totalavg = totalAvg / obj.length;
			obj.push({
				Total: {
					completed: totalNum,
					total,
					average: totalavg,
					pending: totalPending,
				},
			});
		} else {
			obj.push({
				Total: {
					completed: 0,
					total,
					average: 0,
					pending: 0,
				},
			});
		}

		return obj;
	} catch (err) {
		console.log(err);
	}
}

exports.getParentProgess = async (req, res, next) => {
	const parentid = req.body.parent_id;
	const progress = await progressByParentId(parentid);
	const parentProgress = progress;
	res.status(200).json({
		data: parentProgress,
	});
};

exports.getParentProgessLivePoll = async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const livepoll = await activityModel.aggregate([
		{
			$match: {
				assignTo_parent: { $elemMatch: { parent_id: id } },
				activity_type: 'LivePoll',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo_parent: {
					$filter: {
						input: '$assignTo_parent',
						as: 'item',
						cond: { $eq: ['$$item.parent_id', id] },
					},
				},
				selected_livepool: {
					$filter: {
						input: '$selected_livepool',
						as: 'item',
						cond: { $eq: ['$$item.selected_by_parent', id] },
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
									{ $first: '$assignTo_parent.status' },
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
						$cond: [{ $eq: [{ $first: '$assignTo_parent.status' }, 'Pending'] }, 1, 0],
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
};

exports.getParentProgessCheckList = async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const checkList = await activityModel.aggregate([
		{
			$match: {
				assignTo_parent: { $elemMatch: { parent_id: id } },
				activity_type: 'Check List',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo_parent: {
					$filter: {
						input: '$assignTo_parent',
						as: 'item',
						cond: { $eq: ['$$item.parent_id', id] },
					},
				},
				selected_checkList: {
					$filter: {
						input: '$selected_checkList',
						as: 'item',
						cond: { $eq: ['$$item.selected_by_parent', id] },
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
							{ $eq: [{ $first: '$selected_checkList.selected_by_parent' }, id] },
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo_parent.status' }, 'Pending'] }, 1, 0],
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
};

exports.getParentProgessEvent = async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const events = await activityModel.aggregate([
		{
			$match: {
				assignTo_parent: { $elemMatch: { parent_id: id } },
				activity_type: 'Event',
			},
		},
		{
			$project: {
				activity_type: 1,
				assignTo_parent: {
					$filter: {
						input: '$assignTo_parent',
						as: 'item',
						cond: { $eq: ['$$item.parent_id', id] },
					},
				},
				going_by_parent: {
					$filter: {
						input: '$going_by_parent',
						as: 'item',
						cond: { $eq: ['$$item', id] },
					},
				},
				not_going_by_parent: {
					$filter: {
						input: '$not_going_by_parent',
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
									{ $eq: [{ $first: '$going_by_parent' }, id] },
									{ $eq: [{ $first: '$not_going_by_parent' }, id] },
								],
							},
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo_parent.status' }, 'Pending'] }, 1, 0],
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
};

exports.getParentProgessAnnouncement = async (req, res, next) => {
	const id = mongoose.Types.ObjectId(req.params.id);
	const announcement = await activityModel.aggregate([
		{
			$match: {
				assignTo_parent: { $elemMatch: { parent_id: id } },
				activity_type: 'Announcement',
			},
		},
		{
			$project: {
				activity_type: 1,
				dueDate: 1,
				assignTo_parent: {
					$filter: {
						input: '$assignTo_parent',
						as: 'item',
						cond: { $eq: ['$$item.parent_id', id] },
					},
				},
				acknowledge_by_parent: {
					$filter: {
						input: '$acknowledge_by_parent',
						as: 'item',
						cond: { $eq: ['$$item.acknowledge_by_parent', id] },
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
							{ $eq: [{ $first: '$acknowledge_by_parent.acknowledge_by_parent' }, id] },
							1,
							0,
						],
					},
				},
				pending: {
					$sum: {
						$cond: [{ $eq: [{ $first: '$assignTo_parent.status' }, 'Pending'] }, 1, 0],
					},
				},
				delayedSubmission: {
					$sum: {
						$cond: [
							{
								$or: [
									{
										$gt: [
											{ $first: '$acknowledge_by_parent.submitted_date' },
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
};