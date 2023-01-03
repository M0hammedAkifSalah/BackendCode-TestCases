/* eslint-disable new-cap */
const mongoose = require('mongoose');
const sessionModel = require('../model/session');
const studentModel = require('../model/student');
const userModel = require('../model/user');
const parentModel = require('../model/parent');
const InstituteModel = require('../model/institute');
const schoolModel = require('../model/school');
const firebaseNoti = require('../firebase');
const redisClient = require('../config/redisClient');

const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

exports.GetAll = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		sessionModel
			.find({})
			.populate({ path: 'student_join_session.class_id', select: 'name' })
			.populate({ path: 'student_join_session.student_id', select: 'name' })
			.populate({ path: 'student_join_session.school_id', select: 'name' })
			.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
			.populate({ path: 'teacher_join_session.school_id', select: 'name' })
			.populate({ path: 'institute_id', select: 'name profile_image' })
			.populate({ path: 'schools', select: 'name schoolImage' })
			.populate({
				path: 'createdBy',
				select: 'name profile_image',
				populate: { path: 'profile_type', select: 'role_name' },
			})
			.limit(100),
		req.body
	)
		.filter()
		.sortA()
		// .paginate()
		.limitFields();

	const sessionDetails = await features.query;

	let resMessage = 'No records found';
	if (sessionDetails && sessionDetails.length) {
		resMessage = 'Successfully fetched';
	}

	res
		.status(200)
		.json(SuccessResponse(sessionDetails, sessionDetails.length, resMessage));
});

exports.GetAllWithPagination = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		sessionModel
			.find({ linked_id: { $exists: false } })
			.populate({ path: 'student_join_session.class_id', select: 'name' })
			.populate({ path: 'student_join_session.student_id', select: 'name' })
			.populate({ path: 'student_join_session.school_id', select: 'name' })
			.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
			.populate({ path: 'teacher_join_session.school_id', select: 'name' })
			.populate({ path: 'institute_id', select: 'name profile_image' })
			.populate({ path: 'schools', select: 'name schoolImage' })
			.populate({
				path: 'createdBy',
				select: 'name profile_image',
				populate: { path: 'profile_type', select: 'role_name' },
			}),
		req.body
	)
		.filter()
		.sortA()
		.paginate()
		.limitFields();

	const sessionDetails = await features.query;

	let resMessage = 'No records found';
	if (sessionDetails && sessionDetails.length) {
		resMessage = 'Successfully fetched';
	}

	res
		.status(200)
		.json(SuccessResponse(sessionDetails, sessionDetails.length, resMessage));
});

exports.GetFutureDates = catchAsync(async (req, res, next) => {
	const date = new Date(req.body.session_start_Date);
	delete req.body.session_start_Date;

	if (date.toString() === 'Invalid Date') {
		return next(new ErrorResponse('invalid date at session_start_Date', 400));
	}

	const features = new APIFeatures(
		sessionModel
			.find({
				session_start_Date: { $gt: date },
				linked_id: { $exists: false },
			})
			.populate({ path: 'student_join_session.class_id', select: 'name' })
			.populate({ path: 'student_join_session.student_id', select: 'name' })
			.populate({ path: 'student_join_session.school_id', select: 'name' })
			.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
			.populate({ path: 'teacher_join_session.school_id', select: 'name' })
			.populate({ path: 'institute_id', select: 'name profile_image' })
			.populate({ path: 'schools', select: 'name schoolImage' })
			.populate({
				path: 'createdBy',
				select: 'name profile_image',
				populate: { path: 'profile_type', select: 'role_name' },
			}),
		req.body
	)
		.filter()
		.sortA()
		.paginate()
		.limitFields();
	const sessionDetails = await features.query;

	let resMessage = 'No records found';
	if (sessionDetails && sessionDetails.length) {
		resMessage = 'Successfully fetched';
	}

	res
		.status(200)
		.json(SuccessResponse(sessionDetails, sessionDetails.length, resMessage));
});

exports.toFutureDates = catchAsync(async (req, res, next) => {
	const date = new Date(req.body.session_start_Date);
	delete req.body.session_start_Date;

	const features = new APIFeatures(
		sessionModel
			.find({ session_start_Date: { $gte: date } })
			.populate({ path: 'student_join_session.class_id', select: 'name' })
			.populate({ path: 'student_join_session.student_id', select: 'name' })
			.populate({ path: 'student_join_session.school_id', select: 'name' })
			.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
			.populate({ path: 'teacher_join_session.school_id', select: 'name' })
			.populate({ path: 'institute_id', select: 'name profile_image' })
			.populate({ path: 'schools', select: 'name schoolImage' })
			.populate({
				path: 'createdBy',
				select: 'name profile_image',
				populate: { path: 'profile_type', select: 'role_name' },
			}),
		req.body
	)
		.filter()
		.sortA()
		.paginate()
		.limitFields();

	const sessionDetails = await features.query;

	let resMessage = 'No records found';
	if (sessionDetails && sessionDetails.length) {
		resMessage = 'Successfully fetched';
	}

	res
		.status(200)
		.json(SuccessResponse(sessionDetails, sessionDetails.length, resMessage));
});
exports.updateCompleteSession = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse('session id is required', 400));
	}
	const sessionUpdate = await sessionModel.findByIdAndUpdate(id, req.body, {
		new: true,
	});

	if (!sessionUpdate) {
		return next(new ErrorResponse('No session found with that ID', 404));
	}

	res.status(201).json({
		error: false,
		statusCode: 201,
		message: 'update successfully',
		data: {
			sessionUpdate,
		},
	});
});
exports.updateSession = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse('session id is required', 400));
	}

	const updatedSession = await sessionModel.findByIdAndUpdate(
		id,
		{
			meeting_link: req.body.meeting_link,
			description: req.body.description,
			files: req.body.files,
		},
		{ new: true }
	);

	if (!updatedSession) {
		return next(new ErrorResponse('No session found with that ID', 404));
	}

	res.status(201).json({
		message: 'updated Successfully',
	});
});

exports.get = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			sessionModel
				.find({})
				.select(
					'-attendance_manually -files -createdAt -updatedAt -chapter_name -does_class_repeat -teacher_id -meeting_link -description -assign_To -repository -createdBy'
				)
				.populate({ path: 'student_join_session.class_id', select: 'name' })
				.populate({ path: 'student_join_session.student_id', select: 'name' })
				.populate({ path: 'student_join_session.school_id', select: 'name' })
				.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
				.populate({ path: 'teacher_join_session.school_id', select: 'name' })
				.populate({ path: 'institute_id', select: 'name profile_image' })
				.populate({ path: 'schools', select: 'name schoolImage' })
				.populate({
					path: 'createdBy',
					select: 'name profile_image',
					populate: { path: 'profile_type', select: 'role_name' },
				}),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		let classDetails = await features.query;

		classDetails = JSON.parse(JSON.stringify(classDetails));
		for (const classs of classDetails) {
			for (const studentjoinClass of classs.student_join_session) {
				if (studentjoinClass.join_date)
					studentjoinClass.join_date = new Date(
						new Date(studentjoinClass.join_date).getTime() + 330 * 60000
					).toISOString();
			}
		}
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'successfully fetched',
			records: classDetails.length,
			data: classDetails,
		});
	} catch (error) {
		res.json({
			error: true,
			statusCode: 400,
			message: error,
		});
	}
};

exports.GetById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const features = new APIFeatures(
			sessionModel
				.findById(id)
				.populate({ path: 'student_join_session.class_id', select: 'name' })
				.populate({ path: 'student_join_session.student_id', select: 'name' })
				.populate({ path: 'student_join_session.school_id', select: 'name' })
				.populate({ path: 'teacher_join_session.teacher_id', select: 'name' })
				.populate({ path: 'teacher_join_session.school_id', select: 'name' })
				.populate({ path: 'institute_id', select: 'name profile_image' })
				.populate({ path: 'schools', select: 'name schoolImage' })
				.populate({
					path: 'createdBy',
					select: 'name profile_image',
					populate: { path: 'profile_type', select: 'role_name' },
				}),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		const classDetails = await features.query;
		for (const ele of classDetails) {
			for (const studentjoinClass of ele.student_join_session) {
				if (studentjoinClass.join_date)
					studentjoinClass.join_date = new Date(
						new Date(studentjoinClass.join_date).getTime() + 330 * 60000
					).toISOString();
			}
		}
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'successfully fetched',
			records: classDetails.length,
			data: classDetails,
		});
	} catch (error) {
		res.json({
			error: true,
			statusCode: 400,
			message: error,
		});
	}
};

exports.Create = async (req, res, next) => {
	try {
		const repeatSession = [];
		let arrayDate = [];
		const arrOfDeviceToken = [];
		let arrayRepeatDate = [];
		let ScheduleClass = null;
		if (
			req.body.does_session_repeat == 'yes' ||
			req.body.does_session_repeat == 'Yes'
		) {
			const startdate = new Date(req.body.session_start_Date);
			const enddate = new Date(
				req.body.session_end_Date ? req.body.session_end_Date : Date.now()
			);
			do {
				const x = new Date(startdate);
				arrayDate.push(x);
				startdate.setDate(startdate.getDate() + 7);
			} while (startdate <= enddate);
		} else if (req.body.isDaily == 'yes' || req.body.isDaily == 'Yes') {
			const startdate = new Date(req.body.session_start_Date);
			const enddate = new Date(
				req.body.session_end_Date ? req.body.session_end_Date : Date.now()
			);
			do {
				const x = new Date(startdate);
				arrayRepeatDate.push(x);
				startdate.setDate(startdate.getDate() + 1);
			} while (startdate <= enddate);
		} else {
			ScheduleClass = new sessionModel({
				_id: new mongoose.Types.ObjectId(),
				session_start_Date: req.body.session_start_Date,
				session_end_Date: req.body.session_end_Date,
				session_start_time: req.body.session_start_time,
				session_end_time: req.body.session_end_time,
				subject_name: req.body.subject_name,
				does_session_repeat: req.body.does_session_repeat,
				isDaily: req.body.isDaily,
				institute_id: req.body.institute_id,
				meeting_link: req.body.meeting_link,
				isForStudent: req.body.isForStudent,
				student_join_session: req.body.student_join_session,
				teacher_join_session: req.body.teacher_join_session,
				description: req.body.description,
				files: req.body.files,
				schools: req.body.schools,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			repeatSession.push(ScheduleClass);
		}
		const startTime = req.body.session_start_time.split('T')[1];
		const endTime = req.body.session_end_time.split('T')[1];
		// arrayRepeatDate daily session function
		if (arrayRepeatDate.length) {
			const id = new mongoose.Types.ObjectId();
			ScheduleClass = new sessionModel({
				_id: id,
				session_start_Date: req.body.session_start_Date,
				start_Date: arrayRepeatDate[0].toISOString(),
				session_end_Date: req.body.session_end_Date,
				session_start_time: `${
					arrayRepeatDate[0].toISOString().split('T')[0]
				}T${startTime}`,
				session_end_time: `${
					arrayRepeatDate[0].toISOString().split('T')[0]
				}T${endTime}`,
				subject_name: req.body.subject_name,
				does_session_repeat: req.body.does_session_repeat,
				isDaily: req.body.isDaily,
				institute_id: req.body.institute_id,
				meeting_link: req.body.meeting_link,
				isForStudent: req.body.isForStudent,
				student_join_session: req.body.student_join_session,
				teacher_join_session: req.body.teacher_join_session,
				description: req.body.description,
				files: req.body.files,
				schools: req.body.schools,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			repeatSession.push(ScheduleClass);
			arrayRepeatDate = arrayRepeatDate.slice(1);
			for (const ele of arrayRepeatDate) {
				const ScheduleClass1 = new sessionModel({
					_id: new mongoose.Types.ObjectId(),
					start_Date: req.body.session_start_Date,
					session_start_Date: ele.toISOString(),
					session_end_Date: req.body.session_end_Date,
					session_start_time: `${ele.toISOString().split('T')[0]}T${startTime}`,
					session_end_time: `${ele.toISOString().split('T')[0]}T${endTime}`,
					subject_name: req.body.subject_name,
					does_session_repeat: req.body.does_session_repeat,
					isDaily: req.body.isDaily,
					institute_id: req.body.institute_id,
					meeting_link: req.body.meeting_link,
					isForStudent: req.body.isForStudent,
					student_join_session: req.body.student_join_session,
					teacher_join_session: req.body.teacher_join_session,
					description: req.body.description,
					files: req.body.files,
					schools: req.body.schools,
					linked_id: id,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});

				repeatSession.push(ScheduleClass1);
			}
		}
		// arrayDate repeat session
		if (arrayDate.length) {
			const id = new mongoose.Types.ObjectId();
			const ScheduleClass1 = new sessionModel({
				_id: id,
				start_Date: req.body.session_start_Date,
				session_start_Date: arrayDate[0].toISOString(),
				session_end_Date: req.body.session_end_Date,
				session_start_time: `${
					arrayDate[0].toISOString().split('T')[0]
				}T${startTime}`,
				session_end_time: `${
					arrayDate[0].toISOString().split('T')[0]
				}T${endTime}`,
				subject_name: req.body.subject_name,
				does_session_repeat: req.body.does_session_repeat,
				isDaily: req.body.isDaily,
				institute_id: req.body.institute_id,
				meeting_link: req.body.meeting_link,
				isForStudent: req.body.isForStudent,
				student_join_session: req.body.student_join_session,
				teacher_join_session: req.body.teacher_join_session,
				description: req.body.description,
				files: req.body.files,
				schools: req.body.schools,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			repeatSession.push(ScheduleClass1);
			arrayDate = arrayDate.slice(1);
			for (const ele of arrayDate) {
				const ScheduleClass2 = new sessionModel({
					_id: new mongoose.Types.ObjectId(),
					start_Date: req.body.session_start_Date,
					session_start_Date: ele.toISOString(),
					session_end_Date: req.body.session_end_Date,
					session_start_time: `${ele.toISOString().split('T')[0]}T${startTime}`,
					session_end_time: `${ele.toISOString().split('T')[0]}T${endTime}`,
					subject_name: req.body.subject_name,
					does_session_repeat: req.body.does_session_repeat,
					isDaily: req.body.isDaily,
					institute_id: req.body.institute_id,
					meeting_link: req.body.meeting_link,
					isForStudent: req.body.isForStudent,
					student_join_session: req.body.student_join_session,
					teacher_join_session: req.body.teacher_join_session,
					description: req.body.description,
					files: req.body.files,
					schools: req.body.schools,
					linked_id: id,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});

				repeatSession.push(ScheduleClass2);
			}
		}
		const sessionData = await sessionModel.create(repeatSession);

		if (req.body.schools) {
			if (sessionData[0]._doc.isForStudent) {
				const studentData = await studentModel
					.find({ school_id: { $in: req.body.schools } })
					.populate('parent_id', 'DeviceToken')
					.select('DeviceToken parent_id');
				for (const student of studentData) {
					if (student) {
						if (
							student.parent_id &&
							student.parent_id.DeviceToken &&
							!arrOfDeviceToken.includes(student.parent_id.DeviceToken)
						) {
							arrOfDeviceToken.push(student.parent_id.DeviceToken);
						}
						if (student.DeviceToken) arrOfDeviceToken.push(student.DeviceToken);
					}
				}
			}

			const teacherData = await userModel
				.find({ school_id: { $in: req.body.schools } })
				.select('DeviceToken');
			for (const teacher of teacherData) {
				if (teacher && teacher.DeviceToken) {
					arrOfDeviceToken.push(teacher.DeviceToken);
				}
			}
		}
		const createTeacherData = await userModel
			.findById(req.body.createdBy)
			.select('profile_image');
		let Image;
		if (!createTeacherData || !createTeacherData.profile_image) {
			Image = '';
		} else {
			const imageele = createTeacherData.profile_image.split('/');
			Image = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}
		const payload = {
			notification: {
				title: req.body.subject_name,
				body: req.body.description ? req.body.description : '',
				image: Image,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'session',
			},
		};
		console.log(arrOfDeviceToken);
		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		res.status(201).json({
			error: false,
			statusCode: 201,
			message: 'created successfully',
			data: ScheduleClass,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: error,
		});
	}
};

exports.studentJoin = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (req.body.student_join_session) {
			const studentJoin = await sessionModel.findByIdAndUpdate(id, {
				$push: {
					student_join_session: req.body.student_join_session,
				},
			});
		} else {
			const parentJoin = await sessionModel.findByIdAndUpdate(id, {
				$push: {
					parent_join_session: req.body.parent_join_session,
				},
			});
		}
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'success',
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.parentJoin = async (req, res, next) => {
	try {
		const { id } = req.params;
		const parentJoin = await sessionModel.findByIdAndUpdate(id, {
			$push: {
				parent_join_session: req.body.parent_join_session,
			},
		});
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'success',
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.teacherJoin = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await sessionModel.findByIdAndUpdate(id, {
			$push: {
				teacher_join_session: req.body.teacher_join_session,
			},
		});
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'success',
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.addStudentJoinClass = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await sessionModel.findByIdAndUpdate(id, {
			$push: {
				attendance_manually: req.body.attendance_manually,
			},
		});
		console.log('99999999', updateExam);
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'success',
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			message: err.message,
		});
	}
};

exports.addTeacherJoinClass = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updateExam = await sessionModel.findByIdAndUpdate(id, {
			$push: {
				teacher_attendance_manually: req.body.teacher_attendance_manually,
			},
		});
		console.log('99999999', updateExam);
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'success',
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

/// //////////////////////////////// delete////////////////////
exports.deleteSession = async (req, res, next) => {
	try {
		const { id } = req.params;
		const deletedData = await sessionModel.findByIdAndDelete(id);
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Session deleted successfully',
			data: deletedData,
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.deleteByLinkedId = async (req, res, next) => {
	try {
		console.log('innnn');
		const { linked_id } = req.body;
		let { fromDate } = req.body;
		fromDate = new Date(fromDate);
		const classLinked = await sessionModel.find({ linked_id });
		for (const ele of classLinked) {
			if (ele.session_start_Date[0] >= fromDate) {
				await sessionModel.findByIdAndDelete(ele._id);
			}
		}
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'all class from date deleted successfully',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.instituteReport = catchAsync(async (req, res, next) => {
	const { instituteId } = req.params;
	let report;
	const cacheKey = `sessionreport:institute:${instituteId}`;
	const cachedData = await redisClient.GET(cacheKey);

	if (!instituteId) {
		return next(new ErrorResponse('Please provide institute id', 400));
	}

	const reportQuery = schoolModel.aggregate([
		{
			$match: {
				$and: [
					{
						institute_id: mongoose.Types.ObjectId(instituteId),
					},
					{
						session_start_Date: {
							$lte: new Date(),
						},
					},
				],
			},
		},
		{
			$unwind: '$schools',
		},
		{
			$group: {
				_id: '$schools',
				totalSessions: {
					$sum: 1,
				},
				attendedStudents: {
					$push: '$student_join_session',
				},
				attendedUsers: {
					$push: '$teacher_join_session',
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					school_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$school_id', '$$school_id'],
							},
						},
					},
					{
						$group: {
							_id: null,
							totalStudents: {
								$sum: 1,
							},
						},
					},
					{
						$project: {
							_id: 0,
							totalStudents: 1,
						},
					},
				],
				as: 'totalStudents',
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					school_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$school_id', '$$school_id'],
							},
						},
					},
					{
						$group: {
							_id: null,
							totalTeachers: {
								$sum: 1,
							},
						},
					},
					{
						$project: {
							_id: 0,
							totalTeachers: 1,
						},
					},
				],
				as: 'totalTeachers',
			},
		},
		{
			$project: {
				_id: 1,
				totalStudents: 1,
				totalTeachers: 1,
				totalSessions: 1,
				attendedStudents: {
					$reduce: {
						input: '$attendedStudents',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
				attendedTeachers: {
					$reduce: {
						input: '$attendedUsers',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
			},
		},
		{
			$unwind: '$totalStudents',
		},
		{
			$unwind: '$totalTeachers',
		},
		{
			$project: {
				totalSessions: 1,
				totalStudents: '$totalStudents.totalStudents',
				totalTeachers: '$totalTeachers.totalTeachers',
				attendedStudents: {
					$size: {
						$filter: {
							input: '$attendedStudents',
							as: 'item',
							cond: {
								$eq: ['$$item.school_id', '$_id'],
							},
						},
					},
				},
				attendedTeachers: {
					$size: {
						$filter: {
							input: '$attendedTeachers',
							as: 'item',
							cond: {
								$eq: ['$$item.school_id', '$_id'],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school_id: '$_id',
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
							schoolImage: 1,
							city: 1,
							state: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: '$_id',
		},
		{
			$lookup: {
				from: 'states',
				let: {
					state_id: '$_id.state',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$state_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							state_name: 1,
						},
					},
				],
				as: 'state',
			},
		},
		{
			$lookup: {
				from: 'cities',
				let: {
					city_id: '$_id.city',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$city_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							city_name: 1,
						},
					},
				],
				as: 'city',
			},
		},
		{
			$project: {
				_id: 0,
				schoolId: '$_id._id',
				schoolName: '$_id.schoolName',
				schoolImage: '$_id.schoolImage',
				city: {
					$arrayElemAt: ['$city', 0],
				},
				state: {
					$arrayElemAt: ['$state', 0],
				},
				totalSessions: 1,
				totalUsers: {
					$sum: ['$totalStudents', '$totalTeachers'],
				},
				attendedUsers: {
					$sum: ['$attendedStudents', '$attendedTeachers'],
				},
			},
		},
	]);

	if (!cachedData) {
		report = await reportQuery;

		await redisClient.SET(cacheKey, JSON.stringify(report), {
			EX: 60 * 60 * 24, // 1 day
		});
	} else {
		report = JSON.parse(cachedData);
	}

	res.status(200).json(SuccessResponse(report, 0, 'success'));
});

exports.schoolStudentsReport = catchAsync(async (req, res, next) => {
	const { schoolId } = req.params;
	const limit = req.query.limit ? parseInt(req.query.limit) : 10;
	const skip = req.query.page ? parseInt(req.query.page) * limit : 0;

	if (!schoolId) {
		return next(new ErrorResponse('Please provide school id', 400));
	}

	const sessions = await studentModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
			},
		},
		{ $skip: skip },
		{ $limit: limit },
		{
			$lookup: {
				from: 'sessions',
				let: { studentId: '$_id' },
				pipeline: [
					{
						$match: {
							schools: { $in: [mongoose.Types.ObjectId(schoolId)] },
							session_start_Date: { $lte: new Date() },
						},
					},
					{
						$group: {
							_id: null,
							total: {
								$sum: 1,
							},
							attended: {
								$sum: {
									$cond: [
										{
											$eq: [
												{
													$first: '$student_join_session.student_id',
												},
												'$$studentId',
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
							_id: 0,
							total: 1,
							attended: 1,
							average: {
								$multiply: [
									{
										$divide: ['$attended', '$total'],
									},
									100,
								],
							},
						},
					},
				],
				as: 'session',
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
				profile_image: 1,
				total: {
					$ifNull: [{ $first: '$session.total' }, 0],
				},
				attended: {
					$ifNull: [{ $first: '$session.attended' }, 0],
				},
				average: {
					$ifNull: [{ $first: '$session.average' }, 0],
				},
			},
		},
	]);

	res.status(200).json(SuccessResponse(sessions, 0, 'success'));
});

exports.schoolTeachersReport = catchAsync(async (req, res, next) => {
	const { schoolId } = req.params;
	const limit = req.query.limit ? parseInt(req.query.limit) : 10;
	const skip = req.query.page ? parseInt(req.query.page) * limit : 0;

	if (!schoolId) {
		return next(new ErrorResponse('Please provide school id', 400));
	}

	const sessions = await userModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
			},
		},
		{ $skip: skip },
		{ $limit: limit },
		{
			$lookup: {
				from: 'sessions',
				let: {
					teacherId: '$_id',
				},
				pipeline: [
					{
						$match: {
							schools: { $in: [mongoose.Types.ObjectId(schoolId)] },
							session_start_Date: { $lte: new Date() },
						},
					},
					{
						$group: {
							_id: null,
							total: {
								$sum: 1,
							},
							attended: {
								$sum: {
									$cond: [
										{
											$eq: [
												{
													$first: '$teacher_join_session.teacher_id',
												},
												'$$teacherId',
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
							_id: 0,
							total: 1,
							attended: 1,
							average: {
								$multiply: [
									{
										$divide: ['$attended', '$total'],
									},
									100,
								],
							},
						},
					},
				],
				as: 'session',
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
				profile_image: 1,
				total: {
					$ifNull: [{ $first: '$session.total' }, 0],
				},
				attended: {
					$ifNull: [{ $first: '$session.attended' }, 0],
				},
				average: {
					$ifNull: [{ $first: '$session.average' }, 0],
				},
			},
		},
	]);

	res.status(200).json(SuccessResponse(sessions, 0, 'success'));
});
