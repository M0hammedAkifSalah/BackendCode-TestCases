/* eslint-disable new-cap */
const mongoose = require('mongoose');
const scheduleClassModel = require('../model/schedule_class');
const APIFeatures = require('../utils/apiFeatures');
const studentModel = require('../model/student');
const Class = require('../model/class');
const Section = require('../model/section');

exports.GetAll = async (req, res, next) => {
	try {
		const studentId = req.body.assign_To ? req.body.assign_To.student_id : '';
		const features = new APIFeatures(
			scheduleClassModel
				.find({})
				.populate({ path: 'teacher_id', select: 'name profile_image' })
				.populate({
					path: 'student_join_class.student_id',
					select: 'name profile_image',
				})
				.populate({ path: 'student_join_class.class_id', select: 'name' })
				.populate({
					path: 'assign_To.student_id',
					select: 'name profile_image _id class section',
				}),
			req.body
		)
			.filter()
			.sort()
			.paginate()
			.limitFields();
		const classDetails = await features.query;
		const list = [];

		for (const ele of classDetails) {
			for (const studentjoinClass of ele.student_join_class) {
				if (studentjoinClass.join_date)
					studentjoinClass.join_date = new Date(
						new Date(studentjoinClass.join_date).getTime() + 330 * 60000
					).toISOString();
			}

			const returnList = [];
			if (studentId) {
				console.log('classId', ele.id);
				const arrayy = [];
				for (const student of ele.assign_To) {
					console.log('student', student.id);
					if (student.student_id) {
						if (student.student_id.id == '60e3e7ed155f69049b2a1b77') {
							console.log('aaa');
						}
						if (student.student_id.id == studentId) {
							arrayy.push(student);
						}
					}
				}
				ele.assign_To = arrayy;
			}
			for (const ele2 of ele.assign_To) {
				const obj = JSON.parse(JSON.stringify(ele2));
				let studentData;
				if (ele2.student_id) {
					studentData = await studentModel
						.findById(ele2.student_id.id)
						.select(
							'-about_me -hobbies -__v -profile_type -gender -school_id -username -branch_id -repository -subject -repository -createdAt -updatedAt -country_id -state_id -city_id -pincode -religion -dob -email -address -aadhar -sts_no -rte_student -caste -mother_tongue -blood_gr -mode_of_transp -medical_cond -wear_glasses -password -contact_number -activeStatus -parent_id'
						)
						.populate('class section');
					studentData = JSON.parse(JSON.stringify(studentData));
				}
				if (studentData) {
					obj.class_id = JSON.parse(JSON.stringify(studentData.class));
					delete studentData.class;
					obj.section_id = studentData.section;
					delete studentData.section;
					delete studentData.livepoll;
				}

				obj.student_id = studentData;
				returnList.push(obj);
			}
			const returnData = JSON.parse(JSON.stringify(ele));
			returnData.assign_To = returnList;
			list.push(returnData);
		}
		res.status(200).json({
			result: list.length,
			data: list,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};

exports.UpdatescheduleClass = async (req, res, next) => {
	try {
		const { id } = req.params;
		await scheduleClassModel.findByIdAndUpdate(id, {
			meeting_link: req.body.meeting_link,
			description: req.body.description,
			files: req.body.files,
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

exports.get = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			scheduleClassModel
				.find({})
				.select(
					'-attendance_manually -files -createdAt -updatedAt -chapter_name -does_class_repeat -teacher_id -meeting_link -description -assign_To -repository -createdBy'
				)
				.populate({
					path: 'assign_To.student_id',
					select: 'name profile_image',
				})
				.populate({ path: 'teacher_id', select: 'name profile_image' })
				.populate({ path: 'student_join_class.class_id', select: 'name' })
				.populate({
					path: 'student_join_class.student_id',
					select: 'name profile_image',
				}),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		let classDetails = await features.query;

		classDetails = JSON.parse(JSON.stringify(classDetails));
		for (const classs of classDetails) {
			for (const studentjoinClass of classs.student_join_class) {
				if (studentjoinClass.join_date)
					studentjoinClass.join_date = new Date(
						new Date(studentjoinClass.join_date).getTime() + 330 * 60000
					).toISOString();
			}
		}
		res.status(200).json({
			result: classDetails.length,
			data: classDetails,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.GetById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const features = new APIFeatures(
			scheduleClassModel
				.findById(id)
				.populate({ path: 'assign_To.class_id', select: 'name' })
				.populate({ path: 'student_join_class.class_id', select: 'name' })
				.populate('assign_To.student_id student_join_class.student_id')
				.populate({
					path: 'teacher_id',
					populate: { path: 'profile_type', select: 'role_name' },
				}),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		const classDetails = await features.query;
		for (const ele of classDetails) {
			for (const studentjoinClass of ele.student_join_class) {
				if (studentjoinClass.join_date)
					studentjoinClass.join_date = new Date(
						new Date(studentjoinClass.join_date).getTime() + 330 * 60000
					).toISOString();
			}
		}
		res.status(200).json({
			result: classDetails.length,
			data: classDetails,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Create = async (req, res, next) => {
	try {
		let arrayDate = [];
		let ScheduleClass = null;
		if (
			req.body.does_class_repeat == 'yes' ||
			req.body.does_class_repeat == 'Yes'
		) {
			const startdate = new Date(req.body.class_start_Date);
			const enddate = new Date(req.body.class_end_Date);
			do {
				const x = new Date(startdate);
				arrayDate.push(x);
				startdate.setDate(startdate.getDate() + 7);
			} while (startdate <= enddate);
		} else {
			ScheduleClass = new scheduleClassModel({
				_id: new mongoose.Types.ObjectId(),
				class_start_Date: req.body.class_start_Date,
				class_end_Date: req.body.class_end_Date,
				class_start_time: req.body.class_start_time,
				class_end_time: req.body.class_end_time,
				subject_name: req.body.subject_name,
				chapter_name: req.body.chapter_name,
				does_class_repeat: req.body.does_class_repeat,
				teacher_id: req.body.teacher_id,
				meeting_link: req.body.meeting_link,
				student_join_class: req.body.student_join_class,
				teacher_join_class: req.body.teacher_join_class,
				description: req.body.description,
				files: req.body.files,
				assign_To: req.body.assign_To,
				assign_To_you: req.body.assign_To_you,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});

			await ScheduleClass.save();
		}
		const startTime = req.body.class_start_time.split('T')[1];
		const endTime = req.body.class_end_time.split('T')[1];
		if (arrayDate.length > 0) {
			const id = new mongoose.Types.ObjectId();
			ScheduleClass = new scheduleClassModel({
				_id: id,
				class_start_Date: arrayDate[0].toISOString(),
				class_end_Date: req.body.class_end_Date,
				class_start_time: `${
					arrayDate[0].toISOString().split('T')[0]
				}T${startTime}`,
				class_end_time: `${
					arrayDate[0].toISOString().split('T')[0]
				}T${endTime}`,
				subject_name: req.body.subject_name,
				chapter_name: req.body.chapter_name,
				does_class_repeat: req.body.does_class_repeat,
				teacher_id: req.body.teacher_id,
				meeting_link: req.body.meeting_link,
				student_join_class: req.body.student_join_class,
				teacher_join_class: req.body.teacher_join_class,
				description: req.body.description,
				files: req.body.files,
				assign_To: req.body.assign_To,
				assign_To_you: req.body.assign_To_you,
				repository: req.body.repository,
				linked_id: id,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			await ScheduleClass.save();
			arrayDate = arrayDate.slice(1);
			for (const ele of arrayDate) {
				const ScheduleClass1 = new scheduleClassModel({
					_id: new mongoose.Types.ObjectId(),
					class_start_Date: ele.toISOString(),
					class_end_Date: req.body.class_end_Date,
					class_start_time: `${ele.toISOString().split('T')[0]}T${startTime}`,
					class_end_time: `${ele.toISOString().split('T')[0]}T${endTime}`,
					subject_name: req.body.subject_name,
					chapter_name: req.body.chapter_name,
					does_class_repeat: req.body.does_class_repeat,
					teacher_id: req.body.teacher_id,
					meeting_link: req.body.meeting_link,
					student_join_class: req.body.student_join_class,
					teacher_join_class: req.body.teacher_join_class,
					description: req.body.description,
					files: req.body.files,
					assign_To: req.body.assign_To,
					assign_To_you: req.body.assign_To_you,
					repository: req.body.repository,
					linked_id: id,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});

				await ScheduleClass1.save()
					.then(result => {})
					.catch(err => {
						res.json({
							error: err,
							status: 411,
						});
					});
			}
		}
		res.status(201).json({
			message: 'created successfully',
			status: 201,
			data: ScheduleClass,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: 400,
			message: error,
		});
	}
};

exports.studentJoin = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await scheduleClassModel.findByIdAndUpdate(id, {
			$push: {
				student_join_class: req.body.student_join_class,
			},
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

exports.teacherJoin = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await scheduleClassModel.findByIdAndUpdate(id, {
			$push: {
				teacher_join_class: req.body.teacher_join_class,
			},
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

exports.addStudentJoinClass = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await scheduleClassModel.findByIdAndUpdate(id, {
			$push: {
				attendance_manually: req.body.attendance_manually,
			},
		});
		console.log('99999999', updateExam);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.addTeacherJoinClass = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await scheduleClassModel.findByIdAndUpdate(id, {
			$push: {
				teacher_attendance_manually: req.body.teacher_attendance_manually,
			},
		});
		console.log('99999999', updateExam);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// //////////////////////////////// delete////////////////////
exports.scheduleClassArchive = async (req, res, next) => {
	try {
		const { id } = req.params;
		const assignTo_you = await scheduleClassModel.findByIdAndDelete(id);
		res.status(200).json({
			status: 'success deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.deleteByLinkedId = async (req, res, next) => {
	try {
		console.log('innnn');
		const { linked_id } = req.body;
		let { fromDate } = req.body;
		fromDate = new Date(fromDate);
		const classLinked = await scheduleClassModel.find({ linked_id });
		for (const ele of classLinked) {
			if (ele.class_start_Date[0] >= fromDate) {
				await scheduleClassModel.findByIdAndDelete(ele._id);
			}
		}
		res.status(200).json({
			status: 'all class from date deleted successfully',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: err,
		});
	}
};
