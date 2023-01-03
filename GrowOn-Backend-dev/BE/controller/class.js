const mongoose = require('mongoose');
const ClassModel = require('../model/class');
const SchoolModel = require('../model/school');
const StudentModel = require('../model/student');
const ActivityModel = require('../model/activity');
const BoardModel = require('../model/board');
const UserModel = require('../model/user');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllClass = async (req, res) => {
	try {
		const features = new APIFeatures(
			ClassModel.find({}).select('-sequence_number'),
			req.query
		)
			.filter()
			.sortByNumber()
			.limitFields()
			.paginate();
		const classData = await features.query;
		const responeData1 = JSON.parse(JSON.stringify(classData));
		// const mainObj = [];
		// for (const responeData of responeData1) {
		// 	if (responeData._id) {
		// 		req.body = { 'assignTo.class_id': responeData._id };
		// 		/// /////////////////////////////////////////////////////////////////////////////
		// 		const activity = new APIFeatures(ActivityModel.find({}), req.body)
		// 			.filter()
		// 			.sort()
		// 			.limitFields()
		// 			.paginate();
		// 		const activityData = await activity.query;
		// 		const penData = activityData.filter(x => x.status == 'pending');
		// 		const comleteData = activityData.length - penData.length;
		// 		const avgData = (comleteData / activityData.length) * 100;
		// 		if (!avgData) {
		// 			responeData.studentProgress = 0;
		// 		} else {
		// 			responeData.studentProgress = avgData;
		// 		}
		// 	}
		// 	mainObj.push(responeData);
		// }
		res.json({
			status: 200,
			results: responeData1.length,
			data: responeData1,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fail',
			message: err,
		});
	}
};
exports.getTour = async (req, res) => {
	try {
		const getClass = await ClassModel.findById(req.params.id).select(
			'-sequence_number'
		);
		res.json({
			status: 200,
			data: {
				getClass,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.getClass = async (req, res) => {
	const { id } = req.params;
	let result = await SchoolModel.find({ _id: id })
		.select('schoolName classList')
		.populate('classList', 'name sequence_number');
	result = result[0].classList;
	result.sort((a, b) => a.sequence_number - b.sequence_number);
	res.status(200).json({
		isSuccess: true,
		data: result,
	});
};

exports.createClass = async (req, res) => {
	try {
		const classData = await ClassModel.find({});
		for (const ele of classData) {
			if (ele.name.toLowerCase() == req.body.name.toLowerCase().trim()) {
				return res.json({
					error: 'Class Already Exist',
					status: 802,
				});
			}
		}
		const classData1 = new ClassModel(req.body);

		classData1
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
					status: 201,
					data: result,
				});
			})
			.catch(err => {
				res.status(400).json({
					error: err,
					status: 411,
				});
			});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.updateTour = async (req, res) => {
	try {
		const classUpdate = await ClassModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({
			status: 201,
			data: {
				classUpdate,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.deleteTour = async (req, res) => {
	try {
		await ClassModel.findByIdAndDelete(req.params.id);
		res.json({
			status: 201,
			data: 'Class Deleted ',
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.unMapClass = async (req, res) => {
	try {
		const { classId } = req.body;
		const { schoolId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const boardData = await BoardModel.find({
			'repository.mapDetails.classId': classId,
		});
		if (boardData && boardData.length) {
			isMapClass = true;
		} else {
			const userData = await UserModel.find({ primary_class: classId });
			const studentData = await StudentModel.find({
				class: mongoose.Types.ObjectId(classId),
			});
			if ((userData && userData.length) || (studentData && studentData.length))
				isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This class is already mapped, pls delete the mapping first';
		} else {
			message = 'Class UnMppaed Successfully';
			await SchoolModel.findByIdAndUpdate(schoolId, {
				$pull: { classList: classId },
			});
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.deleteClass = async (req, res) => {
	try {
		const { classId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const schoolData = await SchoolModel.find({ classList: classId });
		if (schoolData && schoolData.length) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This class is already mapped, pls delete the mapping first';
		} else {
			message = 'Class Deleted Successfully';
			await ClassModel.deleteOne({ _id: classId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};
