/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
const mongoose = require('mongoose');
const request = require('request');
const axios = require('axios').default;
const excel = require('excel4node');
const moment = require('moment');

const AttendanceModel = require('../model/attendance');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const firebaseNoti = require('../firebase');
const sectionModel = require('../model/section');
const classModel = require('../model/class');
const schoolModel = require('../model/school');

const successResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const AttendanceReportModel = require('../model/attendanceReport');
const StudentModel = require('../model/student');
const SuccessResponse = require('../utils/successResponse');

const redisClient = require('../config/redisClient');
const Attendance = require('../model/attendance');

const { SMS_LAB_AUTHKEY, SMS_LAB_SENDERA, SMS_LAB_DLT_TE_IDA } = process.env;

function getWeekDates(date) {
	let startDate = new Date(date);
	startDate.setDate(startDate.getDate() - startDate.getDay());
	startDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate()
	);
	let endDate = new Date(date);
	endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
	endDate = new Date(
		endDate.getFullYear(),
		endDate.getMonth(),
		endDate.getDate()
	);
	return { startDate, endDate };
}
function getDaysInMonth(month, year) {
	const date = new Date(year, month, 1);
	const days = [];
	while (date.getMonth() === month) {
		days.push(new Date(date));
		date.setDate(date.getDate() + 1);
	}
	return days;
}
async function processLastDay(schoolId, classId, sectionId, date) {
	let startDate;
	let endDate;
	if (date) {
		({ startDate, endDate } = getWeekDates(date));
	} else {
		const currentDate = date ? new Date(date) : new Date();
		startDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate()
		);
		startDate.setDate(startDate.getDate() - 8);
		endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 7);
		endDate.setHours(23, 59, 59, 999);
	}
	const matchQuery = {
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	};
	if (schoolId) {
		matchQuery.school_id = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		matchQuery.class_id = mongoose.Types.ObjectId(classId);
	}
	if (sectionId) {
		matchQuery.section_id = mongoose.Types.ObjectId(sectionId);
	}

	const records = await AttendanceModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				date: -1,
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					school_id: '$school_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				school_id: {
					$first: '$_id.school_id',
				},
				class_id: {
					$first: '$_id.class_id',
				},
				section_id: {
					$first: '$_id.section_id',
				},
				lastWeek: {
					$push: '$totalStudents',
				},
			},
		},
	]);
	return records;
}
function ProcessLastWeekDates(lastWeekData) {
	let startDate = null;
	let endDate = null;

	const currentDate = new Date();
	startDate = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth(),
		currentDate.getDate()
	);
	startDate.setDate(startDate.getDate() - 8);
	endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 6);
	endDate.setHours(23, 59, 59, 999);

	const formatedLastWeekData = lastWeekData.map(obj => {
		const formatedWeekArr = [];

		function addDays(dt, days) {
			const dat = new Date(dt.valueOf());
			dat.setDate(dat.getDate() + days);
			return dat;
		}

		function getDates(sDate, stopDate) {
			const dateArray = [];
			let cDate = sDate;
			while (cDate <= stopDate) {
				dateArray.push(cDate);
				cDate = addDays(cDate, 1);
			}
			return dateArray;
		}

		const allDates = getDates(startDate, endDate);

		allDates.forEach(dt => {
			const found = obj.lastWeek.find(dateObj => {
				const i = new Date(dateObj.date);
				const j = new Date(dt);

				return i.getDate() == j.getDate();
			});

			if (found) {
				formatedWeekArr.push(found);
			} else {
				formatedWeekArr.push(null);
			}
		});

		return {
			...obj,
			lastWeek: formatedWeekArr,
		};
	});
	return { formatedLastWeekData };
}

function processStudentReport(reports, lastWeekData) {
	const data = [];
	for (const report of reports) {
		for (const att of report.attendanceDetails) {
			data.push({
				...report,
				...{ attendanceDetails: att },
			});
		}
	}
	const students = [];
	for (const student of data) {
		if (student.attendanceDetails.student_id) {
			const index = students.findIndex(
				x => x._id == student.attendanceDetails.student_id._id
			);
			const lastWeekIndex = lastWeekData.findIndex(
				x => x && `${x._id}` == `${student.attendanceDetails.student_id._id}`
			);
			if (index == -1) {
				students.push({
					_id: student.attendanceDetails.student_id._id,
					name: student.attendanceDetails.student_id.name,
					profile_image: student.attendanceDetails.student_id.profile_image,
					username: student.attendanceDetails.student_id.username,
					section_id: student.section_id,
					class_id: student.class_id,
					school_id: student.school_id,
					total: 1,
					present: 0,
					presentPercentage: 0,
					absent: 0,
					absentPercentage: 0,
					late: 0,
					latePercentage: 0,
					excuse: 0,
					excusePercentage: 0,
					attendanceDetails: [
						{
							date: student.date,
							status: student.attendanceDetails.status,
						},
					],
					lastWeek:
						lastWeekIndex != -1 ? lastWeekData[lastWeekIndex].lastWeek : [], // Array(8).fill(null)
				});
			} else {
				students[index].attendanceDetails.push({
					date: student.date,
					status: student.attendanceDetails.status,
				});
			}
		} else {
			delete student;
		}
	}
	for (const student of students) {
		student.total = student.attendanceDetails.length;
		for (const attendance of student.attendanceDetails) {
			switch (attendance.status) {
				case 'Present':
					student.present++;
					break;
				case 'Absent':
					student.absent++;
					break;
				case 'Late':
					student.late++;
					break;
				case 'Partial_Absent':
					student.excuse++;
					break;
				default:
					break;
			}
		}
	}
	for (const student of students) {
		student.presentPercentage =
			student.present == 0 ? 0 : (student.present / student.total) * 100;
		student.absentPercentage =
			student.absent == 0 ? 0 : (student.absent / student.total) * 100;
		student.latePercentage =
			student.late == 0 ? 0 : (student.late / student.total) * 100;
		student.excusePercentage =
			student.excuse == 0 ? 0 : (student.excuse / student.total) * 100;
	}
	return students;
}

function processClassStudentReport(students) {
	const classes = [];
	for (const student of students) {
		const index = classes.findIndex(x => x._id == student.class_id._id);
		if (index == -1) {
			classes.push({
				_id: student.class_id._id,
				name: student.class_id.name,
				school_id: student.school_id,
				totalStudent: students.length,
				total: student.total,
				present: student.present,
				presentPercentage: 0,
				absent: student.absent,
				absentPercentage: 0,
				late: student.late,
				latePercentage: 0,
				excuse: student.excuse,
				excusePercentage: 0,
				students: [student],
			});
		} else {
			classes[index].students.push(student);
			classes[index].total += student.total;
			classes[index].present += student.present;
			classes[index].absent += student.absent;
			classes[index].late += student.late;
			classes[index].excuse += student.excuse;
		}
	}
	for (const $class of classes) {
		$class.presentPercentage =
			$class.present == 0 ? 0 : ($class.present / $class.total) * 100;
		$class.absentPercentage =
			$class.absent == 0 ? 0 : ($class.absent / $class.total) * 100;
		$class.latePercentage =
			$class.late == 0 ? 0 : ($class.late / $class.total) * 100;
		$class.excusePercentage =
			$class.excuse == 0 ? 0 : ($class.excuse / $class.total) * 100;
	}
	return classes;
}

exports.GetAll = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			AttendanceModel.find({})
				.populate({ path: 'class_teacher', select: 'name profile_image' })
				.populate({
					path: 'attendance_takenBy_teacher',
					select: 'name profile_image',
				})
				.populate({
					path: 'attendanceDetails.student_id',
					select: 'name profile_image _id class section',
				})
				.populate({
					path: 'class_id school_id section_id',
					select: '_id name',
				}),
			req.query
		)
			.filter()
			.sort()
			.paginate();
		const classDetails = await features.query;

		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Success',
			records: classDetails.length,
			data: classDetails,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			statusCode: 400,
			message: error.message,
		});
	}
};

exports.deleteStudents = async (req, res, next) => {
	try {
		const attendances = await AttendanceModel.find().populate(
			'attendanceDetails.student_id',
			'_id'
		);
		const attendancesEmpty = [];
		for (const artte of attendances) {
			for (const attendanceDetails1 of artte.attendanceDetails) {
				if (!attendanceDetails1.student_id) {
					attendancesEmpty.push(`${attendanceDetails1._id}`);
				}
			}
		}

		const attendances1 = await AttendanceModel.find({
			'attendanceDetails._id': { $in: attendancesEmpty },
		});
		const studentsIds = [];
		for (const artte of attendances1) {
			for (const attendanceDetails1 of artte.attendanceDetails) {
				if (attendancesEmpty.includes(`${attendanceDetails1._id}`)) {
					studentsIds.push(attendanceDetails1.student_id);
				}
			}
		}

		await Promise.all(
			studentsIds.map(
				studentId =>
					new Promise(async (resolve, reject) => {
						await AttendanceModel.updateMany(
							{
								'attendanceDetails.student_id': studentId,
							},
							{ $pull: { attendanceDetails: { student_id: studentId } } }
						);
						return resolve();
					})
			)
		);

		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Deleted successfully',
			data: studentsIds,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			statusCode: 400,
			message: error.message,
		});
	}
};

exports.MonthlySchoolReport = catchAsync(async (req, res, next) => {
	let { schoolId, startDate, endDate } = req.query;

	if (!schoolId || !startDate || !endDate) {
		return next(
			new ErrorResponse('Please provide schoolId & startDate & endDate', 400)
		);
	}
	startDate = new Date(startDate);
	endDate = new Date(endDate);
	startDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate()
	);
	endDate = new Date(
		endDate.getFullYear(),
		endDate.getMonth(),
		endDate.getDate()
	);

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();

	const Monthdata = processSchoolReport(reports);
	res.status(200).json(successResponse(Monthdata, Monthdata.length));
});

exports.GetSchoolMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, date } = req.query;

	if (!schoolId || !date) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}

	const startDate = new Date(date);
	startDate.setHours(20, 20, 20, 999);

	const month = startDate.getUTCMonth() + 1;
	const year = startDate.getUTCFullYear();

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		$expr: {
			$and: [
				{ $eq: [{ $year: '$date' }, year] },
				{ $eq: [{ $month: '$date' }, month] },
			],
		},
	})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();

	const data = processSchoolReport(reports);
	res.status(200).json(successResponse(data, data.length));
});

function processSchoolReport(reports) {
	const sections = [];
	for (const report of reports) {
		const total = report.attendanceDetails.length;
		let present = 0;
		let absent = 0;
		let late = 0;
		let excuse = 0;
		for (const attendance of report.attendanceDetails) {
			switch (attendance.status) {
				case 'Present':
					present++;
					break;
				case 'Absent':
					absent++;
					break;
				case 'Late':
					late++;
					break;
				case 'Partial_Absent':
					excuse++;
					break;
				default:
					break;
			}
		}
		// let attendaceData = {
		// 	date: section.date,
		// 	total: total,
		// 	total: total,
		// 	present: present,
		// 	absent: absent,
		// 	late: late,
		// 	excuse: excuse
		// }
		const index = sections.findIndex(x => x._id == report.section_id._id);
		if (index == -1) {
			sections.push({
				_id: report.section_id._id,
				name: report.section_id.name,
				class_id: report.class_id,
				school_id: report.school_id,
				totalStudent: total,
				total,
				present,
				presentPercentage: 0,
				absent,
				absentPercentage: 0,
				late,
				latePercentage: 0,
				excuse,
				excusePercentage: 0,
				// data: [attendaceData]
			});
		} else {
			// sections[index].data.push(attendaceData);
			if (total > sections[index].totalStudent) {
				sections[index].totalStudent = total;
			}
			sections[index].total += total;
			sections[index].present += present;
			sections[index].absent += absent;
			sections[index].late += late;
			sections[index].excuse += excuse;
		}
	}
	for (const section of sections) {
		section.presentPercentage =
			section.present == 0 ? 0 : (section.present / section.total) * 100;
		section.absentPercentage =
			section.absent == 0 ? 0 : (section.absent / section.total) * 100;
		section.latePercentage =
			section.late == 0 ? 0 : (section.late / section.total) * 100;
		section.excusePercentage =
			section.excuse == 0 ? 0 : (section.excuse / section.total) * 100;
	}
	const classes = [];
	for (const section of sections) {
		const index = classes.findIndex(x => x._id == section.class_id._id);
		if (index == -1) {
			classes.push({
				_id: section.class_id._id,
				name: section.class_id.name,
				school_id: section.school_id,
				totalStudent: section.totalStudent,
				total: section.total,
				present: section.present,
				presentPercentage: 0,
				absent: section.absent,
				absentPercentage: 0,
				late: section.late,
				latePercentage: 0,
				excuse: section.excuse,
				excusePercentage: 0,
				sections: [section],
			});
		} else {
			classes[index].sections.push(section);
			classes[index].totalStudent += section.totalStudent;
			classes[index].total += section.total;
			classes[index].present += section.present;
			classes[index].absent += section.absent;
			classes[index].late += section.late;
			classes[index].excuse += section.excuse;
		}
	}
	for (const $class of classes) {
		$class.presentPercentage =
			$class.present == 0 ? 0 : ($class.present / $class.total) * 100;
		$class.absentPercentage =
			$class.absent == 0 ? 0 : ($class.absent / $class.total) * 100;
		$class.latePercentage =
			$class.late == 0 ? 0 : ($class.late / $class.total) * 100;
		$class.excusePercentage =
			$class.excuse == 0 ? 0 : ($class.excuse / $class.total) * 100;
	}
	const schools = [];
	for (const $class of classes) {
		const index = schools.findIndex(x => x._id == $class.school_id._id);
		if (index == -1) {
			schools.push({
				_id: $class.school_id._id,
				name: $class.school_id.schoolName,
				totalStudent: $class.totalStudent,
				total: $class.total,
				present: $class.present,
				presentPercentage: 0,
				absent: $class.absent,
				absentPercentage: 0,
				late: $class.late,
				latePercentage: 0,
				excuse: $class.excuse,
				excusePercentage: 0,
				classes: [$class],
			});
		} else {
			schools[index].classes.push($class);
			schools[index].totalStudent += $class.totalStudent;
			schools[index].total += $class.total;
			schools[index].present += $class.present;
			schools[index].absent += $class.absent;
			schools[index].late += $class.late;
			schools[index].excuse += $class.excuse;
		}
	}
	for (const school of schools) {
		school.presentPercentage =
			school.present == 0 ? 0 : (school.present / school.total) * 100;
		school.absentPercentage =
			school.absent == 0 ? 0 : (school.absent / school.total) * 100;
		school.latePercentage =
			school.late == 0 ? 0 : (school.late / school.total) * 100;
		school.excusePercentage =
			school.excuse == 0 ? 0 : (school.excuse / school.total) * 100;
	}
	return schools;
}

exports.GetClassMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, date } = req.query;

	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}

	const startDate = new Date(date);
	startDate.setHours(20, 20, 20, 999);

	const month = startDate.getUTCMonth() + 1;
	const year = startDate.getUTCFullYear();

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		$expr: {
			$and: [
				{ $eq: [{ $year: '$date' }, year] },
				{ $eq: [{ $month: '$date' }, month] },
			],
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId);
	const students = processStudentReport(reports, lastWeekData);
	const classes = processClassStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSectionMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !sectionId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}

	const startDate = new Date(date);
	startDate.setHours(20, 20, 20, 999);

	const month = startDate.getUTCMonth() + 1;
	const year = startDate.getUTCFullYear();

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		$expr: {
			$and: [
				{ $eq: [{ $year: '$date' }, year] },
				{ $eq: [{ $month: '$date' }, month] },
			],
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);
	const students = processStudentReport(reports, lastWeekData);
	const sections = processSectionStudentReport(students);
	res.status(200).json(successResponse(sections, sections.length));
});

function processSectionStudentReport(students) {
	const sections = [];
	for (const student of students) {
		const index = sections.findIndex(x => x._id == student.section_id._id);
		if (index == -1) {
			sections.push({
				_id: student.section_id._id,
				name: student.section_id.name,
				class_id: student.class_id,
				school_id: student.school_id,
				totalStudent: students.length,
				total: student.total,
				present: student.present,
				presentPercentage: 0,
				absent: student.absent,
				absentPercentage: 0,
				late: student.late,
				latePercentage: 0,
				excuse: student.excuse,
				excusePercentage: 0,
				students: [student],
			});
		} else {
			sections[index].students.push(student);
			sections[index].total += student.total;
			sections[index].present += student.present;
			sections[index].absent += student.absent;
			sections[index].late += student.late;
			sections[index].excuse += student.excuse;
		}
	}
	for (const section of sections) {
		section.presentPercentage =
			section.present == 0 ? 0 : (section.present / section.total) * 100;
		section.absentPercentage =
			section.absent == 0 ? 0 : (section.absent / section.total) * 100;
		section.latePercentage =
			section.late == 0 ? 0 : (section.late / section.total) * 100;
		section.excusePercentage =
			section.excuse == 0 ? 0 : (section.excuse / section.total) * 100;
	}
	return sections;
}

exports.GetSchoolWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, date } = req.query;

	if (!schoolId || !date) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const { startDate, endDate } = getWeekDates(date);

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();

	const data = processSchoolReport(reports);
	res.status(200).json(successResponse(data, data.length));
});

exports.GetClassWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, date } = req.query;

	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse('Please provide schoolId & classId & date', 400)
		);
	}
	const { startDate, endDate } = getWeekDates(date);

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId);
	const students = processStudentReport(reports, lastWeekData);
	const classes = processClassStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSectionWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}
	const { startDate, endDate } = getWeekDates(date);

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);
	const students = processStudentReport(reports, lastWeekData);
	const classes = processSectionStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSectionMonthlyReportWeb = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !sectionId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}

	const { startDate, endDate } = getWeekDates(date);

	const month = startDate.getUTCMonth() + 1;
	const year = startDate.getUTCFullYear();

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		$expr: {
			$and: [
				{ $eq: [{ $year: '$date' }, year] },
				{ $eq: [{ $month: '$date' }, month] },
			],
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);
	const { formatedLastWeekData } = ProcessLastWeekDates(lastWeekData);
	const students = processStudentReport(reports, formatedLastWeekData);
	const sections = processSectionStudentReport(students);
	res.status(200).json(successResponse(sections, sections.length));
});

exports.getStudentMonthly = catchAsync(async (req, res, next) => {
	let { studentId, date } = req.query;
	date = new Date(date);
	const month = date.getUTCMonth() + 1;
	const year = date.getUTCFullYear();
	const lastMonthData = await Attendance.aggregate([
		{
			$match: {
				'attendanceDetails.student_id': mongoose.Types.ObjectId(studentId),
				$expr: {
					$and: [
						{
							$eq: [
								{
									$year: '$date',
								},
								year,
							],
						},
						{
							$eq: [
								{
									$month: '$date',
								},
								month,
							],
						},
					],
				},
			},
		},
		{
			$sort: {
				date: -1,
			},
		},
		{
			$project: {
				date: 1,
				attendanceDetails: {
					$filter: {
						input: '$attendanceDetails',
						as: 'item',
						cond: {
							$eq: ['$$item.student_id', mongoose.Types.ObjectId(studentId)],
						},
					},
				},
			},
		},
		{
			$unwind: {
				path: '$attendanceDetails',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: '$attendanceDetails.student_id',
				lastMonth: {
					$push: '$attendanceDetails',
				},
			},
		},
	]);
	const formattedlastMonthData = lastMonthData.map(obj => {
		const formattedMonthArr = [];

		const allDates = getDaysInMonth(month, year);

		allDates.forEach(dt => {
			const found = obj.lastMonth.find(dateObj => {
				const i = new Date(dateObj.date);
				const j = new Date(dt);

				return i.getDate() == j.getDate();
			});

			if (found) {
				formattedMonthArr.push(found);
			} else {
				formattedMonthArr.push(null);
			}
		});

		return formattedMonthArr;
	});
	res
		.status(200)
		.json(
			SuccessResponse(
				formattedlastMonthData,
				formattedlastMonthData.length,
				'Fetched SuccessFully'
			)
		);
});

exports.GetSectionWeeklyReportWeb = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}
	const { startDate, endDate } = getWeekDates(date);

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);
	const { formatedLastWeekData } = ProcessLastWeekDates(lastWeekData);
	const students = processStudentReport(reports, formatedLastWeekData);
	const classes = processSectionStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSchoolDailyReport = catchAsync(async (req, res, next) => {
	let { schoolId, date } = req.query;

	if (!schoolId || !date) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}

	date = new Date(date);
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		date,
	})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();

	const data = processSchoolReport(reports);
	res.status(200).json(successResponse(data, data.length));
});

exports.GetClassDailyReport = catchAsync(async (req, res, next) => {
	let { schoolId, classId, date } = req.query;

	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse('Please provide schoolId & classId & date', 400)
		);
	}

	date = new Date(date);
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		date,
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();

	const lastWeekData = await processLastDay(schoolId, classId);
	const students = processStudentReport(reports, lastWeekData);
	const classes = processClassStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSectionDailyReport = catchAsync(async (req, res, next) => {
	let { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !sectionId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}

	date = new Date(date);
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date,
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);
	const students = processStudentReport(reports, lastWeekData);
	const classes = processSectionStudentReport(students);
	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetSectionDailyReportWeb = catchAsync(async (req, res, next) => {
	let { schoolId, classId, sectionId, date } = req.query;

	if (!schoolId || !classId || !sectionId || !date) {
		return next(
			new ErrorResponse(
				'Please provide schoolId & classId & sectionId & date',
				400
			)
		);
	}

	date = new Date(date);
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const reports = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date,
	})
		.populate({
			path: 'attendanceDetails.student_id',
			select: 'name profile_image _id username',
		})
		.populate({
			path: 'class_id school_id section_id',
			select: '_id name schoolName',
		})
		.lean();
	const lastWeekData = await processLastDay(schoolId, classId, sectionId);

	const { formatedLastWeekData } = ProcessLastWeekDates(lastWeekData);

	const students = processStudentReport(reports, formatedLastWeekData);
	const classes = processSectionStudentReport(students);

	res.status(200).json(successResponse(classes, classes.length));
});

exports.GetExcelSchoolDailyReport = catchAsync(async (req, res, next) => {
	const { schoolId, date } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !date) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateM = new Date(date);
	const startDate = new Date(date);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(date);
	endDate.setHours(23, 59, 59, 999);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				class_id: '$class_id',
				section_id: '$section_id',
				school_id: '$school_id',
				present: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
				absent: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$section_id',
				class_id: {
					$first: '$class_id',
				},
				section_id: {
					$first: '$section_id',
				},
				school_id: {
					$first: '$school_id',
				},
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: 'section_id',
				foreignField: '_id',
				as: 'sectionId',
			},
		},
		{
			$unwind: {
				path: '$sectionId',
			},
		},
		{
			$lookup: {
				from: 'classes',
				localField: 'class_id',
				foreignField: '_id',
				as: 'classId',
			},
		},
		{
			$unwind: {
				path: '$classId',
			},
		},
		{
			$project: {
				sectionId: '$sectionId',
				schoolId: '$school_id',
				classId: '$classId',
				present: '$present',
				absent: '$absent',
				late: '$late',
				partial: '$partial',
			},
		},
		{
			$group: {
				_id: '$classId',
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$sort: {
				'_id.sequence_number': 1,
			},
		},
	]);

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Daily');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateM.toLocaleString('default', { month: 'long' })}`);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet
		.cell(4, 2)
		.string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', { month: 'long' })}`
		);
	worksheet
		.cell(4, 3, 4, 4, true)
		.string(
			`${dateM.toLocaleDateString('default', {
				weekday: 'long',
			})},${dateM.toLocaleString('default', {
				month: 'long',
			})} ${dateM.getDate()}, ${dateM.getFullYear()} `
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(5, 2).string('Present %').style(style);
	worksheet.cell(5, 3).string('Present Count').style(style);
	worksheet.cell(5, 4).string('Total Count').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 6;
	let col = 1;
	reports.forEach(async ele => {
		const totalStudents = await StudentModel.find({
			school_id: schoolId,
			class: ele._id._id,
		}).count();
		worksheet.cell(row, col).string(`${ele._id.name}`);
		worksheet
			.cell(row, col + 1)
			.number(parseFloat(((ele.present / totalStudents) * 100).toFixed(2)));
		worksheet.cell(row, col + 2).number(ele.present);
		worksheet.cell(row, col + 3).number(totalStudents);
		row += 1;
		col = 1;
	});
	let classReport = await AttendanceModel.find({
		school_id: schoolId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('section_id', 'name')
		.populate('class_id', 'name sequence_number')
		.populate('attendanceDetails.student_id', 'name')
		.select('class_id section_id attendanceDetails');

	classReport = JSON.parse(JSON.stringify(classReport));
	classReport = classReport.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	classReport.forEach(ele => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele.class_id.name} ${ele.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		// row 3
		worksheet1.cell(3, 1).string('Date:').style(style);
		worksheet1
			.cell(3, 2, 3, 3, true)
			.string(
				`${dateM.toLocaleDateString('default', {
					weekday: 'long',
				})},${dateM.toLocaleString('default', {
					month: 'long',
				})} ${dateM.getDate()}, ${dateM.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		// row 4
		worksheet1.cell(4, 1).string('Total Strength :').style(style);

		worksheet1.cell(5, 1).string('SL No :').style(style);
		worksheet1.cell(5, 2).string('Student Name').style(style);
		worksheet1.cell(5, 3).string('Attendance').style(style);
		worksheet1.cell(5, 4).string('Type').style(style);
		const presentCount = ele.attendanceDetails.filter(
			ele1 =>
				ele1.status == 'Late' ||
				ele1.status == 'Partial_Absent' ||
				ele1.status == 'Present'
		);
		const absentCount = ele.attendanceDetails.filter(
			ele1 => ele1.status == 'Absent'
		);
		row = 6;
		col = 1;
		let count = 0;
		ele.attendanceDetails.forEach(ele1 => {
			count += 1;
			worksheet1.cell(row, col).number(count);

			worksheet1
				.cell(row, col + 1)
				.string(`${ele1.student_id? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 2)
				.string(
					`${
						ele1.status == 'Late' || ele1.status == 'Partial_Absent'
							? 'Present'
							: ele1.status
					}`
				);
			worksheet1
				.cell(row, col + 3)
				.string(
					`${
						ele1.status == 'Present' || ele1.status == 'Absent' ? '' : 'Excuss'
					}`
				);
			row += 1;
			col = 1;
		});
		worksheet1.cell(4, 2).number(count);
		worksheet1.cell(4, 3).string('Total Present :').style(style);
		worksheet1.cell(4, 4).number(presentCount.length);
		worksheet1.cell(4, 5).string('Total Absent :').style(style);
		worksheet1.cell(4, 6).number(absentCount.length);
	});

	// workbook.write('SchoolDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelStudentMonthlyReport = catchAsync(async (req, res, next) => {
	const { studentId, date } = req.query;
	const schoolData = await StudentModel.findById(studentId)
		.select('school_id')
		.populate('school_id', 'schoolName');
	if (!studentId) {
		return next(new ErrorResponse('Please provide studentID ', 400));
	}
	const dateM = new Date(date);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				'attendanceDetails.student_id': mongoose.Types.ObjectId(studentId),
				$expr: {
					$eq: [
						{
							$month: '$date',
						},
						{
							$month: dateM,
						},
					],
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
				student_id: mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
					student_id: '$student_id',
				},
				totalStudents: {
					$push: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.student_id', '$student_id'],
							},
						},
					},
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$first: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						late_count: '$late_count',
						partial_count: '$partial_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
									late_comment: '$$item.late_comment',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				'attendanceDetails.class_id': '$_id.class_id',
				'attendanceDetails.section_id': '$_id.section_id',
				'attendanceDetails.total': {
					$add: [
						'$attendanceDetails.present_count',
						'$attendanceDetails.absent_count',
						'$attendanceDetails.late_count',
						'$attendanceDetails.partial_count',
					],
				},
			},
		},
		{
			$replaceRoot: {
				newRoot: '$attendanceDetails',
			},
		},
	]);
	const yearReports = await AttendanceModel.aggregate([
		{
			$match: {
				'attendanceDetails.student_id': mongoose.Types.ObjectId(studentId),
				$expr: {
					$eq: [
						{
							$year: '$date',
						},
						{
							$year: dateM,
						},
					],
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
				student_id: mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
					student_id: '$student_id',
				},
				totalStudents: {
					$push: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.student_id', '$student_id'],
							},
						},
					},
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$first: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						late_count: '$late_count',
						partial_count: '$partial_count',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				'attendanceDetails.class_id': '$_id.class_id',
				'attendanceDetails.section_id': '$_id.section_id',
				'attendanceDetails.total': {
					$add: [
						'$attendanceDetails.present_count',
						'$attendanceDetails.absent_count',
						'$attendanceDetails.late_count',
						'$attendanceDetails.partial_count',
					],
				},
			},
		},
		{
			$replaceRoot: {
				newRoot: '$attendanceDetails',
			},
		},
	]);

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet(`${reports[0].student_id.name}`);
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});
	worksheet.cell(1, 1).string('Student Name:').style(style);
	worksheet.cell(1, 2).string(`${reports[0].student_id.name}`).style(style);
	worksheet.cell(1, 3).string('Summary').style(style);

	worksheet.cell(2, 1).string('Report Type:').style(style);
	worksheet.cell(2, 2).string('Monthly');
	worksheet.cell(2, 3, 2, 4, true).string('Total Days Present:');
	worksheet
		.cell(2, 5)
		.string(`${yearReports[0].present_count}/${yearReports[0].total}`);

	worksheet.cell(3, 1).string('Month:').style(style);
	worksheet
		.cell(3, 2)
		.string(`${dateM.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(3, 3, 3, 4, true).string('Month present');
	worksheet
		.cell(3, 5)
		.string(`${reports[0].present_count}/${reports[0].total}`);

	// row 3
	worksheet.cell(4, 1).string('School Name :').style(style);
	worksheet.cell(4, 2).string(`${schoolData.school_id.schoolName}`);

	// row 4
	worksheet
		.cell(4, 4)
		.string('Late')
		.style({ alignment: { horizontal: 'center' } });
	worksheet
		.cell(4, 5)
		.string(`${reports[0].late_count}`)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(5, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string(
		`${dateM.getDate()} ${dateM.toLocaleString('default', {
			month: 'long',
		})}`
	);
	worksheet
		.cell(5, 4)
		.string('Excuse')
		.style({ alignment: { horizontal: 'center' } });
	worksheet
		.cell(5, 5)
		.string(`${reports[0].partial_count}`)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(7, 1).string('Day').style(style);
	worksheet.cell(7, 2).string('Date').style(style);
	worksheet.cell(7, 3).string('Attendance').style(style);
	worksheet.cell(7, 4).string('Type').style(style);
	worksheet.cell(7, 5).string('Comment').style(style);

	// row 8
	let row = 8;
	let col = 1;
	reports[0].attendanceDetails.forEach(async ele => {
		worksheet.cell(row, col).string(
			`${ele.date.toLocaleDateString('default', {
				weekday: 'long',
			})}`
		);
		worksheet
			.cell(row, col + 1)
			.string(
				`${ele.date.getUTCDate()}-${
					ele.date.getUTCMonth() + 1
				}-${ele.date.getUTCFullYear()}`
			);
		worksheet
			.cell(row, col + 2)
			.string(
				`${
					ele.status == 'Late' ||
					ele.status == 'Partial_Absent' ||
					ele.status == 'Present'
						? 'Present'
						: ele.status
				}`
			);
		worksheet
			.cell(row, col + 3)
			.string(
				`${ele.status == 'Present' || ele.status == 'Absent' ? '' : 'Excuss'}`
			);
		worksheet
			.cell(row, col + 4)
			.string(`${ele.late_comment ? ele.late_comment : ''}`);
		row += 1;
		col = 1;
	});

	// workbook.write('StudentMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelStudentWeeklyReport = catchAsync(async (req, res, next) => {
	let { studentId, startDate, endDate } = req.query;
	const schoolData = await StudentModel.findById(studentId)
		.select('school_id')
		.populate('school_id', 'schoolName');
	if (!studentId || !startDate || !endDate) {
		return next(
			new ErrorResponse('Please provide studentID, startDate, endDate ', 400)
		);
	}
	const dateM = new Date();
	startDate = new Date(startDate);
	endDate = new Date(endDate);
	endDate.setHours(23, 59, 59, 999);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				'attendanceDetails.student_id': mongoose.Types.ObjectId(studentId),
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$sort: {
				date: 1,
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
				student_id: mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
					student_id: '$student_id',
				},
				totalStudents: {
					$push: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.student_id', '$student_id'],
							},
						},
					},
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$first: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						late_count: '$late_count',
						partial_count: '$partial_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
									late_comment: '$$item.late_comment',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				'attendanceDetails.class_id': '$_id.class_id',
				'attendanceDetails.section_id': '$_id.section_id',
				'attendanceDetails.total': {
					$add: [
						'$attendanceDetails.present_count',
						'$attendanceDetails.absent_count',
						'$attendanceDetails.late_count',
						'$attendanceDetails.partial_count',
					],
				},
			},
		},
		{
			$replaceRoot: {
				newRoot: '$attendanceDetails',
			},
		},
	]);
	const yearReports = await AttendanceModel.aggregate([
		{
			$match: {
				'attendanceDetails.student_id': mongoose.Types.ObjectId(studentId),
				$expr: {
					$eq: [
						{
							$year: '$date',
						},
						{
							$year: new Date(),
						},
					],
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
				student_id: mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
					student_id: '$student_id',
				},
				totalStudents: {
					$push: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.student_id', '$student_id'],
							},
						},
					},
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$first: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						late_count: '$late_count',
						partial_count: '$partial_count',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				'attendanceDetails.class_id': '$_id.class_id',
				'attendanceDetails.section_id': '$_id.section_id',
				'attendanceDetails.total': {
					$add: [
						'$attendanceDetails.present_count',
						'$attendanceDetails.absent_count',
						'$attendanceDetails.late_count',
						'$attendanceDetails.partial_count',
					],
				},
			},
		},
		{
			$replaceRoot: {
				newRoot: '$attendanceDetails',
			},
		},
	]);

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet(`${reports[0].student_id.name}`);
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});
	worksheet.cell(1, 1).string('Student Name:').style(style);
	worksheet.cell(1, 2).string(`${reports[0].student_id.name}`).style(style);
	worksheet.cell(1, 3, 1, 5, true).string('Summary').style(style);

	worksheet.cell(2, 1).string('Report Type:').style(style);
	worksheet.cell(2, 2).string('Weekly');
	worksheet.cell(2, 3, 2, 4, true).string('Total Days Present:');
	worksheet
		.cell(2, 5)
		.string(`${yearReports[0].present_count}/${yearReports[0].total}`);

	worksheet.cell(3, 1).string('Month:').style(style);
	worksheet
		.cell(3, 2)
		.string(`${dateM.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(3, 3, 3, 4, true).string('Month present');
	worksheet
		.cell(3, 5)
		.string(`${reports[0].present_count}/${reports[0].total}`);

	// row 4
	worksheet.cell(4, 1).string('School Name :').style(style);
	worksheet.cell(4, 2).string(`${schoolData.school_id.schoolName}`);

	worksheet
		.cell(4, 3, 4, 4, true)
		.string('Late')
		.style({ alignment: { horizontal: 'center' } });
	worksheet
		.cell(4, 5)
		.string(`${reports[0].late_count}`)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(5, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string(
		`${dateM.getDate()} ${dateM.toLocaleString('default', {
			month: 'long',
		})}`
	);
	worksheet
		.cell(5, 3, 5, 4, true)
		.string('Excuse')
		.style({ alignment: { horizontal: 'center' } });
	worksheet
		.cell(5, 5)
		.string(`${reports[0].partial_count}`)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(7, 1).string('Day').style(style);
	worksheet.cell(7, 2).string('Date').style(style);
	worksheet.cell(7, 3).string('Attendance').style(style);
	worksheet.cell(7, 4).string('Type').style(style);
	worksheet.cell(7, 5).string('Comment').style(style);

	// row 8
	let row = 8;
	let col = 1;
	reports[0].attendanceDetails.forEach(async ele => {
		worksheet.cell(row, col).string(
			`${ele.date.toLocaleDateString('default', {
				weekday: 'long',
			})}`
		);
		worksheet
			.cell(row, col + 1)
			.string(
				`${ele.date.getDate()}-${
					ele.date.getMonth() + 1
				}-${ele.date.getFullYear()}`
			);
		worksheet
			.cell(row, col + 2)
			.string(
				`${
					ele.status == 'Late' ||
					ele.status == 'Partial_Absent' ||
					ele.status == 'Present'
						? 'Present'
						: ele.status
				}`
			);
		worksheet
			.cell(row, col + 3)
			.string(
				`${ele.status == 'Present' || ele.status == 'Absent' ? '' : 'Excuss'}`
			);
		worksheet
			.cell(row, col + 4)
			.string(`${ele.late_comment ? ele.late_comment : ''}`);
		row += 1;
		col = 1;
	});

	// workbook.write('StudentWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelSchoolWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !startDate || !endDate) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				date: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Weekly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	worksheet.cell(4, 1).string('Date :').style(style);
	let col1 = 3;
	let date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.absentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		date1.setHours(0, 0, 0, 0);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		worksheet1.cell(3, 1).string('Date:').style(style);
		// row 3
		col1 = 3;
		date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No :').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				date1.setHours(0, 0, 0, 0);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});

	workbook.write('SchoolWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
	// res.status(200).json(successResponse(reports, reports.length));
});

exports.GetExcelSectionWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate, sectionId, classId } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !sectionId || !classId || !startDate || !endDate) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				section_id: mongoose.Types.ObjectId(sectionId),
				date: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Weekly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	let col1 = 3;
	const date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		worksheet1.cell(3, 1).string('Date :').style(style);
		// row 3
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No:').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});

	// workbook.write('SectionWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelSectionMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate, sectionId, classId } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !sectionId || !classId || !startDate || !endDate) {
		return next(
			new ErrorResponse(
				'Please provide schoolId, classId, sectionId, startDate & endDate',
				400
			)
		);
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				section_id: mongoose.Types.ObjectId(sectionId),
				$expr: {
					$eq: [
						{
							$month: '$date',
						},
						{
							$month: new Date(),
						},
					],
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Monthly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	let col1 = 3;
	const date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		worksheet1.cell(3, 1).string('Date :').style(style);
		// row 3
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No :').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});

	// workbook.write('SectionMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelSectionDailyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !classId || !sectionId) {
		return next(
			new ErrorResponse('Please provide schoolId, classId, sectionId ', 400)
		);
	}
	const dateM = new Date();
	const startDate = new Date(dateM);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(dateM);
	endDate.setHours(23, 59, 59, 999);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				section_id: mongoose.Types.ObjectId(sectionId),
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				class_id: '$class_id',
				section_id: '$section_id',
				school_id: '$school_id',
				present: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
				absent: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$section_id',
				class_id: {
					$first: '$class_id',
				},
				section_id: {
					$first: '$section_id',
				},
				school_id: {
					$first: '$school_id',
				},
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: 'section_id',
				foreignField: '_id',
				as: 'sectionId',
			},
		},
		{
			$unwind: {
				path: '$sectionId',
			},
		},
		{
			$lookup: {
				from: 'classes',
				localField: 'class_id',
				foreignField: '_id',
				as: 'classId',
			},
		},
		{
			$unwind: {
				path: '$classId',
			},
		},
		{
			$project: {
				sectionId: '$sectionId',
				schoolId: '$school_id',
				classId: '$classId',
				present: '$present',
				absent: '$absent',
				late: '$late',
				partial: '$partial',
			},
		},
		{
			$group: {
				_id: '$classId',
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$sort: {
				'_id.sequence_number': 1,
			},
		},
	]);

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Daily');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateM.toLocaleString('default', { month: 'long' })}`);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet
		.cell(4, 2)
		.string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', { month: 'long' })}`
		);
	worksheet
		.cell(4, 3, 4, 4, true)
		.string(
			`${dateM.toLocaleDateString('default', {
				weekday: 'long',
			})},${dateM.toLocaleString('default', {
				month: 'long',
			})} ${dateM.getDate()}, ${dateM.getFullYear()} `
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(5, 2).string('Present %').style(style);
	worksheet.cell(5, 3).string('Present Count').style(style);
	worksheet.cell(5, 4).string('Total Count').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 6;
	let col = 1;
	reports.forEach(async ele => {
		const totalStudents = await StudentModel.find({
			school_id: schoolId,
			class: ele._id._id,
		}).countDocuments();
		worksheet.cell(row, col).string(`${ele._id.name}`);
		worksheet
			.cell(row, col + 1)
			.number(parseFloat(((ele.present / totalStudents) * 100).toFixed(2)));
		worksheet.cell(row, col + 2).number(ele.present);
		worksheet.cell(row, col + 3).number(totalStudents);
		row += 1;
		col = 1;
	});
	let classReport = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		section_id: sectionId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('section_id', 'name')
		.populate('class_id', 'name sequence_number')
		.populate('attendanceDetails.student_id', 'name')
		.select('class_id section_id attendanceDetails');

	classReport = JSON.parse(JSON.stringify(classReport));
	classReport = classReport.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	classReport.forEach(ele => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele.class_id.name} ${ele.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		// row 3
		worksheet1.cell(3, 1).string('Date:').style(style);
		worksheet1
			.cell(3, 2, 3, 3, true)
			.string(
				`${dateM.toLocaleDateString('default', {
					weekday: 'long',
				})},${dateM.toLocaleString('default', {
					month: 'long',
				})} ${dateM.getDate()}, ${dateM.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		// row 4
		worksheet1.cell(4, 1).string('Total Strength :').style(style);

		worksheet1.cell(5, 1).string('SL No :').style(style);
		worksheet1.cell(5, 2).string('Student Name').style(style);
		worksheet1.cell(5, 3).string('Attendance').style(style);
		worksheet1.cell(5, 4).string('Type').style(style);
		const presentCount = ele.attendanceDetails.filter(
			ele1 =>
				ele1.status == 'Late' ||
				ele1.status == 'Partial_Absent' ||
				ele1.status == 'Present'
		);
		const absentCount = ele.attendanceDetails.filter(
			ele1 => ele1.status == 'Absent'
		);
		row = 6;
		col = 1;
		let count = 0;
		ele.attendanceDetails.forEach(ele1 => {
			count += 1;
			worksheet1.cell(row, col).number(count);
			worksheet1
				.cell(row, col + 1)
				.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 2)
				.string(
					`${
						ele1.status == 'Late' || ele1.status == 'Partial_Absent'
							? 'Present'
							: ele1.status
					}`
				);
			worksheet1
				.cell(row, col + 3)
				.string(
					`${
						ele1.status == 'Present' || ele1.status == 'Absent' ? '' : 'Excuss'
					}`
				);
			row += 1;
			col = 1;
		});
		worksheet1.cell(4, 2).number(count);
		worksheet1.cell(4, 3).string('Total Present :').style(style);
		worksheet1.cell(4, 4).number(presentCount.length);
		worksheet1.cell(4, 5).string('Total Absent :').style(style);
		worksheet1.cell(4, 6).number(absentCount.length);
	});

	// workbook.write('SectionDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelSchoolMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !startDate || !endDate) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				date: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Monthly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	// worksheet.cell(4, 3).string('Present Count').style(style);
	// worksheet.cell(4, 4).string('Total Count').style(style);
	let col1 = 3;
	const date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		// row 3
		worksheet1.cell(3, 1).string('Date:').style(style);
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No:').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});
	// workbook.write('SchoolMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelClassMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate, classId } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !classId || !startDate || !endDate) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				$expr: {
					$eq: [
						{
							$month: '$date',
						},
						{
							$month: new Date(),
						},
					],
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Monthly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	let col1 = 3;
	const date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		worksheet1.cell(3, 1).string('Date:').style(style);
		// row 3
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No:').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});

	// workbook.write('ClassMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelClassWeeklyReport = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate, classId } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !classId || !startDate || !endDate) {
		return next(
			new ErrorResponse(
				'Please provide schoolId, classId, startDate & endDate',
				400
			)
		);
	}
	const dateStart = new Date(startDate);
	const dateEnd = new Date(endDate);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				date: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'attendanceDetails.date': '$date',
			},
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$or: [
									{
										$eq: ['$$item.status', 'Present'],
									},
									{
										$eq: ['$$item.status', 'Late'],
									},
									{
										$eq: ['$$item.status', 'Partial_Absent'],
									},
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						student_id: '$_id',
						present_count: '$present_count',
						absent_count: '$absent_count',
						attendanceDetails: {
							$map: {
								input: '$attendanceDetails',
								as: 'item',
								in: {
									status: '$$item.status',
									date: '$$item.date',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: '_id.class_id',
			},
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: '_id.section_id',
			},
		},
		{
			$unwind: {
				path: '$_id.section_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				students: {
					$size: '$attendanceDetails',
				},
				present: {
					$sum: '$attendanceDetails.present_count',
				},
				absent: {
					$sum: '$attendanceDetails.absent_count',
				},
				presentAVG: {
					$multiply: [
						{
							$divide: [
								{
									$sum: '$attendanceDetails.present_count',
								},
								{
									$add: [
										{
											$sum: '$attendanceDetails.present_count',
										},
										{
											$sum: '$attendanceDetails.absent_count',
										},
									],
								},
							],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				'_id.class_id.sequence_number': 1,
			},
		},
	]);
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Weekly');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(2, 3, 2, 4, true).string(
		`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
			month: 'long',
		})}-${dateEnd.getDate()} ${dateEnd.toLocaleString('default', {
			month: 'long',
		})}`
	);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Average Present %').style(style);
	let col1 = 3;
	const date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 1, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Present %').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Present count')
			.style(style);
		col1 += 2;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	const schoolAttendanceData = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		date: {
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		},
	})
		.populate('class_id section_id', 'name sequence_number')
		.select(
			'-createdBy -updatedBy -createdAt -updatedAt -class_teacher -attendance_takenBy_teacher'
		)
		.lean();
	schoolAttendanceData.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	const groupSchoolAttendanceData = [];
	for (const schoolAttendance of schoolAttendanceData) {
		schoolAttendance.absentCount = 0;
		schoolAttendance.presentCount = 0;
		schoolAttendance.totalStudent = schoolAttendance.attendanceDetails.length;
		for (const attendanceDetail of schoolAttendance.attendanceDetails) {
			if (attendanceDetail.status == 'Absent') {
				schoolAttendance.absentCount++;
			} else {
				schoolAttendance.presentCount++;
			}
		}
		schoolAttendance.presentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		schoolAttendance.absentAVG =
			(schoolAttendance.presentCount / schoolAttendance.totalStudent) * 100;
		const groupIndex = groupSchoolAttendanceData.findIndex(
			att => att.section_id._id == schoolAttendance.section_id._id
		);
		if (groupIndex != -1) {
			groupSchoolAttendanceData[groupIndex].data.push(schoolAttendance);
		} else {
			groupSchoolAttendanceData.push({
				section_id: schoolAttendance.section_id,
				class_id: schoolAttendance.class_id,
				data: [schoolAttendance],
			});
		}
	}
	let row = 6;
	let col = 1;
	const fold = (xs, init, reducer) => {
		let acc = init;
		for (const x of xs) {
			acc = reducer(acc, x);
		}
		return acc;
	};
	groupSchoolAttendanceData.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele.class_id.name} ${ele.section_id.name}`);
		const count = fold(ele.data, 0, (acc, x) => acc + x.presentAVG);
		worksheet
			.cell(row, col + 1)
			.number(count / ele.data.length / 100)
			.style(percentageStyle);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.data.findIndex(
				att => date1.getTime() == att.date.getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.number(ele.data[itemIndex].presentAVG / 100)
					.style(percentageStyle);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${ele.data[itemIndex].presentCount}/${ele.data[itemIndex].totalStudent}`
				);
			col += 2;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= dateEnd);
		row += 1;
		col = 1;
	});

	reports.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2._id.class_id.name} ${ele2._id.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		worksheet1.cell(3, 1).string('Date:').style(style);
		// row 3
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(3, col1, 3, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(4, col1).string('Attendance').style(style);
			worksheet1
				.cell(4, col1 + 1)
				.string('Type')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(4, 1).string('SL No:').style(style);
		worksheet1.cell(4, 2).string('Student Name').style(style);
		row = 5;
		col = 1;
		let count = 0;
		ele2.attendanceDetails.forEach(ele1 => {
			if (ele1.student_id) {
				count += 1;
				worksheet1.cell(row, col).number(count);
				worksheet1
					.cell(row, col + 1)
					.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.attendanceDetails.findIndex(
						att => date1.getTime() == att.date.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Late' ||
										ele1.attendanceDetails[itemIndex].status == 'Partial_Absent'
											? 'Present'
											: ele1.attendanceDetails[itemIndex].status
								  }`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${
										ele1.attendanceDetails[itemIndex].status == 'Present' ||
										ele1.attendanceDetails[itemIndex].status == 'Absent'
											? ''
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: ele1.attendanceDetails[itemIndex].status == 'Late'
											? 'Late'
											: 'Excuss'
								  }`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	});

	// workbook.write('ClassWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetExcelClassDailyReport = catchAsync(async (req, res, next) => {
	const { schoolId, classId, date } = req.query;
	const schoolData = await schoolModel.findById(schoolId).select('schoolName');
	if (!schoolId || !classId) {
		return next(new ErrorResponse('Please provide schoolId ', 400));
	}
	const dateM = date ? new Date(date) : new Date();
	const startDate = new Date(dateM);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(dateM);
	endDate.setHours(23, 59, 59, 999);

	const reports = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				class_id: '$class_id',
				section_id: '$section_id',
				school_id: '$school_id',
				present: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
				absent: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$section_id',
				class_id: {
					$first: '$class_id',
				},
				section_id: {
					$first: '$section_id',
				},
				school_id: {
					$first: '$school_id',
				},
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: 'section_id',
				foreignField: '_id',
				as: 'sectionId',
			},
		},
		{
			$unwind: {
				path: '$sectionId',
			},
		},
		{
			$lookup: {
				from: 'classes',
				localField: 'class_id',
				foreignField: '_id',
				as: 'classId',
			},
		},
		{
			$unwind: {
				path: '$classId',
			},
		},
		{
			$project: {
				sectionId: '$sectionId',
				schoolId: '$school_id',
				classId: '$classId',
				present: '$present',
				absent: '$absent',
				late: '$late',
				partial: '$partial',
			},
		},
		{
			$group: {
				_id: '$classId',
				present: {
					$sum: '$present',
				},
				absent: {
					$sum: '$absent',
				},
				late: {
					$sum: '$late',
				},
				partial: {
					$sum: '$partial',
				},
			},
		},
		{
			$sort: {
				'_id.sequence_number': 1,
			},
		},
	]);

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Summary');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	const percentageStyle = workbook.createStyle({
		numberFormat: '#.00%; #.##%; -#.##%; -',
	});

	// Set value of cell A1 to 100 as a number type styled with paramaters of style
	worksheet.cell(1, 1).string('Report Type:').style(style);

	// Set value of cell B1 to 300 as a number type styled with paramaters of style
	worksheet.cell(1, 2).string('Daily');

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateM.toLocaleString('default', { month: 'long' })}`);
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet
		.cell(4, 2)
		.string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', { month: 'long' })}`
		);
	worksheet
		.cell(4, 3, 4, 4, true)
		.string(
			`${dateM.toLocaleDateString('default', {
				weekday: 'long',
			})},${dateM.toLocaleString('default', {
				month: 'long',
			})} ${dateM.getDate()}, ${dateM.getFullYear()} `
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(5, 2).string('Present %').style(style);
	worksheet.cell(5, 3).string('Present Count').style(style);
	worksheet.cell(5, 4).string('Total Count').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 6;
	let col = 1;
	reports.forEach(async ele => {
		const totalStudents = await StudentModel.find({
			school_id: schoolId,
			class: ele._id._id,
		}).countDocuments();
		worksheet.cell(row, col).string(`${ele._id.name}`);
		worksheet
			.cell(row, col + 1)
			.number(parseFloat(((ele.present / totalStudents) * 100).toFixed(2)));
		worksheet.cell(row, col + 2).number(ele.present);
		worksheet.cell(row, col + 3).number(totalStudents);
		row += 1;
		col = 1;
	});
	let classReport = await AttendanceModel.find({
		school_id: schoolId,
		class_id: classId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('section_id', 'name')
		.populate('class_id', 'name sequence_number')
		.populate('attendanceDetails.student_id', 'name')
		.select('class_id section_id attendanceDetails');

	classReport = JSON.parse(JSON.stringify(classReport));
	classReport = classReport.sort(
		(a, b) => a.class_id.sequence_number - b.class_id.sequence_number
	);
	classReport.forEach(ele => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele.class_id.name} ${ele.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Report Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})}`
		);
		// row 2
		worksheet1.cell(2, 1).string('School Name :').style(style);
		worksheet1.cell(2, 2).string(`${schoolData.schoolName}`);
		// row 3
		worksheet1.cell(3, 1).string('Date:').style(style);
		worksheet1
			.cell(3, 2, 3, 3, true)
			.string(
				`${dateM.toLocaleDateString('default', {
					weekday: 'long',
				})},${dateM.toLocaleString('default', {
					month: 'long',
				})} ${dateM.getDate()}, ${dateM.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		// row 4
		worksheet1.cell(4, 1).string('Total Strength :').style(style);

		worksheet1.cell(5, 1).string('SL No :').style(style);
		worksheet1.cell(5, 2).string('Student Name').style(style);
		worksheet1.cell(5, 3).string('Attendance').style(style);
		worksheet1.cell(5, 4).string('Type').style(style);
		const presentCount = ele.attendanceDetails.filter(
			ele1 =>
				ele1.status == 'Late' ||
				ele1.status == 'Partial_Absent' ||
				ele1.status == 'Present'
		);
		const absentCount = ele.attendanceDetails.filter(
			ele1 => ele1.status == 'Absent'
		);
		row = 6;
		col = 1;
		let count = 0;
		ele.attendanceDetails.forEach(ele1 => {
			count += 1;
			worksheet1.cell(row, col).number(count);
			worksheet1
				.cell(row, col + 1)
				.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 2)
				.string(
					`${
						ele1.status == 'Late' || ele1.status == 'Partial_Absent'
							? 'Present'
							: ele1.status
					}`
				);
			worksheet1
				.cell(row, col + 3)
				.string(
					`${
						ele1.status == 'Present' || ele1.status == 'Absent' ? '' : 'Excuss'
					}`
				);
			row += 1;
			col = 1;
		});
		worksheet1.cell(4, 2).number(count);
		worksheet1.cell(4, 3).string('Total Present :').style(style);
		worksheet1.cell(4, 4).number(presentCount.length);
		worksheet1.cell(4, 5).string('Total Absent :').style(style);
		worksheet1.cell(4, 6).number(absentCount.length);
	});

	// workbook.write('ClassDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.GetReportStudentList = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId } = req.query;
	let { startDate, endDate } = req.query;

	if (!startDate && (!schoolId || !classId || !sectionId)) {
		return next(new ErrorResponse('date and other field is required', 400));
	}

	const weekStart = new Date();
	weekStart.setHours(0, 0, 0, 0);
	const pastDate = weekStart.getDate() - 7;
	weekStart.setDate(pastDate);
	const weekEnd = new Date();
	weekEnd.setHours(23, 59, 59, 999);

	startDate = new Date(startDate);
	startDate.setHours(0, 0, 0, 0);
	endDate = new Date(endDate || startDate);
	endDate.setHours(23, 59, 59, 999);

	if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
		return next(new ErrorResponse('Invalid startDate or endDate', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery.school_id = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		matchQuery.class = mongoose.Types.ObjectId(classId);
	}
	if (sectionId) {
		matchQuery.section = mongoose.Types.ObjectId(sectionId);
	}

	let data = await StudentModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				name: 1,
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
			},
		},
		{
			$lookup: {
				from: 'attendances',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							date: {
								$gte: startDate,
								$lte: endDate,
							},
							$expr: {
								$in: ['$$studId', '$attendanceDetails.student_id'],
							},
						},
					},
					{
						$project: {
							present: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Present'],
												},
											],
										},
									},
								},
							},
							absent: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Absent'],
												},
											],
										},
									},
								},
							},
							late: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Late'],
												},
											],
										},
									},
								},
							},
							partial: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Partial_Absent'],
												},
											],
										},
									},
								},
							},
						},
					},
				],
				as: 'attendanceList',
			},
		},
		{
			$unwind: {
				path: '$attendanceList',
			},
		},
	]);
	let lastWeekData = await StudentModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				name: 1,
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
			},
		},
		{
			$lookup: {
				from: 'attendances',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							date: {
								$gte: startDate,
								$lte: endDate,
							},
							$expr: {
								$in: ['$$studId', '$attendanceDetails.student_id'],
							},
						},
					},
					{
						$sort: {
							createdAt: 1,
						},
					},
					{
						$limit: 7,
					},
					{
						$project: {
							date: 1,
							present: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Present'],
												},
											],
										},
									},
								},
							},
							absent: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Absent'],
												},
											],
										},
									},
								},
							},
							late: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Late'],
												},
											],
										},
									},
								},
							},
							partial: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Partial_Absent'],
												},
											],
										},
									},
								},
							},
						},
					},
				],
				as: 'lastWeek',
			},
		},
		{
			$group: {
				_id: '$_id',
				lastWeek: {
					$first: '$lastWeek',
				},
				name: {
					$first: '$name',
				},
				gender: {
					$first: '$gender',
				},
				username: {
					$first: '$username',
				},
				profile_image: {
					$first: '$profile_image',
				},
				present: {
					$sum: '$attendanceList.present',
				},
				absent: {
					$sum: '$attendanceList.absent',
				},
				late: {
					$sum: '$attendanceList.late',
				},
				partial: {
					$sum: '$attendanceList.partial',
				},
				stats: {
					$first: '$stats',
				},
			},
		},
	]);
	lastWeekData = JSON.parse(JSON.stringify(lastWeekData));
	data = JSON.parse(JSON.stringify(data));
	lastWeekData.forEach(ele => {
		data.forEach(ele1 => {
			if (ele._id == ele1._id) {
				ele.present = ele1.attendanceList.present;
				ele.absent = ele1.attendanceList.absent;
				ele.late = ele1.attendanceList.late;
				ele.partial = ele1.attendanceList.partial;
			}
		});
	});

	res.status(200).json(successResponse(lastWeekData, lastWeekData.length));
});

exports.GetReportStudentListNew = catchAsync(async (req, res, next) => {
	const { schoolId, classId, sectionId } = req.query;
	let { startDate, endDate } = req.query;

	if (!startDate && (!schoolId || !classId || !sectionId)) {
		return next(new ErrorResponse('date and other field is required', 400));
	}

	const weekStart = new Date();
	weekStart.setHours(0, 0, 0, 0);
	const pastDate = weekStart.getDate() - 7;
	weekStart.setDate(pastDate);
	const weekEnd = new Date();
	weekEnd.setHours(23, 59, 59, 999);

	startDate = new Date(startDate);
	startDate.setHours(0, 0, 0, 0);
	endDate = new Date(endDate || startDate);
	endDate.setHours(23, 59, 59, 999);

	if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
		return next(new ErrorResponse('Invalid startDate or endDate', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery.school_id = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		matchQuery.class = mongoose.Types.ObjectId(classId);
	}
	if (sectionId) {
		matchQuery.section = mongoose.Types.ObjectId(sectionId);
	}

	let data = await StudentModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				name: 1,
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
			},
		},
		{
			$lookup: {
				from: 'attendances',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							date: {
								$gte: startDate,
								$lte: endDate,
							},
							$expr: {
								$in: ['$$studId', '$attendanceDetails.student_id'],
							},
						},
					},
					{
						$project: {
							present: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Present'],
												},
											],
										},
									},
								},
							},
							absent: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Absent'],
												},
											],
										},
									},
								},
							},
							late: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Late'],
												},
											],
										},
									},
								},
							},
							partial: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Partial_Absent'],
												},
											],
										},
									},
								},
							},
						},
					},
				],
				as: 'attendanceList',
			},
		},
		{
			$unwind: {
				path: '$attendanceList',
			},
		},
	]);
	let lastWeekData = await StudentModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				name: 1,
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
			},
		},
		{
			$lookup: {
				from: 'attendances',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							date: {
								$gte: weekStart,
								$lte: weekEnd,
							},
							$expr: {
								$in: ['$$studId', '$attendanceDetails.student_id'],
							},
						},
					},
					{
						$sort: {
							createdAt: 1,
						},
					},
					{
						$limit: 7,
					},
					{
						$project: {
							date: 1,
							present: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Present'],
												},
											],
										},
									},
								},
							},
							absent: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Absent'],
												},
											],
										},
									},
								},
							},
							late: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Late'],
												},
											],
										},
									},
								},
							},
							partial: {
								$size: {
									$filter: {
										input: '$attendanceDetails',
										as: 'item',
										cond: {
											$and: [
												{
													$eq: ['$$item.student_id', '$$studId'],
												},
												{
													$eq: ['$$item.status', 'Partial_Absent'],
												},
											],
										},
									},
								},
							},
						},
					},
				],
				as: 'lastWeek',
			},
		},
		{
			$group: {
				_id: '$_id',
				lastWeek: {
					$first: '$lastWeek',
				},
				name: {
					$first: '$name',
				},
				gender: {
					$first: '$gender',
				},
				username: {
					$first: '$username',
				},
				profile_image: {
					$first: '$profile_image',
				},
				present: {
					$sum: '$attendanceList.present',
				},
				absent: {
					$sum: '$attendanceList.absent',
				},
				late: {
					$sum: '$attendanceList.late',
				},
				partial: {
					$sum: '$attendanceList.partial',
				},
				stats: {
					$first: '$stats',
				},
			},
		},
	]);
	lastWeekData = JSON.parse(JSON.stringify(lastWeekData));
	data = JSON.parse(JSON.stringify(data));
	lastWeekData.forEach(ele => {
		data.forEach(ele1 => {
			if (ele._id == ele1._id) {
				ele.present = ele1.attendanceList.present;
				ele.absent = ele1.attendanceList.absent;
				ele.late = ele1.attendanceList.late;
				ele.partial = ele1.attendanceList.partial;
			}
		});
	});

	res.status(200).json(successResponse(lastWeekData, lastWeekData.length));
});

exports.ReporByClass = catchAsync(async (req, res, next) => {
	const newArr = [];
	async function ClassWise(sectionDetails, presentDate) {
		return AttendanceModel.aggregate([
			{
				$match: {
					section_id: mongoose.Types.ObjectId(sectionDetails),
					date: new Date(presentDate),
				},
			},
			{
				$project: {
					_id: 1,
					attendanceDetails: 1,
					date: 1,
					createdAt: 1,
					attendance_takenBy_teacher: 1,
					totalStudent: {
						$size: '$attendanceDetails',
					},
					absent_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Absent'],
								},
							},
						},
					},
					present_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Present'],
								},
							},
						},
					},
				},
			},
			{
				$project: {
					totalStudent: 1,
					absent_count: 1,
					present_count: 1,
					percentage: {
						$multiply: [
							{
								$divide: ['$present_count', '$totalStudent'],
							},
							100,
						],
					},
					createdAt: 1,
				},
			},
		]);
	}
	async function checkAndPush(attendance, attendanceData, name, sequence) {
		const sumObj = {};
		sumObj.name = name;
		sumObj.sequence = sequence;
		if (attendance > 0) {
			sumObj.flag = true;
			sumObj.totalStudent = attendanceData[0].totalStudent;
			sumObj.absent_count = attendanceData[0].absent_count;
			sumObj.present_count = attendanceData[0].present_count;
			sumObj.percentage = attendanceData[0].percentage;
			sumObj.marked_At = attendanceData[0].createdAt;
		} else {
			sumObj.flag = false;
		}
		newArr.push(sumObj);
	}
	const finalData = [];
	const finalObj = {};
	const { school_id } = req.body;
	const { date } = req.body;
	const school = await schoolModel.findOne({ _id: school_id });
	const classList = JSON.parse(JSON.stringify(school.classList));
	for (const el of classList) {
		const classData = await classModel
			.findOne({ _id: el })
			.select('_id name sequence_number');
		const sections = await sectionModel.find({
			'repository.id': school_id,
			class_id: classData._id,
		});
		const { name } = classData;
		if (sections.length > 1) {
			for (const ele of sections) {
				const attendance = await ClassWise(ele._id, date);
				classData.name = name;
				classData.name = `${classData.name} ${ele.name}`;
				await checkAndPush(
					attendance.length,
					attendance,
					classData.name,
					classData.sequence_number
				);
			}
		} else if (sections.length === 1) {
			const attendance = await ClassWise(sections[0]._id, date);
			classData.name = `${classData.name} ${sections[0].name}`;
			await checkAndPush(
				attendance.length,
				attendance,
				classData.name,
				classData.sequence_number
			);
		}
	}
	finalObj._id = school._id;
	finalObj.name = school.schoolName;
	finalObj.classList = newArr.sort((a, b) => a.sequence - b.sequence);
	finalData.push(finalObj);
	res
		.status(200)
		.json(successResponse(finalData, finalData.length, 'Attedance Report'));
});

exports.bySchool = catchAsync(async (req, res, next) => {
	const { school_id, date } = req.query;
	const startDate = new Date(date);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(date);
	endDate.setHours(23, 59, 59, 999);
	const report = await AttendanceModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(school_id),
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				school_id: 1,
				attendanceDetails: 1,
			},
		},
		{
			$unwind: '$attendanceDetails',
		},
		{
			$group: {
				_id: '$school_id',
				attendanceDetails: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				school_id: 1,
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				late_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Late'],
							},
						},
					},
				},
				partial_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Partial_Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
				total_count: {
					$size: '$attendanceDetails',
				},
			},
		},
	]);
	if (!report) {
		return res.status(404).json(new ErrorResponse(404, 'No records found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(report, report.length, 'Report Fetched Successfully')
		);
});

exports.SchoolsReport = catchAsync(async (req, res, next) => {
	const schoolID = [];
	const { date } = req.body;
	const result = await AttendanceModel.aggregate([
		{
			$match: {
				date: new Date(date),
			},
		},
		{
			$project: {
				attendance_takenBy_teacher: 1,
				class_id: 1,
				section_id: 1,
				attendanceDetails: 1,
				school_id: 1,
				date: 1,
				totalStudents: {
					$size: '$attendanceDetails',
				},
				absent_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Absent'],
							},
						},
					},
				},
				present_count: {
					$size: {
						$filter: {
							input: '$attendanceDetails',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'Present'],
							},
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$school_id',
				totalStudents: {
					$sum: '$totalStudents',
				},
				sections: {
					$addToSet: '$section_id',
				},
				present_count: {
					$sum: '$present_count',
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
								$and: [
									{
										$eq: ['$$school_id', '$school_id'],
									},
									{
										$ne: ['$deleted', true],
									},
								],
							},
						},
					},
					{
						$group: {
							_id: '$school_id',
							students: {
								$push: '$_id',
							},
						},
					},
					{
						$project: {
							totalStudents: {
								$size: '$students',
							},
						},
					},
				],
				as: 'totalStudents',
			},
		},
		{ $unwind: '$totalStudents' },
		{
			$project: {
				_id: {
					$toString: '$_id',
				},
				present_count: 1,
				sections: 1,
				totalStudents: 1,
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					school_id: '$_id',
				},
				pipeline: [
					{
						$unwind: '$repository',
					},
					{
						$match: {
							$expr: {
								$eq: ['$$school_id', '$repository.id'],
							},
						},
					},
					{
						$group: {
							_id: '$repository.id',
							sections: {
								$push: '$_id',
							},
						},
					},
					{
						$project: {
							totalSections: {
								$size: '$sections',
							},
						},
					},
				],
				as: 'totalSections',
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school_id: {
						$toObjectId: '$_id',
					},
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
						},
					},
				],
				as: '_id',
			},
		},
		{ $unwind: '$_id' },
		{ $unwind: '$totalSections' },
		{
			$project: {
				totalStudents: '$totalStudents.totalStudents',
				present_count: 1,
				totalSections: '$totalSections.totalSections',
				takenSections: {
					$size: '$sections',
				},
			},
		},
		{
			$project: {
				_id: 1,
				present_count: 1,
				totalStudents: 1,
				percentage: {
					$multiply: [
						{
							$divide: ['$takenSections', '$totalSections'],
						},
						100,
					],
				},
			},
		},
	]);
	if (!result.length) {
		return next(new ErrorResponse('No data found', 404));
	}
	result.forEach(ele => {
		schoolID.push(ele._id._id);
		ele.schoolName = ele._id.schoolName;
		ele.school_id = ele._id._id.toString();
		delete ele._id;
	});

	let schoolList = await schoolModel
		.find({
			_id: {
				$nin: schoolID,
			},
		})
		.select('_id schoolName');
	schoolList = schoolList.map(el => ({
		school_id: el._id,
		schoolName: el.schoolName,
	}));
	schoolList = JSON.parse(JSON.stringify(schoolList));
	const attendanceData = result.concat(schoolList);
	res
		.status(200)
		.json(
			successResponse(attendanceData, attendanceData.length, 'Schools Report')
		);
});

exports.ReportBySchool = async (req, res, next) => {
	try {
		const classReportDetails = await AttendanceModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.body.school_id),
					date: {
						$gte: new Date(req.body.start_date),
						$lte: new Date(req.body.end_date),
					},
				},
			},
			{
				$addFields: {
					'attendanceDetails.date': '$date',
				},
			},
			{
				$group: {
					_id: '$class_id',
					totalStudents: {
						$push: '$attendanceDetails',
					},
				},
			},
			{
				$project: {
					totalStudents: {
						$reduce: {
							input: '$totalStudents',
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
				$group: {
					_id: '$totalStudents.student_id',
					data: {
						$first: '$_id',
					},
					attendanceDetails: {
						$push: '$totalStudents',
					},
				},
			},
			{
				$addFields: {
					absent_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Absent'],
								},
							},
						},
					},
					present_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Present'],
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						student_id: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$student_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id',
				},
			},
			{
				$unwind: {
					path: '$_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: '$data',
					attendanceDetails: {
						$push: {
							student_id: '$_id',
							present_count: '$present_count',
							absent_count: '$absent_count',
							attendanceDetails: {
								$map: {
									input: '$attendanceDetails',
									as: 'item',
									in: {
										status: '$$item.status',
										date: '$$item.date',
									},
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						class_id: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$class_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: 'class_id',
				},
			},
			{
				$unwind: '$class_id',
			},
			{
				$project: {
					_id: 0,
					class_id: 1,
					attendanceDetails: 1,
					students: {
						$size: '$attendanceDetails',
					},
					present: { $sum: '$attendanceDetails.present_count' },
					presentAVG: {
						$multiply: [
							{
								$divide: [
									{
										$sum: '$attendanceDetails.present_count',
									},
									{
										$add: [
											{
												$sum: '$attendanceDetails.present_count',
											},
											{
												$sum: '$attendanceDetails.absent_count',
											},
										],
									},
								],
							},
							100,
						],
					},
					absent: { $sum: '$attendanceDetails.absent_count' },
					absentAVG: {
						$multiply: [
							{
								$divide: [
									{
										$sum: '$attendanceDetails.absent_count',
									},
									{
										$add: [
											{
												$sum: '$attendanceDetails.present_count',
											},
											{
												$sum: '$attendanceDetails.absent_count',
											},
										],
									},
								],
							},
							100,
						],
					},
				},
			},
		]);
		if (classReportDetails) {
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: classReportDetails,
			});
		} else {
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: classReportDetails,
			});
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({
			statusCode: 400,
			message: error.message,
		});
	}
};
exports.ReportByStudent = async (req, res, next) => {
	try {
		let classReportDetails = await AttendanceModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(req.body.school_id),
					class_id: mongoose.Types.ObjectId(req.body.class_id),
					section_id: mongoose.Types.ObjectId(req.body.section_id),
					date: {
						$gte: new Date(req.body.start_date),
						$lte: new Date(req.body.end_date),
					},
				},
			},
			{
				$addFields: {
					'attendanceDetails.date': '$date',
				},
			},
			{
				$group: {
					_id: {
						class_id: '$class_id',
						section_id: '$section_id',
					},
					totalStudents: {
						$push: '$attendanceDetails',
					},
				},
			},
			{
				$project: {
					totalStudents: {
						$reduce: {
							input: '$totalStudents',
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
				$group: {
					_id: '$totalStudents.student_id',
					data: {
						$first: '$_id',
					},
					attendanceDetails: {
						$push: '$totalStudents',
					},
				},
			},
			{
				$addFields: {
					absent_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Absent'],
								},
							},
						},
					},
					present_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Present'],
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						student_id: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$student_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id',
				},
			},
			{
				$unwind: {
					path: '$_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: '$data',
					attendanceDetails: {
						$push: {
							student_id: '$_id',
							present_count: '$present_count',
							absent_count: '$absent_count',
							attendanceDetails: {
								$map: {
									input: '$attendanceDetails',
									as: 'item',
									in: {
										status: '$$item.status',
										date: '$$item.date',
									},
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						class_id: '$_id.class_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$class_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id.class_id',
				},
			},
			{
				$unwind: '$_id.class_id',
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						section_id: '$_id.section_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$section_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id.section_id',
				},
			},
			{
				$unwind: {
					path: '$_id.section_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$addFields: {
					'attendanceDetails.absent_count': {
						$size: {
							$filter: {
								input: '$attendanceDetails.attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$item.status', 'Absent'],
								},
							},
						},
					},
					students: {
						$size: '$attendanceDetails',
					},
					present: {
						$sum: '$attendanceDetails.present_count',
					},
					absent: {
						$sum: '$attendanceDetails.absent_count',
					},
					presentAVG: {
						$multiply: [
							{
								$divide: [
									{
										$sum: '$attendanceDetails.present_count',
									},
									{
										$add: [
											{
												$sum: '$attendanceDetails.present_count',
											},
											{
												$sum: '$attendanceDetails.absent_count',
											},
										],
									},
								],
							},
							100,
						],
					},
					absentAVG: {
						$multiply: [
							{
								$divide: [
									{
										$sum: '$attendanceDetails.absent_count',
									},
									{
										$add: [
											{
												$sum: '$attendanceDetails.present_count',
											},
											{
												$sum: '$attendanceDetails.absent_count',
											},
										],
									},
								],
							},
							100,
						],
					},
				},
			},
		]);
		if (req.body.student && req.body.student == true) {
			classReportDetails = await AttendanceModel.aggregate([
				{
					$match: {
						school_id: mongoose.Types.ObjectId(req.body.school_id),
						class_id: mongoose.Types.ObjectId(req.body.class_id),
						section_id: mongoose.Types.ObjectId(req.body.section_id),
						'attendanceDetails.student_id': mongoose.Types.ObjectId(
							req.body.student_id
						),
					},
				},
				{
					$project: {
						createdAt: 1,
						attendanceDetails: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: [
										'$$item.student_id',
										mongoose.Types.ObjectId(req.body.student_id),
									],
								},
							},
						},
					},
				},
				{
					$group: {
						_id: {
							$first: '$attendanceDetails.student_id',
						},
						total: {
							$sum: 1,
						},
						present: {
							$sum: {
								$cond: [
									{
										$eq: [
											{
												$first: '$attendanceDetails.status',
											},
											'Present',
										],
									},
									1,
									0,
								],
							},
						},
						absent: {
							$sum: {
								$cond: [
									{
										$eq: [
											{
												$first: '$attendanceDetails.status',
											},
											'Absent',
										],
									},
									1,
									0,
								],
							},
						},
					},
				},
			]);
		}
		if (classReportDetails) {
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: classReportDetails,
			});
		} else {
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: classReportDetails,
			});
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({
			statusCode: 400,
			message: error.message,
		});
	}
};
exports.AttendanceReportByStudent = async (req, res, next) => {
	try {
		const classReportDetails = await AttendanceModel.aggregate([
			{
				$match: {
					'attendanceDetails.student_id': mongoose.Types.ObjectId(
						req.params.id
					),
				},
			},
			{
				$addFields: {
					'attendanceDetails.date': '$date',
					student_id: mongoose.Types.ObjectId(req.params.id),
				},
			},
			{
				$group: {
					_id: {
						class_id: '$class_id',
						section_id: '$section_id',
						student_id: '$student_id',
						school_id: '$school_id',
					},
					totalStudents: {
						$push: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.student_id', '$student_id'],
								},
							},
						},
					},
				},
			},
			{
				$project: {
					totalStudents: {
						$reduce: {
							input: '$totalStudents',
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
				$group: {
					_id: '$totalStudents.student_id',
					data: {
						$first: '$_id',
					},
					attendanceDetails: {
						$push: '$totalStudents',
					},
				},
			},
			{
				$addFields: {
					absent_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Absent'],
								},
							},
						},
					},
					late_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Late'],
								},
							},
						},
					},
					partial_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Partial_Absent'],
								},
							},
						},
					},
					present_count: {
						$size: {
							$filter: {
								input: '$attendanceDetails',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'Present'],
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						student_id: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$student_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
								profile_image: 1,
								parent_id: 1,
							},
						},
					],
					as: '_id',
				},
			},
			{
				$unwind: {
					path: '$_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'parents',
					let: {
						parent_id: '$_id.parent_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$parent_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
								profile_image: 1,
								parentType: 1,
								username: 1,
							},
						},
					],
					as: '_id.parent_id',
				},
			},
			{
				$unwind: {
					path: '$_id.parent_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: '$data',
					attendanceDetails: {
						$first: {
							student_id: {
								_id: '$_id._id',
								name: '$_id.name',
								profile_image: '$_id.profile_image',
							},
							parent_id: '$_id.parent_id',
							present_count: '$present_count',
							absent_count: '$absent_count',
							late_count: '$late_count',
							partial_count: '$partial_count',
							attendanceDetails: {
								$map: {
									input: '$attendanceDetails',
									as: 'item',
									in: {
										status: '$$item.status',
										date: '$$item.date',
									},
								},
							},
						},
					},
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						class_id: '$_id.class_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$class_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id.class_id',
				},
			},
			{
				$unwind: '$_id.class_id',
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						section_id: '$_id.section_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$section_id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id.section_id',
				},
			},
			{
				$unwind: {
					path: '$_id.section_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$addFields: {
					'attendanceDetails.class_id': '$_id.class_id',
					'attendanceDetails.section_id': '$_id.section_id',
					'attendanceDetails.school_id': '$_id.school_id',
					'attendanceDetails.presentAVG': {
						$multiply: [
							{
								$divide: [
									'$attendanceDetails.present_count',
									{
										$add: [
											'$attendanceDetails.present_count',
											'$attendanceDetails.absent_count',
											'$attendanceDetails.late_count',
											'$attendanceDetails.partial_count',
										],
									},
								],
							},
							100,
						],
					},
					'attendanceDetails.absentAVG': {
						$multiply: [
							{
								$divide: [
									'$attendanceDetails.absent_count',
									{
										$add: [
											'$attendanceDetails.present_count',
											'$attendanceDetails.absent_count',
											'$attendanceDetails.late_count',
											'$attendanceDetails.partial_count',
										],
									},
								],
							},
							100,
						],
					},
					'attendanceDetails.lateAVG': {
						$multiply: [
							{
								$divide: [
									'$attendanceDetails.late_count',
									{
										$add: [
											'$attendanceDetails.present_count',
											'$attendanceDetails.absent_count',
											'$attendanceDetails.late_count',
											'$attendanceDetails.partial_count',
										],
									},
								],
							},
							100,
						],
					},
					'attendanceDetails.partialAVG': {
						$multiply: [
							{
								$divide: [
									'$attendanceDetails.partial_count',
									{
										$add: [
											'$attendanceDetails.present_count',
											'$attendanceDetails.absent_count',
											'$attendanceDetails.late_count',
											'$attendanceDetails.partial_count',
										],
									},
								],
							},
							100,
						],
					},
				},
			},
			{
				$replaceRoot: {
					newRoot: '$attendanceDetails',
				},
			},
		]);
		if (classReportDetails && classReportDetails.length) {
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: classReportDetails[0],
			});
		} else {
			const data = await StudentModel.findById(req.params.id)
				.select('class section name')
				.populate('class section', 'name')
				.populate('parent_id', 'name,profile_image,parentType,username');
			res.status(200).json({
				error: false,
				statusCode: 200,
				message: 'Success',
				records: classReportDetails.length,
				data: {
					student_id: { _id: data._id, name: data.name },
					class_id: data.class,
					section_id: data.section,
					school_id: data.school_id,
					absent_count: 0,
					present_count: 0,
					late_count: 0,
					partial_count: 0,
					presentAVG: 0.0,
					absentAVG: 0.0,
					lateAVG: 0.0,
					partialAVG: 0.0,
					attendanceDetails: [],
				},
			});
		}
	} catch (error) {
		res.status(400).json({
			statusCode: 400,
			message: error.message,
		});
	}
};

exports.Create = catchAsync(async (req, res, next) => {
	const endDateTday = new Date();
	endDateTday.setHours(23, 59, 59, 999);

	if (new Date(req.body.date) > endDateTday) {
		return next(new ErrorResponse('Cannot take future attendance', 400));
	}

	const AttendanceCreated = {
		class_teacher: req.body.class_teacher,
		attendance_takenBy_teacher: req.body.attendance_takenBy_teacher,
		class_id: req.body.class_id,
		section_id: req.body.section_id,
		school_id: req.body.school_id,
		date: req.body.date,
		attendanceDetails: req.body.attendanceDetails,
		createdBy: req.body.createdBy,
		updatedBy: req.body.updatedBy,
	};
	const duplicateAttendance = await AttendanceModel.findOne({
		school_id: req.body.school_id,
		class_id: req.body.class_id,
		section_id: req.body.section_id,
		date: new Date(req.body.date),
	});

	if (duplicateAttendance) {
		return next(
			new ErrorResponse(
				`Attendance already taken for ${req.body.section_id} at ${req.body.date}`,
				400
			)
		);
	}

	let finalData = await AttendanceModel.create(AttendanceCreated);
	finalData = await AttendanceModel.populate(finalData, [
		{
			path: 'class_teacher attendance_takenBy_teacher',
			select: 'name profile_image',
		},
		{
			path: 'attendanceDetails.student_id',
			populate: {
				path: 'parent_id',
				select: 'DeviceToken f_contact_number guardian_mobile',
			},
			select: 'name profile_image _id class section parent_id DeviceToken',
		},
		{
			path: 'class_id school_id section_id',
			select: '_id name schoolName smsActivated',
		},
	]);

	let image;
	finalData = JSON.parse(JSON.stringify(finalData));
	const date = new Date(req.body.date);
	const date1 = `${`${date.getDate()}-${
		date.getMonth() + 1
	}-${date.getFullYear()}`}`;

	const dateIsToday = moment().isSame(new Date(req.body.date), 'day');

	// send noti only if today
	if (dateIsToday) {
		for (const ele of finalData.attendanceDetails) {
			if (ele.student_id) {
				if (!finalData.attendance_takenBy_teacher.profile_image) {
					image = '';
				} else {
					const imageele =
						finalData.attendance_takenBy_teacher.profile_image.split('/');
					image = `${process.env.cloudFront100x100}${
						imageele[imageele.length - 1]
					}`;
				}
				const payload = {
					notification: {
						title: 'Attendance',
						body: `${ele.student_id.name} is Absent on ${date1}`,
						image,
						sound: 'default',
						click_action: 'FLUTTER_NOTIFICATION_CLICK',
						collapse_key: 'grow_on',
						icon: '@drawable/notification_icon',
						channel_id: 'messages',
					},
					data: {
						type: 'Test',
					},
				};
				const arrOfDeviceToken = [];
				let date2 = new Date();
				date2 = `${`${date2.getDate()}-${
					date2.getMonth() + 1
				}-${date2.getFullYear()}`}`;
				if (ele.status === 'Absent') {
					if (date1 == date2) {
						if (finalData.school_id.smsActivated == true) {
							const mobile = ele.student_id.parent_id
								? ele.student_id.parent_id.f_contact_number
									? ele.student_id.parent_id.f_contact_number
									: ele.student_id.parent_id.guardian_mobile
								: null;
							if (mobile) {
								const sendBaseUrl = `http://sms.smslab.in/api/sendhttp.php?authkey=${SMS_LAB_AUTHKEY}&sender=${SMS_LAB_SENDERA}&route=4&country=91&response=json&DLT_TE_ID=${SMS_LAB_DLT_TE_IDA}`;
								const message = `Dear Parents,\nThis is to inform you that\nYour child ${
									ele.student_id.name
								} is absent today ${`${date.getDate()}-${
									date.getMonth() + 1
								}-${date.getFullYear()}`}\n\nRegards,\n${
									finalData.school_id.schoolName
								}\nCUMINA`;

								const url = `${sendBaseUrl}&mobiles=${mobile}&message=${message}`;

								axios
									.get(url)
									.then(resData => {
										const { data } = resData;

										if (data.type === 'success') {
											// resolve(data);
										}
									})
									.catch(err => {
										// reject(err);
										console.log(err);
									});
							}
						}
					}
					if (
						ele.student_id.parent_id &&
						ele.student_id.parent_id.DeviceToken &&
						ele.student_id.parent_id.DeviceToken.length
					) {
						arrOfDeviceToken.push(ele.student_id.parent_id.DeviceToken);
					}
					if (ele.student_id.DeviceToken && ele.student_id.DeviceToken.length) {
						arrOfDeviceToken.push(ele.student_id.DeviceToken);
					}
					delete ele.student_id.DeviceToken;
					delete ele.student_id.parent_id;
				}
				delete ele.student_id.DeviceToken;
				delete ele.student_id.parent_id;

				firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
			}
		}
	}

	res.status(201).json({
		error: false,
		statusCode: 201,
		message: 'Attendance Created Successfully',
		data: finalData,
	});
});

exports.CreateMany = async (req, res, next) => {
	try {
		const finalData = await AttendanceModel.insertMany(req.body)
			.then(() => {
				console.log('Data inserted');
			})
			.catch(error => {
				console.log(error.message);
			});

		res.status(201).json({
			error: false,
			statusCode: 201,
			message: 'Attendance Created Successfully',
			data: finalData,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: error.message,
		});
	}
};

exports.UpdateAttendanceClass = async (req, res, next) => {
	try {
		const id = req.body._id;
		let attendanceData = await AttendanceModel.findByIdAndUpdate(id, req.body, {
			new: true,
		});
		attendanceData = await AttendanceModel.populate(attendanceData, [
			{
				path: 'class_teacher attendance_takenBy_teacher',
				select: 'name profile_image',
			},
			{
				path: 'attendanceDetails.student_id',
				populate: {
					path: 'parent_id',
					select: 'DeviceToken f_contact_number guardian_mobile',
				},
				select: 'name profile_image _id class section parent_id DeviceToken',
			},
			{
				path: 'class_id school_id section_id',
				select: '_id name schoolName smsActivated',
			},
		]);

		attendanceData = JSON.parse(JSON.stringify(attendanceData));

		const date = new Date(req.body.date);
		const dateIsToday = moment().isSame(date, 'day');

		// send noti only if today
		if (dateIsToday) {
			for (const ele of attendanceData.attendanceDetails) {
				let image;
				if (!attendanceData.attendance_takenBy_teacher.profile_image) {
					image = '';
				} else {
					const imageele =
						attendanceData.attendance_takenBy_teacher.profile_image.split('/');
					image = `${process.env.cloudFront100x100}${
						imageele[imageele.length - 1]
					}`;
				}
				const payload = {
					notification: {
						title: 'Attendance',
						body: `${ele.student_id.name} is Absent on ${`${date.getDate()}-${
							date.getMonth() + 1
						}-${date.getFullYear()}`}`,
						image,
						sound: 'default',
						click_action: 'FLUTTER_NOTIFICATION_CLICK',
						collapse_key: 'grow_on',
						icon: '@drawable/notification_icon',
						channel_id: 'messages',
					},
					data: {
						type: 'Test',
					},
				};
				const arrOfDeviceToken = [];
				if (ele.status === 'Absent') {
					if (
						ele.student_id.parent_id &&
						ele.student_id.parent_id.DeviceToken &&
						ele.student_id.parent_id.DeviceToken.length
					) {
						arrOfDeviceToken.push(ele.student_id.parent_id.DeviceToken);
					}
					if (ele.student_id.DeviceToken && ele.student_id.DeviceToken.length) {
						arrOfDeviceToken.push(ele.student_id.DeviceToken);
					}
					delete ele.student_id.DeviceToken;
					delete ele.student_id.parent_id;
				}
				delete ele.student_id.DeviceToken;
				delete ele.student_id.parent_id;

				firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
			}
		}
		res.status(201).json({
			error: false,
			statusCode: 201,
			message: 'Updated Successfully',
			data: attendanceData,
		});
	} catch (err) {
		res.status(404).json({
			error: true,
			statusCode: 404,
			message: err.message,
		});
	}
};

exports.GetById = async (req, res, next) => {
	try {
		const features = await AttendanceModel.findById(req.params.id)
			.populate({ path: 'class_teacher', select: 'name profile_image' })
			.populate({
				path: 'attendance_takenBy_teacher',
				select: 'name profile_image',
			})
			.populate({
				path: 'attendanceDetails.student_id',
				select: 'name profile_image _id class section',
			})
			.populate({ path: 'class_id school_id section_id', select: '_id name' });

		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Success',
			data: features,
		});
	} catch (error) {
		res.json({
			error: true,
			statusCode: 400,
			message: error.message,
		});
	}
};

exports.GetByDate = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		AttendanceModel.findOne()
			.populate({ path: 'class_teacher', select: 'name profile_image' })
			.populate({
				path: 'attendance_takenBy_teacher',
				select: 'name profile_image',
			})
			.populate({
				path: 'attendanceDetails.student_id',
				select: 'name profile_image _id class section',
			})
			.populate({
				path: 'class_id school_id section_id',
				select: '_id name',
			}),
		req.body
	).filter();
	const classDetails = await features.query;

	res.status(200).json(successResponse(classDetails, classDetails.length));
});

exports.GetByPreviousDay = catchAsync(async (req, res, next) => {
	let finalData = {};
	const teacherData = {};
	if (!req.body.school_id) {
		return next(new ErrorResponse('School Id is required', 400));
	}

	// if no specific date then return whole year report
	const matchQuery = {
		school_id: mongoose.Types.ObjectId(req.body.school_id),
	};

	if (req.body.class_id) {
		matchQuery.class_id = mongoose.Types.ObjectId(req.body.class_id);
	}

	if (req.body.section_id) {
		matchQuery.section_id = mongoose.Types.ObjectId(req.body.section_id);
	}

	// if (req.body.date && req.body.endDate) {
	// 	matchQuery.date = {
	// 		$gte: new Date(req.body.date),
	// 		$lte: new Date(req.body.endDate),
	// 	};
	// } else {
	// 	matchQuery.$expr = {
	// 		$eq: [
	// 			{
	// 				$year: '$date',
	// 			},
	// 			{
	// 				$year: new Date(),
	// 			},
	// 		],
	// 	};
	// }
	const today = await AttendanceModel.findOne({
		school_id: req.body.school_id,
		class_id: req.body.class_id,
		section_id: req.body.section_id,
		date: new Date(req.body.date),
	})
		.select('_id attendanceDetails attendance_takenBy_teacher updatedAt')
		.populate([
			{
				path: 'attendanceDetails.student_id',
				select: 'name profile_image username',
			},
			{
				path: 'attendance_takenBy_teacher',
				select: 'name profile_image',
				options: { withDeleted: true },
			},
		]);
	let num = 1;
	if (today) {
		num = 0;
	}
	const records = await AttendanceModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				date: -1,
			},
		},
		{
			$skip: num,
		},
		{
			$limit: 7,
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$section_id',
				},
				totalStudents: {
					$push: '$attendanceDetails',
				},
			},
		},
		{
			$project: {
				totalStudents: {
					$reduce: {
						input: '$totalStudents',
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
			$group: {
				_id: '$totalStudents.student_id',
				data: {
					$first: '$_id',
				},
				attendanceDetails: {
					$push: '$totalStudents.status',
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$student_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
							deleted: 1,
							stats: 1,
							username: 1
						},
					},
				],
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$data',
				attendanceDetails: {
					$push: {
						_id: '$_id._id',
						name: '$_id.name',
						username: '$_id.username',
						profile_image: '$_id.profile_image',
						deleted: '$_id.deleted',
						present_count: '$_id.stats.attendance.present',
						absent_count: '$_id.stats.attendance.absent',
						late_count: '$_id.stats.attendance.late',
						partial_count: '$_id.stats.attendance.partial',
						total: {
							$sum: [
								'$_id.stats.attendance.present',
								'$_id.stats.attendance.partial',
								'$_id.stats.attendance.late',
								'$_id.stats.attendance.absent',
							],
						},
						attendanceDetails: '$attendanceDetails',
					},
				},
			},
		},
		{
			$unwind: '$attendanceDetails',
		},
		{
			$sort: {
				'attendanceDetails.name': 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				attendanceDetails: {
					$push: {
						$cond: [
							{
								$ne: ['$attendanceDetails.deleted', true],
							},
							'$attendanceDetails',
							null,
						],
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				attendanceDetails: {
					$filter: {
						input: '$attendanceDetails',
						as: 'item',
						cond: {
							$ne: ['$$item', null],
						},
					},
				},
			},
		},
	]);

	if (records.length) {
		teacherData._id = today?.attendance_takenBy_teacher?._id ?? null;
		teacherData.name = today?.attendance_takenBy_teacher?.name ?? null;
		teacherData.profile_image =
			today?.attendance_takenBy_teacher?.profile_image ?? null;
		finalData = {
			taken_by: teacherData,
			updatedAt: today?.updatedAt,
			todayAttendanceID: today ? today._id : null,
			attendanceDetails: today ? [] : null,
			statusAndCount: today ? null : [],
		};
		if (today) {
			for (const ele of JSON.parse(JSON.stringify(today.attendanceDetails))) {
				for (const ele1 of JSON.parse(
					JSON.stringify(records[0].attendanceDetails)
				)) {
					if (ele.student_id && ele.student_id._id) {
						if (ele.student_id._id == ele1._id) {
							finalData.attendanceDetails.push({
								_id: ele1._id,
								late_comment: ele.late_comment,
								status: ele.status,
								name: ele1.name,
								username: ele1.username,
								profile_image: ele1.profile_image ? ele1.profile_image : null,
								deleted: ele1.deleted ? ele1.deleted : false,
								absent_count: ele1.absent_count,
								present_count: ele1.present_count,
								partial_count: ele1.partial_count,
								late_count: ele1.late_count,
								total: ele1.total,
								attendanceDetails: ele1.attendanceDetails,
							});
						}
					}
				}
			}
		} else {
			let studentDetails = await StudentModel.find({
				section: mongoose.Types.ObjectId(req.body.section_id),
			})
				.select('_id name profile_image deleted username')
				.sort('name');
			const remainedStudents = JSON.parse(JSON.stringify(studentDetails));
			studentDetails = JSON.parse(
				JSON.stringify(records[0].attendanceDetails)
			).filter(element => element.deleted !== true);
			const studentIds = remainedStudents.map(e => e._id);
			for (const ele of remainedStudents) {
				// if (!studentDetails.includes(ele._id)) {
				// 	studentDetails.push({
				// 		_id: ele._id,
				// 		name: ele.name,
				// 		profile_image: ele.profile_image ? ele.profile_image : null,
				// 		deleted: ele.deleted ? ele.deleted : false,
				// 		absent_count: ele.absent_count,
				// 		present_count: ele.present_count,
				// 		partial_count: ele.partial_count,
				// 		late_count: ele.late_count,
				// 		total: ele.total,
				// 		attendanceDetails: ele.last_week,
				// 	});
				// }
				for (const ele1 of studentDetails) {
					if (ele._id == ele1._id) {
						ele.absent_count = ele1.absent_count;
						ele.present_count = ele1.present_count;
						ele.partial_count = ele1.partial_count;
						ele.late_count = ele1.late_count;
						ele.total = ele1.total;
						ele.attendanceDetails = ele1.attendanceDetails;
					} else {
						ele.absent_count = ele.absent_count ? ele.absent_count : 0;
						ele.present_count = ele.present_count ? ele.present_count : 0;
						ele.partial_count = ele.partial_count ? ele.partial_count : 0;
						ele.late_count = ele.late_count ? ele.late_count : 0;
						ele.total = ele.total ? ele.total : 0;
						ele.attendanceDetails = ele.attendanceDetails
							? ele.attendanceDetails
							: [];
					}
				}
			}
			finalData.statusAndCount = remainedStudents
				.filter(element => element.deleted !== true)
				.sort((a, b) => {
					if (a.name && b.name) {
						const fa = a.name.toLowerCase();
						const fb = b.name.toLowerCase();

						if (fa < fb) {
							return -1;
						}
						if (fa > fb) {
							return 1;
						}
						return 0;
					}
				});
		}
	} else {
		finalData.taken_by = {
			_id: null,
			name: null,
			profile_image: null,
		};
		let studentDetails = await StudentModel.find({
			school_id: req.body.school_id,
			class: req.body.class_id,
			section: req.body.section_id,
		}).select('_id name profile_image stats username');
		studentDetails = JSON.parse(JSON.stringify(studentDetails));
		for (const ele of studentDetails) {
			ele.profile_image = ele.profile_image ? ele.profile_image : null;
			ele.present_count = ele.stats.present ? ele.stats.present : 0;
			ele.absent_count = ele.stats.absent ? ele.stats.absent : 0;
			ele.late_count = ele.stats.late ? ele.stats.late : 0;
			ele.partial_count = ele.stats.partial ? ele.stats.partial : 0;
			ele.total = ele.stats
				? ele.stats.present +
				  ele.stats.absent +
				  ele.stats.late +
				  ele.stats.partial
					? ele.stats.present +
					  ele.stats.absent +
					  ele.stats.late +
					  ele.stats.partial
					: 0
				: 0;
			ele.attendanceDetails = [];
			delete ele.stats;
		}
		finalData.attendanceDetails = null;
		finalData.todayAttendanceID = null;
		finalData.statusAndCount = studentDetails;
	}

	res.status(200).json(successResponse(finalData, 1));
});

exports.GetList = catchAsync(async (req, res, next) => {
	let classDetails = await sectionModel.aggregate([
		{
			$match: {
				'repository.id': req.body.school_id,
			},
		},
		{
			$project: {
				name: 1,
				class_id: 1,
				school_id: {
					$toObjectId: {
						$first: '$repository.id',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'attendances',
				let: {
					section_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$section_id', '$$section_id'],
									},
									{
										$eq: ['$date', new Date(req.body.date)],
									},
								],
							},
						},
					},
				],
				as: 'attendance',
			},
		},
		{
			$unwind: {
				path: '$attendance',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				status: {
					$cond: {
						if: {
							$ifNull: ['$attendance', false],
						},
						then: true,
						else: false,
					},
				},
			},
		},
		{
			$group: {
				_id: '$class_id',
				school_id: {
					$first: '$school_id',
				},
				sections: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
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
			$project: {
				_id: '$_id._id',
				name: '$_id.name',
				sequence: '$_id.sequence_number',
				school_id: 1,
				sections: {
					$map: {
						input: '$sections',
						as: 'section',
						in: {
							_id: '$$section._id',
							name: '$$section.name',
							status: '$$section.status',
							attendance: '$$section.attendance',
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$school_id',
				classes: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$project: {
				_id: 1,
				classes: {
					$map: {
						input: '$classes',
						as: 'class',
						in: {
							_id: '$$class._id',
							name: '$$class.name',
							sections: '$$class.sections',
							sequence: '$$class.sequence',
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
							_id: 1,
							schoolName: 1,
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
			$project: {
				_id: '$_id._id',
				name: '$_id.schoolName',
				classes: 1,
			},
		},
		{
			$unwind: '$classes',
		},
		{
			$sort: {
				'classes.sequence': 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				classes: {
					$push: '$classes',
				},
			},
		},
	]);

	classDetails = JSON.parse(JSON.stringify(classDetails));
	for (const ele of classDetails[0].classes) {
		for (const ele1 of ele.sections) {
			const studentData = await StudentModel.find({
				school_id: req.body.school_id,
				class: ele._id,
				section: ele1._id,
			});
			if (studentData && studentData.length) {
				ele1.studentsAvailable = true;
			} else {
				ele1.studentsAvailable = false;
			}
		}
	}
	res.status(200).json(successResponse(classDetails[0], classDetails.length));
});

exports.DeletedAttendance = async (req, res, next) => {
	try {
		const deletedAttendance = await AttendanceModel.findByIdAndDelete(
			req.params.id
		);
		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Record Deleted Successfully',
			data: deletedAttendance,
		});
	} catch (err) {
		res.status(400).json({
			error: true,
			statusCode: 400,
			message: err.message,
		});
	}
};

exports.StudentAttendanceUpdate = async (req, res, next) => {
	try {
		const updateAttendance = await AttendanceModel.findOneAndUpdate(
			{
				_id: req.params.id,
				'attendanceDetails.student_id': req.body.student_id,
			},
			{
				$set: {
					'attendanceDetails.$.status': req.body.status,
				},
			},
			{
				new: true,
			}
		);

		if (!updateAttendance) {
			return res.json({
				error: true,
				statusCode: 400,
				message: 'Attendance not updated',
			});
		}

		res.status(200).json({
			error: false,
			statusCode: 200,
			message: 'Attendance Updated Successfully',
			data: updateAttendance,
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
