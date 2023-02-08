/* eslint-disable no-continue */
const moment = require('moment');
const mongoose = require('mongoose');
const SchoolModel = require('../model/school');
const User = require('../model/user');
const UserAttendance = require('../model/userAttendance');
const UserAttendanceReport = require('../model/userAttendanceReport');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

function getDailyDates(date) {
	let startDate = new Date(date);
	startDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate()
	);
	const endDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate() + 1
	);
	return { startDate, endDate };
}

/**
 * GetAll the userAttendance records by querying
 * @param {object} req.query
 * @returns {array} features with all attendance records.
 */
exports.getAll = catchAsync(async (req, res, next) => {
	let features = new APIFeatures(UserAttendance.find(), req.query)
		.filter()
		.limitFields()
		.paginate();
	features = await features.query;
	if (features.length === 0) {
		return next(new ErrorResponse('No attendance found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(features, features.length, 'Fetched Successfully'));
});

/**
 * Create a new Record, when the user marks the attendance.
 * @param {ObjectId} teacherId
 * @param {schoolId} schoolId
 * @param {string} status - enum properties ['PRESENT','ABSENT','LATE','PARTIAL']
 * @description The date and isApproved for the attendance is default, so no need to pass through body.
 * @returns {object} payload with created object.
 */
exports.create = catchAsync(async (req, res, next) => {
	const { teacherId, schoolId, date } = req.body;

	if (!teacherId || !schoolId) {
		return next(new ErrorResponse('schoolId and teacherId are required', 422));
	}
	const isTodayMarked = await UserAttendance.findOne({ teacherId, date });

	if (isTodayMarked) {
		return next(
			res
				.status(400)
				.json(new ErrorResponse('attendance is already marked', 400))
		);
	}

	const school = await SchoolModel.findOne(
		{ _id: schoolId },
		{ loginTime: 1 }
	).lean();

	if (!school.loginTime) {
		return next(new ErrorResponse('School must have loginTime', 400));
	}

	const isLate = new Date().getTime() > new Date(school.loginTime).getTime();
	const status = isLate ? 'LATE' : 'PRESENT';
	const payload = new UserAttendance({
		teacherId,
		schoolId,
		status,
		date,
	});
	await payload.save();

	res.status(201).json(SuccessResponse(payload, 1, 'Created Successfully'));
});

/**
 * Get the created/notCreated user attendance for that date and school with 7days.
 * @param {ObjectId} schoolId
 * @param {date} date - today's date
 * @description Fetches the last report, if first then fetch the users directly from usersDb and fill lastWeek with 'NOT_TAKEN'
 * @returns {array} result.
 */
exports.getAllAttendance = catchAsync(async (req, res, next) => {
	const lastWeek = new Array(7).fill('NOT_MARKED');
	const todayObj = {};
	const lastDay = {};
	const { schoolId, date } = req.query;
	if (!schoolId || !date) {
		return next(new ErrorResponse('schoolId and date are required', 422));
	}
	const currDate = moment.utc(date);
	let lastWeekDate = moment.utc(date).subtract(7, 'days');
	const yesterday = moment.utc(date).subtract(1, 'days');

	const isTodayMarked = await UserAttendance.find({
		schoolId,
		date: currDate._d,
	}).lean();
	if (isTodayMarked.length) {
		for (const rec of isTodayMarked) {
			todayObj[rec.teacherId] = rec.status;
		}
	}
	const users = await User.find(
		{ school_id: schoolId },
		{ _id: 1, profile_image: 1, name: 1, attendanceStats: 1 }
	).lean();
	if (users.length === 0) {
		return next(new ErrorResponse('No users found', 204));
	}
	const isWeekDoc = await UserAttendance.find({
		isApproved: true,
		schoolId,
		date: { $gte: lastWeekDate._d, $lt: currDate._d },
	})
		.sort({ date: -1 })
		.lean();

	if (isWeekDoc.length) {
		lastWeekDate = moment(isWeekDoc[0].date);
		const diffCount = yesterday.diff(lastWeekDate, 'days');
		const newArr = diffCount > 0 ? new Array(diffCount).fill('NOT_MARKED') : [];
		for (const el of isWeekDoc) {
			if (new Date(el.date).getDate() === lastWeekDate.date()) {
				// fill the remaining items in lastWeek
				el.lastWeek = [...el.lastWeek, ...newArr];
				el.lastWeek = el.lastWeek.splice(-7);
				el.status = todayObj[el.teacherId]
					? todayObj[el.teacherId]
					: 'NOT_MARKED';
				lastDay[el.teacherId] = {
					lastWeek: el.lastWeek,
					status: el.status,
				};
			} else {
				break;
			}
		}
	}

	for (const user of users) {
		if (lastDay[user._id]) {
			user.lastWeek = lastDay[user._id].lastWeek;
			user.status = lastDay[user._id].status;
		} else {
			user.lastWeek = lastWeek;
			user.status = todayObj[user._id] ? todayObj[user._id] : 'NOT_MARKED';
		}
	}
	res.status(200).json(SuccessResponse(users, users.length, 'Fetched User'));
});

/**
 * Update/Create (if Not created) the user attendance for that date and school with 7days.
 * @param {ObjectId} schoolId
 * @param {array} userList - Contains the object {teacherId, status}
 * @param {date} date
 * @description Run pre-update middleware for each user to update PALE count in monthly report document.
 * @returns Acknowledgement message.
 */
exports.updateAllAttendance = catchAsync(async (req, res, next) => {
	let statusInc;
	const userObj = {};
	const bulkOpsAtt = [];
	const bulkOpsRep = [];
	const bulkOpsUser = [];
	let lastWeek;
	const { schoolId, userList, date } = req.body;

	if (!schoolId || !userList || !date) {
		return res
			.status(422)
			.json(new ErrorResponse('schoolId, userList, and date is required', 422));
	}
	const tempDate = moment(date);
	const isTodayMarked = await UserAttendance.findOne({
		schoolId,
		date: tempDate._d,
		isApproved: true,
	});

	if (isTodayMarked) {
		return res.status(200).json(SuccessResponse([], 0, 'Already Confirmed'));
	}

	let startDate = moment.utc(date).subtract(7, 'day');
	const queryDate = moment.utc(date).subtract(7, 'day');
	const currDate = moment.utc(date).date();
	const month = moment.utc(date).month() + 1;
	const year = moment.utc(date).year();
	const dateArray = [];
	if (!startDate.isValid()) {
		return next(new ErrorResponse('Invalid date format', 400));
	}

	for (let i = 0; i < 7; i++) {
		dateArray.push(startDate.date()); // [8,9,10,11,12,13,14]
		startDate = moment(startDate, 'MM-DD-YYYY').add(1, 'day');
	}

	// Aggregation pipeline returning [{teacherId, weekObj: {day: status}}].
	const weekAttendance = await UserAttendance.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(schoolId),
				date: {
					$gte: queryDate._d,
					$lt: tempDate._d,
				},
			},
		},
		{
			$sort: {
				date: 1,
			},
		},
		{
			$group: {
				_id: '$teacherId',
				weekDate: {
					$addToSet: {
						day: {
							$dayOfMonth: '$date',
						},
						status: '$status',
					},
				},
			},
		},
		{
			$project: {
				teacherId: '$_id',
				weekDate: {
					$map: {
						input: '$weekDate',
						as: 'input',
						in: {
							k: {
								$toString: '$$input.day',
							},
							v: '$$input.status',
						},
					},
				},
			},
		},
		{
			$addFields: {
				weekObj: {
					$arrayToObject: '$weekDate',
				},
			},
		},
	]);
	if (weekAttendance.length > 0) {
		for (const el of weekAttendance) {
			userObj[el.teacherId] = el.weekObj;
		}
	}

	for (const user of userList) {
		lastWeek = new Array(6).fill('NOT_MARKED');
		if (weekAttendance.length) {
			const weekObj = userObj[user.teacherId];
			// eslint-disable-next-line no-loop-func
			const weekObjKeys = new Set(
				weekObj && typeof weekObj === 'object' ? Object.keys(weekObj) : []
			);

			for (const key of dateArray) {
				if (weekObj && weekObjKeys.has(String(key))) {
					lastWeek.push(weekObj[key]);
					continue;
				} else if (key === 1 && weekObj && weekObj[32]) {
					lastWeek.push(weekObj[32]);
					continue;
				}
				lastWeek.push('NOT_MARKED');
			}
			lastWeek = lastWeek.splice(-6);
		}
		lastWeek.push(user.status);
		switch (user.status) {
			case 'PRESENT':
				statusInc = { $inc: { 'attendanceStats.present': 1 } };
				break;
			case 'ABSENT':
				statusInc = { $inc: { 'attendanceStats.absent': 1 } };
				break;
			case 'LATE':
				statusInc = { $inc: { 'attendanceStats.late': 1 } };
				break;
			case 'EXCUSED':
				statusInc = { $inc: { 'attendanceStats.excused': 1 } };
				break;
			default:
				break;
		}
		bulkOpsAtt.push({
			updateOne: {
				filter: {
					teacherId: mongoose.Types.ObjectId(user.teacherId),
					date: tempDate._d,
					schoolId: mongoose.Types.ObjectId(schoolId),
				},
				update: {
					$set: {
						status: user.status,
						lastWeek,
						month,
						year,
						isApproved: true,
					},
				},
				upsert: true,
			},
		});
		bulkOpsUser.push({
			updateOne: {
				filter: { _id: user.teacherId },
				update: statusInc,
			},
		});

		const queryObj = {
			teacherId: user.teacherId,
			schoolId,
			month,
			year,
		};

		let foundAttendanceReport = await UserAttendanceReport.findOne(queryObj);

		if (!foundAttendanceReport) {
			foundAttendanceReport = await UserAttendanceReport.create({
				days: [],
				...queryObj,
			});
		}

		const currentIdx = foundAttendanceReport.days.findIndex(
			obj => obj.day === currDate
		);

		const dayObj = {
			day: currDate,
			status: user.status,
			workingHours: 0,
		};

		if (currentIdx < 0) {
			foundAttendanceReport.days.push(dayObj);
		} else {
			foundAttendanceReport.days[currentIdx] = dayObj;
		}
		// $inc: { view: counter },
		await foundAttendanceReport.save();
	}
	try {
		await UserAttendance.bulkWrite(bulkOpsAtt);
		await User.bulkWrite(bulkOpsUser);
	} catch (err) {
		console.log('catch error', err.message);
	}
	res
		.status(201)
		.json(SuccessResponse(null, userList.length, 'Marked Attendance'));
});

/**
 * Check User is in radius of his/her school
 * @param {longitude, latitude} req.body
 * @returns {object} foundAttendance with found object.
 */
exports.verifyLocation = catchAsync(async (req, res, next) => {
	const { longitude, latitude, school_id } = req.body;

	if (!longitude || !latitude)
		return next(new ErrorResponse('Longitude & Latitude is required', 400));

	const userSchool = await SchoolModel.findOne(
		{ _id: school_id },
		{ _id: 1, location: 1 }
	).lean();

	if (!userSchool)
		return next(new ErrorResponse('No school registed for this user', 404));

	const {
		location: { radius: radiusOfSchool = null },
	} = userSchool;

	if (!radiusOfSchool)
		return next(new ErrorResponse('Radius is not specified', 400));

	// Divide distance by radius of Earth
	// Earth Radius = 3,963.2 mi / 6,378 km
	const radius = radiusOfSchool / 3963.2;

	const foundSchool = await SchoolModel.findOne({
		_id: school_id,
		location: {
			$geoWithin: {
				$centerSphere: [[longitude, latitude], radius],
			},
		},
	});

	if (!foundSchool) return next(new ErrorResponse('Not in location', 403));

	return res.status(200).json(SuccessResponse('success', 1, 'In location'));
});

/**
 * Fetches the report of the teachers for the given month
 * @function
 * @async
 * @param {Object} req - Express request object (schoolId, date)
 * @param {Object} res - Express response object
 * @param {function} next - Express next middleware function
 * @returns {Object} - JSON object with attendance data and summary statistics
 * @throws {ErrorResponse} - When input is invalid or no data is found
 */
exports.report = catchAsync(async (req, res, next) => {
	let { schoolId, date } = req.query;
	let totalPresent = 0;
	let totalAbsent = 0;
	let totalLate = 0;
	let totalExcused = 0;

	if (!schoolId || !date) {
		return next(new ErrorResponse('Invalid input', 422));
	}

	date = moment(date);

	if (!date.isValid()) {
		return next(new ErrorResponse('Invalid date', 422));
	}

	const month = moment.utc(date).month() + 1;
	const year = moment.utc(date).year();
	const attendanceData = await UserAttendanceReport.find({
		schoolId,
		month,
		year,
	})
		.populate('teacherId', 'name attendanceStats profile_image username')
		.lean();

	if (attendanceData.length === 0) {
		return next(new ErrorResponse('No data found', 404));
	}

	for (const user of attendanceData) {
		totalPresent += user.present;
		totalAbsent += user.absent;
		totalLate += user.late;
		totalExcused += user.excused;

		user.days = (user.days || []).map(day => ({
			...day,
			date: moment(`${year}-${month}-${day.day}`, 'YYYY-MM-DD').add(1, 'days'),
		}));
	}

	const responseObj = {
		totalDaysMarked: totalPresent + totalAbsent + totalLate + totalExcused,
		totalPresent,
		totalAbsent,
		totalLate,
		totalExcused,
		attendanceData,
	};

	res.status(200).json(SuccessResponse(responseObj, 1, 'Fetched SuccessFully'));
});

/**
 * Fetches a Record for the given id.
 * @param {ObjectId} id
 * @returns {object} foundAttendance with found object.
 */
exports.getById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const foundAttendance = await UserAttendance.findById(id);
	if (!foundAttendance) {
		return next(new ErrorResponse('No Attendance Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(foundAttendance, 1, 'Fetched SuccessFully'));
});

/**
 * Updates a Record for the given id.
 * @param {ObjectId} id
 * @param {object} req.body
 * @returns {object} foundAttendance with updated object.
 */
exports.updateById = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const foundAttendance = await UserAttendance.findByIdAndUpdate(id, req.body, {
		new: true,
	});
	if (!foundAttendance) {
		return next(new ErrorResponse('No Attendance Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(foundAttendance, 1, 'updated SuccessFully'));
});

/**
 * Deletes a Record for the given id.
 * @param {ObjectId} id
 * @returns {null} foundAttendance with found object.
 */
exports.deleteById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const foundAttendance = await UserAttendance.findByIdAndDelete(id);
	if (!foundAttendance) {
		return next(new ErrorResponse('No Attendance Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 0, 'Deleted SuccessFully'));
});

/**
 * Fetches monthly calender for particular user with avg working hours and today status whether marked or not.
 * @param {ObjectId} teacherId
 * @param {date} date - DD/MM/YYYY format.
 * @description first db call for monthly object and second for checking istodaymarked.
 * @returns {object} foundAttendanceReport - With monthly attendance status.
 *
 */
exports.userMonthlyReport = catchAsync(async (req, res, next) => {
	const { teacherId, date } = req.query;
	const month = moment.utc(date).month() + 1;
	const year = moment.utc(date).year();

	const foundAttendanceReport = await UserAttendanceReport.findOne({
		teacherId,
		month,
		year,
	}).lean();
	if (!foundAttendanceReport) {
		return res
			.status(200)
			.json(SuccessResponse(null, 0, 'No Attendance Found'));
	}
	const { startDate, endDate } = getDailyDates(date);
	const isTodayMarked = await UserAttendance.findOne({
		teacherId,
		date: {
			$gte: startDate,
			$lt: endDate,
		},
	});
	foundAttendanceReport.days = (foundAttendanceReport.days || []).map(day => ({
		...day,
		date: moment(`${year}-${month}-${day.day}`, 'YYYY-MM-DD').add(1, 'days'),
	}));
	foundAttendanceReport.totalAttendance = foundAttendanceReport.days.length;
	foundAttendanceReport.today = isTodayMarked
		? isTodayMarked.status
		: 'NOT_MARKED';

	res.status(200).json(SuccessResponse(foundAttendanceReport, 1, 'success'));
});
