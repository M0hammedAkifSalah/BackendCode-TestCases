const mongoose = require('mongoose');
const InnovationModel = require('../model/innovations');
const APIFeatures = require('../utils/apiFeatures');
const classModel = require('../model/class');
const Student = require('../model/student');
const User = require('../model/user');
const firebaseNoti = require('../firebase');
require('dotenv').config();

exports.CreateInnovations = async (req, res, next) => {
	try {
		const today = Date.now();
		const innovations = await InnovationModel.create({
			_id: mongoose.Types.ObjectId(),
			submitted_by: req.body.submitted_by,
			title: req.body.title,
			about: req.body.about,
			repository: req.body.repository,
			tags: req.body.tags,
			files: req.body.files,
			like: req.body.like,
			like_by: req.body.like_by,
			view_by: req.body.view_by,
			view: req.body.view,
			coin: req.body.coin,
			category: req.body.category,
			teacher_id: req.body.teacher_id,
			published: req.body.published,
			published_with: req.body.published_with,
			created_by: req.body.created_by,
		});
		const arrOfDeviceToken = [];
		// eslint-disable-next-line guard-for-in
		for (const teacherId of req.body.teacher_id) {
			const teacherData = await User.findById(teacherId);
			if (teacherData && teacherData.DeviceToken) {
				arrOfDeviceToken.push(teacherData.DeviceToken);
			}
		}
		const studentData = await Student.findById(innovations.submitted_by);
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
				title: 'Innovation Submitted',
				body: innovations.title,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'innovation',
			},
		};
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		res.status(201).json({
			message: 'created Successfully',
			data: innovations,
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

exports.count = async (req, res, next) => {
	try {
		let tours;
		if (req.body.submitted_by) {
			tours = await InnovationModel.aggregate([
				{
					$match: {
						submitted_by: mongoose.Types.ObjectId(req.body.submitted_by),
						$and: [{ published: { $ne: '' } }, { published: { $ne: null } }],
					},
				},
				{
					$group: {
						_id: '$published',
						count: { $sum: 1 },
					},
				},
				{
					$project: {
						_id: 0,
						published: '$_id',
						count: 1,
						sum: 1,
					},
				},
			]);
		} else {
			tours = await InnovationModel.aggregate([
				{
					$group: {
						_id: '$published',
						num: { $sum: 1 },
					},
				},
			]);
		}
		res.status(200).json({
			data: tours,
		});
	} catch (err) {
		console.log('err', err);
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.GetAllInnovations = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			InnovationModel.find({}).populate('submitted_by'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const innovationsData = await features.query;
		if (innovationsData) {
			const responeData1 = JSON.parse(JSON.stringify(innovationsData));
			for (const element of responeData1) {
				element.like_by_count = element.like_by.length;
				let className;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = await classModel.findById(element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
						}
					}
				}
			}
			res.status(200).json({
				data: responeData1,
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: err,
		});
	}
};

exports.SingleInnovation = async (req, res, next) => {
	try {
		const innovationsData = await InnovationModel.findById(
			req.params.id
		).populate('submitted_by');
		if (innovationsData.length == 0) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		} else {
			const responeData1 = JSON.parse(JSON.stringify([innovationsData]));
			for (const element of responeData1) {
				element.like_by_count = element.like_by.length;
				let className;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = await classModel.findById(element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
						}
					}
				}
			}
			res.status(200).json({
				message: 'success',
				data: responeData1,
			});
		}
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};
exports.UpdateInnovations = async (req, res, next) => {
	try {
		const { id } = req.params;
		const innovationsData = await InnovationModel.findByIdAndUpdate(id, {
			submitted_by: req.body.submitted_by,
			title: req.body.title,
			about: req.body.about,
			tags: req.body.tags,
			files: req.body.files,
			category: req.body.category,
		});
		res.status(201).json({
			message: 'updated Successfully',
		});
	} catch (err) {
		res.status(404).json({
			message: err,
		});
	}
};

/// /////////////////////////////updated by teacher/////////////////
exports.UpdateInnovationsteacher = async (req, res, next) => {
	try {
		const { id } = req.params;
		const innovationsData = await InnovationModel.findByIdAndUpdate(id, {
			coin: req.body.coin,
			teacher_note: req.body.teacher_note,
			published: req.body.published,
			published_with: req.body.published_with,
		});
		if (
			req.body.published.trim().toLowerCase() == 'yes' &&
			innovationsData.submitted_by
		) {
			const arrOfDeviceToken = [];
			console.log(innovationsData.submitted_by.toString());
			const studentData = await Student.findById(innovationsData.submitted_by);
			if (studentData && studentData.DeviceToken) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
			const payload = {
				notification: {
					title: 'Innovation Approved',
					body: innovationsData.title,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'innovation',
				},
			};
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(201).json({
			message: 'updated Successfully',
		});
	} catch (err) {
		res.status(404).json({
			message: err,
		});
	}
};

/// /////////////////////////////like//////////////
exports.Like = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'Like' ? 1 : 1;
		if (req.body.like_by) {
			console.log('%%%%%%%%%%%%%%');
			await InnovationModel.findByIdAndUpdate(id, {
				$inc: { like: counter },
				$push: { like_by: req.body.like_by },
			});
			res.status(200).json({
				status: 'success',
			});
		}
		console.log('*********************');
		await InnovationModel.findByIdAndUpdate(id, {
			$inc: { like: counter },
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
/// ///////////////////////////// dis like///////////////
exports.Dislike = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'Dislike' ? -1 : -1;
		if (req.body.dislike_by) {
			console.log('%%%%%%%%%%%%%%');
			await InnovationModel.findByIdAndUpdate(id, {
				$inc: { like: counter },
				$pull: { like_by: req.body.dislike_by },
			});
			res.status(200).json({
				status: 'success',
			});
		}
		console.log('*********************');
		await InnovationModel.findByIdAndUpdate(id, {
			$inc: { like: counter },
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
		const counter = action === 'Like' ? 1 : 1;
		console.log('.....', counter);
		await InnovationModel.findByIdAndUpdate(id, {
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
/// ///////////////////  started By////////////
exports.Viewed = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { action } = req.body;
		const counter = action === 'View' ? 1 : 1;
		await InnovationModel.findByIdAndUpdate(id, {
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

exports.InnovationsArchive = async (req, res, next) => {
	try {
		const { id } = req.params;
		const assignTo_you = await InnovationModel.findByIdAndDelete(id);
		res.status(200).json({
			status: 'success deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};
