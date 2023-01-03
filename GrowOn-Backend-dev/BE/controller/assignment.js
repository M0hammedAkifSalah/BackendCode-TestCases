/* eslint-disable prefer-destructuring */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-loop-func */
/* eslint-disable no-unused-expressions */
const mongoose = require('mongoose');
const excel = require('excel4node');
const moment = require('moment');

const Assignment = require('../model/assignment');
const User = require('../model/user');
const Student = require('../model/student');
const { assignmentProjection } = require('../utils/const');
const firebaseNoti = require('../firebase');
const Group = require('../model/group');
const SectionModel = require('../model/section');
const CommentModel = require('../model/assignmentDoubt');
const AssignmentReportModel = require('../model/assignmentReport');
const AssignmentReportExcelModel = require('../model/assignmentExcel');
const catchAsync = require('../utils/catchAsync');
const successResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');
const School = require('../model/school');
const depositCoin = require('../helper/depositCoin');

function getDaysInMonth(month, year) {
	const date = new Date(`${year}-${month}-1`);
	const days = [];
	while (date.getMonth() + 1 === month) {
		days.push(new Date(date));
		date.setDate(date.getDate() + 1);
	}
	return days;
}

async function getSections(user_id) {
	const userData = await User.findOne(
		{ _id: mongoose.Types.ObjectId(user_id) },
		{ name: 1, primary_class: 1, secondary_class: 1, school_id: 1, coin: 1 }
	);
	const { secondary_class, school_id, primary_class, coin } = userData;
	let sectionList = await SectionModel.find(
		{
			class_id: primary_class,
			school: school_id,
		},
		{ _id: 1 }
	);
	sectionList = sectionList.map(e => mongoose.Types.ObjectId(e._id));
	for (const el of secondary_class) {
		for (const ele of el.section) {
			sectionList.push(ele);
		}
	}
	return { sectionList, coin };
}
/**
 * @param  {ObjectId} sectionId
 * @param  {Date} startDate
 * @param  {Date} endDate
 * @return sectionReport object with daily/weekly formatted data.
 */
async function getSectionReport(sectionId, startDate, endDate) {
	let sectionReport = await Assignment.aggregate([
		{
			$match: {
				'assignTo.section_id': mongoose.Types.ObjectId(sectionId),
				startDate: {
					$gte: new Date(startDate),
					$lt: new Date(endDate),
				},
			},
		},
		{
			$project: {
				report: {
					$objectToArray: '$report',
				},
				doubts_id: 1,
			},
		},
		{
			$lookup: {
				from: 'assignmentdoubts',
				let: {
					id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$assignment_id', '$$id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							total: 1,
							cleared: 1,
						},
					},
				],
				as: 'doubts',
			},
		},
		{
			$unwind: {
				path: '$doubts',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$unwind: {
				path: '$report',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$match: {
				'report.k': sectionId,
			},
		},
		{
			$group: {
				_id: '$report.k',
				totalAssignments: {
					$addToSet: '$_id',
				},
				totalDoubts: {
					$addToSet: '$doubts',
				},
				totalAssignTo: {
					$sum: '$report.v.totalAssignedTo',
				},
				notSubmitted: {
					$sum: '$report.v.notSubmitted',
				},
				Submitted: {
					$sum: '$report.v.submitted',
				},
				totalEvaluated: {
					$sum: '$report.v.evaluated',
				},
				reassigned: {
					$sum: '$report.v.reassigned',
				},
				lateSubmitted: {
					$sum: '$report.v.lateSubmitted',
				},
				isAbleTo: {
					$sum: '$report.v.isAbleTo',
				},
			},
		},
	]);
	if (sectionReport.length) {
		// eslint-disable-next-line prefer-destructuring
		sectionReport = sectionReport[0];
		let doubtsTotalCount;
		let doubtsClearedCount;
		const {
			totalAssignments,
			Submitted,
			notSubmitted,
			reassigned,
			lateSubmitted,
			totalAssignTo,
			totalEvaluated,
			isAbleTo,
			totalDoubts,
		} = sectionReport;
		sectionReport.totalAssignments = totalAssignments.length;
		sectionReport.submittedAVG = (Submitted / totalAssignTo) * 100;
		sectionReport.lateSubmittedAVG = (lateSubmitted / totalAssignTo) * 100;
		sectionReport.evaluatedAVG =
			(totalEvaluated / (lateSubmitted + Submitted)) * 100;
		sectionReport.reassigned = (reassigned / (lateSubmitted + Submitted)) * 100;
		sectionReport.outcome = (isAbleTo / totalEvaluated) * 100;
		sectionReport.notSubmittedAVG = (notSubmitted / totalAssignTo) * 100;
		if (totalDoubts.length) {
			doubtsTotalCount = totalDoubts.reduce((n, { total }) => n + total, 0);
			doubtsClearedCount = totalDoubts.reduce(
				(n, { cleared }) => n + cleared,
				0
			);
			sectionReport.doubts = (doubtsClearedCount / doubtsTotalCount) * 100;
		} else {
			sectionReport.doubts = 0;
		}
	}
	return { sectionReport };
}
// Single re-usable function for report: teacher(D, W, M), school(D, W), class(D, W).
// grouped based on flag
/**
 * @param  {ObjectId} id
 * @param  {Date} startDate
 * @param  {Date} endDate
 * @param  {String} flag
 * @return {Object} reportData
 */
async function getData(id, startDate, endDate, flag) {
	try {
		const payload = {};
		let doubtsClearedCount = 0;
		let doubtsTotalCount = 0;
		let groupBy;
		flag === 'teacher'
			? ((payload.teacher_id = mongoose.Types.ObjectId(id)),
			  (groupBy = '$teacher_id'))
			: null;
		flag === 'school'
			? ((payload.school_id = mongoose.Types.ObjectId(id)),
			  (groupBy = '$school_id'))
			: null;
		flag === 'class'
			? ((payload.class_id = mongoose.Types.ObjectId(id.classId)),
			  (payload.school_id = mongoose.Types.ObjectId(id.schoolId)),
			  (groupBy = '$class_id'))
			: null;
		let reportData = await Assignment.aggregate([
			{
				$match: {
					...payload,
					startDate: {
						$gte: new Date(startDate),
						$lt: new Date(endDate),
					},
				},
			},
			{
				$project: {
					school_id: 1,
					class_id: 1,
					teacher_id: 1,
					report: {
						$objectToArray: '$report',
					},
					doubts_id: 1,
				},
			},
			{
				$lookup: {
					from: 'assignmentdoubts',
					let: {
						id: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$assignment_id', '$$id'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								total: 1,
								cleared: 1,
							},
						},
					],
					as: 'doubts',
				},
			},
			{
				$unwind: {
					path: '$doubts',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$unwind: {
					path: '$report',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: groupBy,
					totalAssignments: {
						$addToSet: '$_id',
					},
					totalDoubts: {
						$addToSet: '$doubts',
					},
					totalAssignedTo: {
						$sum: '$report.v.totalAssignedTo',
					},
					notSubmitted: {
						$sum: '$report.v.notSubmitted',
					},
					Submitted: {
						$sum: '$report.v.submitted',
					},
					totalEvaluated: {
						$sum: '$report.v.evaluated',
					},
					reassigned: {
						$sum: '$report.v.reassigned',
					},
					lateSubmitted: {
						$sum: '$report.v.lateSubmitted',
					},
					isAbleTo: {
						$sum: '$report.v.isAbleTo',
					},
				},
			},
			{
				$addFields: {
					submittedAVG: {
						$multiply: [
							{
								$divide: ['$Submitted', '$totalAssignedTo'],
							},
							100,
						],
					},
					lateSubmittedAVG: {
						$multiply: [
							{
								$divide: ['$lateSubmitted', '$totalAssignedTo'],
							},
							100,
						],
					},
					notSubmittedAVG: {
						$multiply: [
							{
								$divide: ['$notSubmitted', '$totalAssignedTo'],
							},
							100,
						],
					},
					reassigned: {
						$multiply: [
							{
								$divide: [
									'$reassigned',
									{
										$sum: ['$lateSubmitted', '$Submitted'],
									},
								],
							},
							100,
						],
					},
					outcome: {
						$multiply: [
							{
								$divide: ['$isAbleTo', '$totalEvaluated'],
							},
							100,
						],
					},
					evaluatedAVG: {
						$multiply: [
							{
								$divide: [
									'$totalEvaluated',
									{
										$sum: ['$lateSubmitted', '$Submitted'],
									},
								],
							},
							100,
						],
					},
				},
			},
		]);
		console.log(reportData);
		reportData = reportData[0];
		reportData.totalAssignments = reportData.totalAssignments.length;
		if (reportData.totalDoubts.length) {
			doubtsTotalCount = reportData.totalDoubts.reduce(
				(n, { total }) => n + total,
				0
			);
			doubtsClearedCount = reportData.totalDoubts.reduce(
				(n, { cleared }) => n + cleared,
				0
			);
			reportData.doubts = (doubtsClearedCount / doubtsTotalCount) * 100;
		} else {
			reportData.doubts = 0;
		}
		return { reportData };
	} catch (err) {
		console.log('aggregation', err.message);
	}
}

async function getDataStudentList(
	schoolId,
	classId,
	sectionId,
	startDate,
	endDate
) {
	try {
		const payload = {};
		sectionId
			? ((payload.class = mongoose.Types.ObjectId(classId)),
			  (payload.school_id = mongoose.Types.ObjectId(schoolId)),
			  (payload.section = mongoose.Types.ObjectId(sectionId)))
			: classId
			? ((payload.class = mongoose.Types.ObjectId(classId)),
			  (payload.school_id = mongoose.Types.ObjectId(schoolId)))
			: (payload.school_id = mongoose.Types.ObjectId(schoolId));

		let reportData = await Student.aggregate([
			{
				$match: {
					...payload,
					deleted: false,
				},
			},
			{
				$project: {
					name: 1,
					profile_image: 1,
					school_id: 1,
					section: 1,
					assignment: 1,
				},
			},
			{
				$lookup: {
					from: 'assignments',
					let: {
						studentId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$school_id', mongoose.Types.ObjectId(schoolId)],
										},
										{
											$eq: ['$class_id', mongoose.Types.ObjectId(classId)],
										},
									],
								},
								startDate: {
									$gte: new Date(startDate),
									$lt: new Date(endDate),
								},
							},
						},
						{
							$unwind: '$assignTo',
						},
						{
							$match: {
								$expr: {
									$eq: ['$assignTo.student_id', '$$studentId'],
								},
							},
						},
						{
							$group: {
								_id: '$assignTo.student_id',
								totalAssignments: {
									$sum: 1,
								},
								notSubmitted: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.status', 'NOT_SUBMITTED'],
											},
											1,
											0,
										],
									},
								},
								Submitted: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.status', 'SUBMITTED'],
											},
											1,
											0,
										],
									},
								},
								evaluated: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.status', 'EVALUATED'],
											},
											1,
											0,
										],
									},
								},
								reassigned: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.status', 'REASIGNED'],
											},
											1,
											0,
										],
									},
								},
								lateSubmitted: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.status', 'LATE_SUBMITTED'],
											},
											1,
											0,
										],
									},
								},
								isAbleTo: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.isAbleTo', true],
											},
											1,
											0,
										],
									},
								},
								isNotAbleTo: {
									$sum: {
										$cond: [
											{
												$eq: ['$assignTo.isAbleTo', false],
											},
											1,
											0,
										],
									},
								},
							},
						},
					],
					as: 'assignmentData',
				},
			},
		]);
		reportData = JSON.parse(JSON.stringify(reportData));
		let weekData = await Student.aggregate([
			{
				$match: {
					...payload,
					deleted: false,
				},
			},
			{
				$project: {
					name: 1,
					profile_image: 1,
					school_id: 1,
					section: 1,
					assignment: 1,
				},
			},
			{
				$lookup: {
					from: 'assignments',
					let: {
						studentId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$school_id', mongoose.Types.ObjectId(schoolId)],
										},
										{
											$eq: ['$class_id', mongoose.Types.ObjectId(classId)],
										},
									],
								},
							},
						},
						{
							$limit: 7,
						},
						{
							$sort: {
								startDate: 1,
							},
						},
						{
							$unwind: '$assignTo',
						},
						{
							$match: {
								$expr: {
									$eq: ['$assignTo.student_id', '$$studentId'],
								},
							},
						},
						{
							$group: {
								_id: '$assignTo.student_id',
								lastWeekStatus: {
									$push: '$assignTo.status',
								},
							},
						},
					],
					as: 'assignmentData',
				},
			},
		]);
		weekData = JSON.parse(JSON.stringify(weekData));
		weekData.sort((a, b) => {
			const nameA = a.name.toUpperCase();
			const nameB = b.name.toUpperCase();
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}

			// names must be equal
			return 0;
		});
		reportData.sort((a, b) => {
			const nameA = a.name.toUpperCase();
			const nameB = b.name.toUpperCase();
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}
			return 0;
		});
		reportData.forEach(e => {
			if (e.assignmentData.length) {
				e.assignmentData[0].evaluatedAVG =
					(e.assignmentData[0].totalEvaluated /
						e.assignmentData[0].totalAssignments) *
					100;
				e.assignmentData[0].submitAVG =
					(e.assignmentData[0].Submitted /
						e.assignmentData[0].totalAssignments) *
					100;
				e.assignmentData[0].reassignAVG =
					(e.assignmentData[0].reassigned /
						e.assignmentData[0].totalAssignments) *
					100;
				e.assignmentData[0].lateSubmittedAVG =
					(e.assignmentData[0].lateSubmitted /
						e.assignmentData[0].totalAssignments) *
					100;
				weekData.forEach(ele => {
					if (e._id == ele._id) {
						e.weekData = ele.assignmentData
							? ele.assignmentData[0].lastWeekStatus
							: null;
					}
				});
				e.assignmentData = e.assignmentData[0];
			}
		});

		return { reportData };
	} catch (err) {
		console.log('aggregation', err.message);
	}
}

async function getStudentReport(studentId, startDate, endDate) {
	const studId = mongoose.Types.ObjectId(studentId);
	let studentReport = await Assignment.aggregate([
		{
			$match: {
				'assignTo.student_id': studId,
				startDate: {
					$gte: startDate,
					$lt: endDate,
				},
			},
		},
		{
			$project: {
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: {
							$eq: ['$$item.student_id', studId],
						},
					},
				},
			},
		},
		{
			$unwind: {
				path: '$assignTo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$assignTo.student_id',
				totalAssignments: {
					$sum: 1,
				},
				notSubmitted: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'NOT_SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				submitted: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				totalEvaluated: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'EVALUATED'],
							},
							1,
							0,
						],
					},
				},
				reassigned: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'REASIGNED'],
							},
							1,
							0,
						],
					},
				},
				lateSubmitted: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'LATE_SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				isAbleTo: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.isAbleTo', true],
							},
							1,
							0,
						],
					},
				},
				isNotAbleTo: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.isAbleTo', false],
							},
							1,
							0,
						],
					},
				},
			},
		},
	]);
	studentReport = studentReport[0];
	return { studentReport };
}
function getCurrentWeekDatesDay(startDate) {
	let date = new Date(startDate);
	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	let currentWeekStartDate = date;
	const currentWeekEndDate = date;
	while (currentWeekStartDate.getDay() != 1) {
		currentWeekStartDate = new Date(
			currentWeekStartDate.getFullYear(),
			currentWeekStartDate.getMonth(),
			currentWeekStartDate.getDate() - 1
		);
	}

	return { currentWeekStartDate, currentWeekEndDate };
}
async function AssignmentWithStudentData(id, isGroup) {
	let assignmentData = null;
	if (isGroup) {
		assignmentData = await Assignment.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(id),
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						id: '$teacher_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'teacher_id',
				},
			},
			{
				$lookup: {
					from: 'groups',
					let: {
						id: '$group_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								group_name: 1,
							},
						},
					],
					as: 'group_id',
				},
			},
			{
				$lookup: {
					from: 'schools',
					let: {
						id: '$school_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								schoolName: 1,
							},
						},
					],
					as: 'school_id',
				},
			},
			{
				$unwind: '$assignTo',
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						id: '$assignTo.section_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
								class_id: 1,
							},
						},
					],
					as: 'assignTo.section_id',
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						id: {
							$first: '$assignTo.section_id.class_id',
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'assignTo.class_id',
				},
			},
			{
				$lookup: {
					from: 'assignments',
					let: {
						studId: '$assignTo.student_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$studId', '$assignTo.student_id'],
								},
							},
						},
						{
							$limit: 7,
						},
						{
							$sort: {
								startDate: -1,
							},
						},
						{
							$project: {
								assignTo: {
									$filter: {
										input: '$assignTo',
										as: 'item',
										cond: {
											$eq: ['$$item.student_id', '$$studId'],
										},
									},
								},
							},
						},
						{
							$unwind: '$assignTo',
						},
						{
							$group: {
								_id: '$assignTo.student_id',
								status: {
									$push: '$assignTo.status',
								},
							},
						},
					],
					as: 'assignments',
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						studId: '$assignTo.student_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$studId'],
								},
							},
						},
						{
							$project: {
								name: 1,
								profile_image: 1,
								assigned: '$assignment.assigned',
								completed: '$assignment.completed',
							},
						},
					],
					as: 'students',
				},
			},
			{
				$group: {
					_id: '$_id',
					file: {
						$first: '$file',
					},
					title: {
						$first: '$title',
					},
					isGroup: {
						$first: '$isGroup',
					},
					subject: {
						$first: '$subject',
					},
					learning_Outcome: {
						$first: '$learning_Outcome',
					},
					description: {
						$first: '$description',
					},
					startDate: {
						$first: '$startDate',
					},
					EndDate: {
						$first: '$EndDate',
					},
					group_id: {
						$first: {
							$first: '$group_id',
						},
					},
					school_id: {
						$first: {
							$first: '$school_id',
						},
					},
					status: {
						$first: '$status',
					},
					coin: {
						$first: '$coin',
					},
					teacher_id: {
						$first: {
							$first: '$teacher_id',
						},
					},
					createdAt: {
						$first: '$createdAt',
					},
					updatedAt: {
						$first: '$updatedAt',
					},
					assignTo: {
						$push: {
							status: '$assignTo.status',
							isOffline: '$assignTo.isOffline',
							viewed: '$assignTo.viewed',
							isAbleTo: '$assignTo.isAbleTo',
							comment: '$assignTo.comment',
							coins: '$assignTo.coins',
							attachments: '$assignTo.attachments',
							student_id: {
								_id: '$assignTo.student_id',
								name: {
									$first: '$students.name',
								},
								profile_image: {
									$first: '$students.profile_image',
								},
								assignment: {
									assignments: {
										$first: '$assignments.status',
									},
									assigned: {
										$first: '$students.assigned',
									},
									completed: {
										$first: '$students.completed',
									},
								},
							},
							section_id: {
								$first: '$assignTo.section_id',
							},
							class_id: {
								$first: '$assignTo.class_id',
							},
						},
					},
				},
			},
		]);
	} else {
		assignmentData = await Assignment.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(id),
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						id: '$teacher_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'teacher_id',
				},
			},
			{
				$lookup: {
					from: 'schools',
					let: {
						id: '$school_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								schoolName: 1,
							},
						},
					],
					as: 'school_id',
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						id: '$class_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'class_id',
				},
			},
			{
				$unwind: '$assignTo',
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						id: '$assignTo.section_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'assignTo.section_id',
				},
			},
			{
				$lookup: {
					from: 'assignments',
					let: {
						studId: '$assignTo.student_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$studId', '$assignTo.student_id'],
								},
							},
						},
						{
							$limit: 7,
						},
						{
							$sort: {
								startDate: -1,
							},
						},
						{
							$project: {
								assignTo: {
									$filter: {
										input: '$assignTo',
										as: 'item',
										cond: {
											$eq: ['$$item.student_id', '$$studId'],
										},
									},
								},
							},
						},
						{
							$unwind: '$assignTo',
						},
						{
							$group: {
								_id: '$assignTo.student_id',
								status: {
									$push: '$assignTo.status',
								},
							},
						},
					],
					as: 'assignments',
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						studId: '$assignTo.student_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$studId'],
								},
							},
						},
						{
							$project: {
								name: 1,
								profile_image: 1,
								assigned: '$assignment.assigned',
								completed: '$assignment.completed',
							},
						},
					],
					as: 'students',
				},
			},
			{
				$group: {
					_id: '$_id',
					file: {
						$first: '$file',
					},
					title: {
						$first: '$title',
					},
					isGroup: {
						$first: '$isGroup',
					},
					subject: {
						$first: '$subject',
					},
					learning_Outcome: {
						$first: '$learning_Outcome',
					},
					description: {
						$first: '$description',
					},
					startDate: {
						$first: '$startDate',
					},
					EndDate: {
						$first: '$EndDate',
					},
					class_id: {
						$first: {
							$first: '$class_id',
						},
					},
					school_id: {
						$first: {
							$first: '$school_id',
						},
					},
					status: {
						$first: '$status',
					},
					coin: {
						$first: '$coin',
					},
					teacher_id: {
						$first: {
							$first: '$teacher_id',
						},
					},
					createdAt: {
						$first: '$createdAt',
					},
					updatedAt: {
						$first: '$updatedAt',
					},
					assignTo: {
						$push: {
							status: '$assignTo.status',
							isOffline: '$assignTo.isOffline',
							viewed: '$assignTo.viewed',
							isAbleTo: '$assignTo.isAbleTo',
							comment: '$assignTo.comment',
							coins: '$assignTo.coins',
							attachments: '$assignTo.attachments',
							student_id: {
								_id: '$assignTo.student_id',
								name: {
									$first: '$students.name',
								},
								profile_image: {
									$first: '$students.profile_image',
								},
								assignment: {
									assignments: {
										$first: '$assignments.status',
									},
									assigned: {
										$first: '$students.assigned',
									},
									completed: {
										$first: '$students.completed',
									},
								},
							},
							section_id: {
								$first: '$assignTo.section_id',
							},
						},
					},
				},
			},
		]);
	}
	return { assignmentData };
}

async function getMonthlyReport(school_id, month, year) {
	const data = await AssignmentReportModel.findOne({
		schoolId: school_id,
		month,
		year,
	}).lean();
	return data;
}

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
function getWeekDates(date) {
	let weekStart = new Date(date);
	weekStart = new Date(
		weekStart.getFullYear(),
		weekStart.getMonth(),
		weekStart.getDate() - 7
	);
	let weekEnd = new Date(date);
	weekEnd = new Date(
		weekEnd.getFullYear(),
		weekEnd.getMonth(),
		weekEnd.getDate()
	);
	return { weekStart, weekEnd };
}
function MonthlyDates(date, prev) {
	let monthStart = new Date(date);
	let monthEnd = new Date(date);
	if (prev) {
		const prevMonthStart = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth() - 1,
			1
		);
		const prevMonthEnd = new Date(
			monthEnd.getFullYear(),
			monthEnd.getMonth() - 1,
			monthEnd.getDate()
		);
		return { prevMonthStart, prevMonthEnd };
	}
	monthStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
	monthEnd = new Date(
		monthEnd.getFullYear(),
		monthEnd.getMonth(),
		monthEnd.getDate() + 1
	);
	return { monthStart, monthEnd };
}

async function getDetails(classId, sectionId, teacherId, date) {
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

	startDate.setHours(0, 0, 0, 0);
	endDate.setHours(0, 0, 0, 0);
	const { weekStart, weekEnd } = getWeekDates(date);
	weekStart.setHours(0, 0, 0, 0);
	weekEnd.setHours(23, 59, 59, 999);
	const matchQuery = {
		teacher_id: mongoose.Types.ObjectId(teacherId),
		startDate: {
			$gte: new Date(weekStart),
			$lt: new Date(weekEnd),
		},
	};
	const matchQuery1 = {
		teacher_id: mongoose.Types.ObjectId(teacherId),
		startDate: {
			$gt: new Date(startDate),
			$lte: new Date(endDate),
		},
	};

	if (classId) {
		matchQuery.class_id = mongoose.Types.ObjectId(classId);
		matchQuery1.class_id = mongoose.Types.ObjectId(classId);
	}

	if (sectionId) {
		matchQuery['assignTo.section_id'] = mongoose.Types.ObjectId(sectionId);
		matchQuery1['assignTo.section_id'] = mongoose.Types.ObjectId(sectionId);
	}
	const AssignmentData = await Assignment.aggregate([
		{
			$match: matchQuery,
		},
		{
			$addFields: {
				date: {
					$dateFromParts: {
						year: {
							$year: '$startDate',
						},
						month: {
							$month: '$startDate',
						},
						day: {
							$dayOfMonth: '$startDate',
						},
						timezone: '+0530',
					},
				},
			},
		},
		{
			$group: {
				_id: '$date',
				data: {
					$push: '$_id',
				},
			},
		},
		{
			$addFields: {
				count: {
					$size: '$data',
				},
			},
		},
		{
			$sort: {
				_id: 1,
			},
		},
	]);

	const data = await Assignment.aggregate([
		{
			$match: matchQuery1,
		},
		{
			$group: {
				_id: '$status',
				data: {
					$push: '$_id',
				},
			},
		},
		{
			$addFields: {
				count: {
					$size: '$data',
				},
			},
		},
	]);
	return { AssignmentData, data };
}

exports.AssignmentCreate = catchAsync(async (req, res, next) => {
	const report = {};
	const {
		isGroup,
		updatedBy,
		createdBy,
		startDate,
		EndDate,
		status,
		description,
		coin,
		subject,
		learning_Outcome,
		file,
		image,
		sub_title,
		assignTo,
		title,
		teacher_id,
		school_id,
		class_id,
		group_id,
	} = req.body;
	const AssignmentData = new Assignment({
		_id: new mongoose.Types.ObjectId(),
		title,
		sub_title,
		image,
		startDate,
		school_id,
		class_id,
		group_id,
		file,
		subject,
		teacher_id,
		learning_Outcome,
		coin,
		isGroup,
		description,
		status,
		EndDate,
		assignTo,
		created_by: createdBy,
		updated_by: updatedBy,
	});
	const teacherData = await User.findById(teacher_id);

	// TODO: find different sections from assignTo array and make them as properties in report object.
	// get the sections arrays from the payload. {sections: ['selsf234590','sdjfy2348975']}
	// sections.forEach(el => { report[el] = {} }); report: { section1: {}, section2: {} }
	// TODO: Keep the status as 0.

	await AssignmentData.save();

	await AssignmentData.populate(
		'assignTo.student_id assignTo.section_id',
		'name profile_image assignment DeviceToken'
	)
		.populate('teacher_id', 'name profile_image')
		.populate('school_id class_id group_id', 'name schoolName group_name')
		.execPopulate();

	res.status(201).json({
		status: 201,
		message: 'created successfully',
		data: AssignmentData,
	});

	try {
		const arrOfDeviceToken = [];
		const studentIds = [];

		AssignmentData.assignTo.forEach(({ DeviceToken = null, _id = null }) => {
			DeviceToken ? arrOfDeviceToken.push(DeviceToken) : null;
			_id ? studentIds.push(_id) : null;
		});

		let newImage;
		if (!teacherData.profile_image) {
			newImage = '';
		} else {
			const imageele = teacherData.profile_image.split('/');
			newImage = `${process.env.cloudFront100x100}${
				imageele[imageele.length - 1]
			}`;
		}

		const payload = {
			notification: {
				title: 'Assignment',
				body: title,
				image: newImage,
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'Assignment',
			},
		};

		firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);

		await depositCoin(5, teacherData._id, 'TEACHER');
		await Student.updateMany(
			{ _id: { $in: studentIds } },
			{ $inc: { 'assignment.assigned': 1 } }
		);
	} catch (err) {
		console.error(err);
	}
});

exports.getAllData = async (req, res) => {
	try {
		const AssignmentData = await Assignment.find();
		res.json({
			status: 200,
			results: AssignmentData.length,
			data: {
				AssignmentData,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getById = catchAsync(async (req, res, next) => {
	try {
		const { id } = req.params;
		let { isGroup } = req.query;
		isGroup = isGroup === 'true';
		const AssignmentData = await AssignmentWithStudentData(id, isGroup);
		if (!AssignmentData) {
			return res
				.status(404)
				.json(new ErrorResponse(404, 'No Assignments Found'));
		}
		res.json({
			status: 200,
			data: AssignmentData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
});

exports.deleteAssignment = catchAsync(async (req, res, next) => {
	try {
		const assignmentId = req.params.id;
		await Assignment.deleteOne({ _id: assignmentId });
		res.status(200).json({
			status: 200,
			message: 'Assignment deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
});

exports.AssignmentUpdate = catchAsync(async (req, res, next) => {
	try {
		const assignmentId = req.params.id;
		const AssignmentData = await Assignment.findOneAndUpdate(
			{ _id: assignmentId },
			req.body,
			{ new: true }
		)
			.populate(
				'assignTo.student_id assignTo.section_id',
				'name profile_image assignment'
			)
			.populate('teacher_id', 'name profile_image')
			.populate('class_id group_id school_id', 'name schoolName group_name')
			.populate('doubts_id', 'total');

		res.status(201).json({
			status: 201,
			data: AssignmentData,
			message: 'Assignment updated successfully',
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err.message,
		});
	}
});

exports.teacherReport = catchAsync(async (req, res, next) => {
	const { date, user_id, school_id } = req.body;
	let sectionList = null;
	let coin = 0;
	const payload = {};
	const dataObj = {};
	const { startDate, endDate } = getDailyDates(date);
	const { weekStart, weekEnd } = getWeekDates(date);
	if (user_id) {
		({ sectionList, coin } = await getSections(user_id));
		sectionList = sectionList.length;
	} else {
		sectionList = await SectionModel.count({ school: school_id });
	}
	user_id ? (payload.teacher_id = mongoose.Types.ObjectId(user_id)) : null;
	school_id ? (payload.school_id = mongoose.Types.ObjectId(school_id)) : null;
	const assignmentData = await Assignment.aggregate([
		{
			$facet: {
				sectionCount: [
					{
						$match: {
							...payload,
							startDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},

					{
						$project: {
							section: '$assignTo.section_id',
						},
					},
					{
						$unwind: '$section',
					},
					{
						$group: {
							_id: '$section',
						},
					},
				],
				weekData: [
					{
						$match: {
							...payload,
							startDate: {
								$gte: weekStart,
								$lt: weekEnd,
							},
						},
					},
					{
						$project: {
							day: {
								$dayOfMonth: '$startDate',
							},
							month: {
								$month: '$startDate',
							},
							year: {
								$year: '$startDate',
							},
							submissions: {
								$size: {
									$filter: {
										input: '$assignTo',
										as: 'item',
										cond: {
											$eq: ['$$item.status', 'SUBMITTED'],
										},
									},
								},
							},
						},
					},
					{
						$group: {
							_id: {
								day: '$day',
								month: '$month',
								year: '$year',
							},
							submissions: {
								$sum: '$submissions',
							},
							count: {
								$sum: 1,
							},
						},
					},
					{
						$sort: {
							_id: 1,
						},
					},
				],
				statusCount: [
					{
						$match: {
							...payload,
							startDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
					{
						$project: {
							teacher_id: 1,
							status: 1,
						},
					},
					{
						$group: {
							_id: '$teacher_id',
							toEvaluate: {
								$sum: {
									$cond: [
										{
											$eq: ['$status', 'PENDING'],
										},
										1,
										0,
									],
								},
							},
							evaluated: {
								$sum: {
									$cond: [
										{
											$eq: ['$status', 'EVALUATED'],
										},
										1,
										0,
									],
								},
							},
						},
					},
				],
			},
		},
	]);
	dataObj.coins = coin;
	dataObj.totalSection = sectionList;
	dataObj.assignedSection = assignmentData[0].sectionCount.length;
	dataObj.notAssignedSection = dataObj.totalSection - dataObj.assignedSection;
	dataObj.toEvaluate = assignmentData[0].statusCount[0]
		? assignmentData[0].statusCount[0].toEvaluate
		: 0;
	dataObj.evaluated = assignmentData[0].statusCount[0]
		? assignmentData[0].statusCount[0].evaluated
		: 0;
	dataObj.weekData = assignmentData[0].weekData;
	res.status(200).json({
		data: dataObj,
	});
});

exports.getNotassignedSections = catchAsync(async (req, res, next) => {
	const { user_id, date, school_id } = req.body;
	const payload = {};
	user_id ? (payload.teacher_id = mongoose.Types.ObjectId(user_id)) : null;
	school_id ? (payload.school_id = mongoose.Types.ObjectId(school_id)) : null;
	let sectionList = null;
	if (user_id) {
		({ sectionList } = await getSections(user_id));
	} else {
		sectionList = await SectionModel.find({ school: school_id }, { _id: 1 });
	}
	sectionList = sectionList.map(ele => ele._id);
	sectionList = JSON.parse(JSON.stringify(sectionList));
	const { startDate, endDate } = getDailyDates(date);
	let AssignedSections = await Assignment.aggregate([
		{
			$match: {
				isGroup: false,
				...payload,
				startDate: {
					$gte: startDate,
					$lt: endDate,
				},
			},
		},
		{
			$project: {
				section: '$assignTo.section_id',
			},
		},
		{
			$unwind: '$section',
		},
		{
			$group: {
				_id: '$section',
			},
		},
	]);
	AssignedSections = AssignedSections.map(ele => ele._id);
	AssignedSections = JSON.parse(JSON.stringify(AssignedSections));
	sectionList = sectionList.filter(val => !AssignedSections.includes(val));
	sectionList = sectionList.map(ele => mongoose.Types.ObjectId(ele));
	sectionList = await SectionModel.aggregate([
		{
			$match: {
				_id: {
					$in: sectionList,
				},
			},
		},
		{
			$project: {
				name: 1,
				class_id: 1,
			},
		},
		{
			$group: {
				_id: '$class_id',
				section: {
					$push: {
						_id: '$_id',
						name: '$name',
					},
				},
			},
		},
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
				as: '_id',
			},
		},
		{
			$unwind: '$_id',
		},
	]);
	if (!sectionList) {
		return res.status(404).json(new ErrorResponse(404, 'No sections found'));
	}
	res
		.status(200)
		.json(SuccessResponse(sectionList, sectionList.length, 'Fetched Sections'));
});

exports.getAllGroupCount = catchAsync(async (req, res, next) => {
	const { teacher_id, date, school_id } = req.body;
	const { startDate, endDate } = getDailyDates(date);
	const payload = {};
	teacher_id
		? (payload.teacher_id = mongoose.Types.ObjectId(teacher_id))
		: null;
	school_id ? (payload.school_id = mongoose.Types.ObjectId(school_id)) : null;
	const groupDetails = await Group.aggregate([
		{
			$match: payload,
		},
		{
			$project: {
				teacher_id: 1,
				group_name: 1,
			},
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					user: '$teacher_id',
					group: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$teacher_id', '$$user'],
									},
									{
										$eq: ['$group_id', '$$group'],
									},
								],
							},
							isGroup: true,
							startDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
					{
						$project: {
							assignTo: 1,
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$group_id',
							submission: {
								$push: '$assignTo',
							},
						},
					},
					{
						$project: {
							submission: {
								$size: {
									$filter: {
										input: '$submission',
										as: 'item',
										cond: {
											$eq: ['$$item.status', 'SUBMITTED'],
										},
									},
								},
							},
						},
					},
				],
				as: 'Assignment',
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					user: '$teacher_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$user'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'teacher_id',
			},
		},
		{
			$project: {
				group_name: 1,
				teacher_id: {
					$first: '$teacher_id',
				},
				submission: {
					$first: '$Assignment.submission',
				},
			},
		},
	]);
	if (!groupDetails) {
		return res.status(404).json(new ErrorResponse(404, 'No Groups Found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(groupDetails, groupDetails.length, 'Fetched Successfully')
		);
});

exports.teacherMonthlyReport = catchAsync(async (req, res, next) => {
	const { date, teacherId } = req.query;
	const prev = false;
	const { monthStart, monthEnd } = MonthlyDates(date, prev);
	const { reportData } = await getData(
		teacherId,
		monthStart,
		monthEnd,
		'teacher'
	);
	if (!reportData && reportData.length) {
		return res.status(201).json(new ErrorResponse(204, 'No assignments found'));
	}
	res.status(200).json({
		status: 'success',
		data: reportData,
		// prevMonth,
	});
});

exports.getGroupDetails = catchAsync(async (req, res, next) => {
	const { user_id } = req.params;
	const groupData = await Group.aggregate([
		{
			$match: {
				teacher_id: mongoose.Types.ObjectId(user_id),
			},
		},
		{
			$project: {
				students: 1,
				group_name: 1,
			},
		},
		{
			$unwind: '$students',
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					studId: '$students',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$studId', '$assignTo.student_id'],
							},
						},
					},
					{
						$limit: 7,
					},
					{
						$sort: {
							startDate: -1,
						},
					},
					{
						$project: {
							assignTo: {
								$filter: {
									input: '$assignTo',
									as: 'item',
									cond: {
										$eq: ['$$item.student_id', '$$studId'],
									},
								},
							},
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$assignTo.student_id',
							status: {
								$push: '$assignTo.status',
							},
						},
					},
				],
				as: 'assignments',
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					studId: '$students',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$studId'],
							},
						},
					},
					{
						$project: {
							name: 1,
							profile_image: 1,
							class: 1,
							section: 1,
							school_id: 1,
							assigned: '$assignment.assigned',
							completed: '$assignment.completed',
						},
					},
				],
				as: 'students',
			},
		},
		{
			$unwind: '$students',
		},
		{
			$project: {
				students: 1,
				group_name: 1,
				assignments: {
					$first: '$assignments.status',
				},
			},
		},
		{
			$group: {
				_id: '$_id',
				group_name: {
					$first: '$group_name',
				},
				studentList: {
					$push: {
						_id: '$students._id',
						profile_image: '$students.profile_image',
						name: '$students.name',
						class: '$students.class',
						section: '$students.section',
						school_id: '$students.school_id',
						group_id: '$_id',
						assigned: '$students.assigned',
						completed: '$students.completed',
						assignments: '$assignments',
					},
				},
			},
		},
	]);
	if (!groupData) {
		return res.status(404).json(new ErrorResponse(404, 'no groups found'));
	}
	res
		.status(200)
		.json(SuccessResponse(groupData, groupData.length, 'Fetched Sucessfully'));
});

exports.getClassDetails = catchAsync(async (req, res, next) => {
	const { user_id } = req.params;
	const { sectionList } = await getSections(user_id);
	const studentData = await Student.aggregate([
		{
			$match: {
				section: {
					$in: sectionList,
				},
			},
		},
		{
			$project: {
				_id: 1,
				profile_image: 1,
				class: 1,
				name: 1,
				section: 1,
				school_id: 1,
				assigned: '$assignment.assigned',
				completed: '$assignment.completed',
			},
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$studId', '$assignTo.student_id'],
							},
						},
					},
					{
						$limit: 7,
					},
					{
						$sort: {
							startDate: -1,
						},
					},
					{
						$project: {
							assignTo: {
								$filter: {
									input: '$assignTo',
									as: 'item',
									cond: {
										$eq: ['$$item.student_id', '$$studId'],
									},
								},
							},
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$assignTo.student_id',
							status: {
								$push: '$assignTo.status',
							},
						},
					},
				],
				as: 'assignments',
			},
		},
		{
			$project: {
				_id: 1,
				profile_image: 1,
				class: 1,
				name: 1,
				section: 1,
				school_id: 1,
				assigned: 1,
				completed: 1,
				assignments: {
					$first: '$assignments.status',
				},
			},
		},
		{
			$group: {
				_id: {
					class: '$class',
					section: '$section',
				},
				students: {
					$push: {
						_id: '$_id',
						name: '$name',
						class: '$class',
						section: '$section',
						school_id: '$school_id',
						profile_image: '$profile_image',
						assigned: '$assigned',
						completed: '$completed',
						assignments: '$assignments',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section: '$_id.section',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$section'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: '_id.section',
			},
		},
		{
			$unwind: '$_id.section',
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class: '$_id.class',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: '_id.class',
			},
		},
		{
			$unwind: '$_id.class',
		},
		{
			$group: {
				_id: '$_id.class',
				sectionList: {
					$push: {
						section: '$_id.section',
						students: '$students',
					},
				},
			},
		},
	]);
	res.status(200).json({
		data: studentData,
	});
});

exports.evaluate = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { students = [] } = req.body;
	const arrOfDeviceToken = [];
	let coinsToTeacher = 0;

	let foundAssignment = await Assignment.findOne({ _id: id }).populate(
		'teacher_id assignTo.student_id',
		'_id profile_image rewards DeviceToken assignement'
	);

	const { title: assignmentTitle, isGroup, teacher_id } = foundAssignment;

	if (!foundAssignment) {
		return next(new ErrorResponse('Assignment not found', 404));
	}

	const studsToEvaluate = {};
	students.forEach(stud => {
		studsToEvaluate[stud.student_id] = stud;
	});

	const { assignTo: assignToArr } = foundAssignment;

	for (const assTo of assignToArr) {
		const { isOffline } = assTo;
		const { _id: studentId, DeviceToken } = assTo.student_id;

		const evaluateDetail = studsToEvaluate[studentId];

		if (evaluateDetail) {
			const { status, comment, isAbleTo, coins, attachments } = evaluateDetail;

			if (isOffline && status === 'EVALUATED') {
				coinsToTeacher += 3;
			} else if (status === 'EVALUATED') {
				coinsToTeacher += 2;
			}

			assTo.status = status;
			assTo.comment = attachments.text || comment;
			assTo.isAbleTo = isAbleTo;
			assTo.coins = coins;
			assTo.attachments.push(attachments);

			if (
				(attachments.submissionStatus == 'SUBMITTED' ||
					attachments.submissionStatus == 'LATE_SUBMITTED') &&
				DeviceToken
			) {
				arrOfDeviceToken.push(DeviceToken);
			}
		}
	}

	foundAssignment.assignTo = assignToArr;
	await foundAssignment.save();

	foundAssignment = await AssignmentWithStudentData(id, isGroup);

	res
		.status(200)
		.json(
			successResponse(
				foundAssignment,
				foundAssignment.length,
				'Updated Successfully'
			)
		);

	try {
		for (const stud of students) {
			const {
				student_id,
				coins = 0,
				attachments: { submissionStatus = null },
			} = stud;

			if (
				student_id &&
				submissionStatus &&
				(submissionStatus == 'SUBMITTED' ||
					submissionStatus == 'LATE_SUBMITTED')
			) {
				await Student.updateOne(
					{ _id: student_id },
					{ $inc: { 'assignment.completed': 1 } }
				);
				await depositCoin(coins, student_id, 'STUDENT');
			}
		}

		await depositCoin(coinsToTeacher, teacher_id._id, 'TEACHER');

		const payload = {
			notification: {
				title: `Assignment`,
				body: assignmentTitle,
				image: teacher_id.profile_image ? teacher_id.profile_image : '',
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'assignment',
			},
		};
		if (arrOfDeviceToken.length) {
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
	} catch (err) {
		console.error(err);
	}
});

exports.Updatestatus = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	try {
		const exam = await Assignment.findById(id);
		if (!exam) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const updateExam = await Assignment.findByIdAndUpdate(
				id,
				{
					status: 'Evaluated',
				},
				{ new: true }
			);
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
});

exports.dashboard = catchAsync(async (req, res, next) => {
	const { date } = req.query;
	const { startDate, endDate } = getDailyDates(date);
	const assignmentData = await Assignment.aggregate([
		{
			$match: {
				startDate: {
					$gte: startDate,
					$lt: endDate,
				},
			},
		},
		{
			$project: {
				school_id: 1,
				report: {
					$objectToArray: '$report',
				},
			},
		},
		{
			$unwind: {
				path: '$report',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$school_id',
				totalAssignments: {
					$addToSet: '$_id',
				},
				totalSectionsAssigned: {
					$addToSet: '$report.k',
				},
				totalAssignedTo: {
					$sum: '$report.v.totalAssignedTo',
				},
				totalSubmitted: {
					$sum: '$report.v.submitted',
				},
				totalEvaluated: {
					$sum: '$report.v.evaluated',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: '_id',
				foreignField: 'school',
				as: 'sectionData',
			},
		},
		{
			$addFields: {
				sectionCount: {
					$size: '$sectionData',
				},
				totalSectionsAssigned: {
					$size: '$totalSectionsAssigned',
				},
				totalSectionsCount: {
					$size: '$sectionData',
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
						},
					},
				],
				as: '_id',
			},
		},
		{
			$project: {
				_id: 0,
				schoolName: {
					$first: '$_id.schoolName',
				},
				school_id: {
					$first: '$_id._id',
				},
				totalAssignments: {
					$size: '$totalAssignments',
				},
				usage: {
					$multiply: [
						{
							$divide: ['$totalSectionsAssigned', '$sectionCount'],
						},
						100,
					],
				},
				totalSubmitted: {
					$multiply: [
						{
							$divide: ['$totalSubmitted', '$totalAssignedTo'],
						},
						100,
					],
				},
				totalEvaluated: {
					$multiply: [
						{
							$divide: ['$totalEvaluated', '$totalAssignedTo'],
						},
						100,
					],
				},
			},
		},
		{
			$sort: {
				schoolName: 1,
			},
		},
	]);
	if (!assignmentData) {
		return res.status(204).json(new ErrorResponse(204, 'No Data Found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(
				assignmentData,
				assignmentData.length,
				'Fetched SuccessFully'
			)
		);
});

exports.dashboardSections = catchAsync(async (req, res, next) => {
	const { schoolId, date } = req.query;

	if (!schoolId || !date) {
		return next(new ErrorResponse('schoolid and date is required', 400));
	}

	const month = moment(date).month() + 1;
	const year = moment(date).year();

	let foundReport = await AssignmentReportModel.findOne({
		schoolId,
		month,
		year,
	})
		.populate('schoolId', 'schoolName schoolImage')
		.lean();

	if (!foundReport) {
		foundReport = {};
		foundReport.schoolId = await School.findOne({ _id: schoolId })
			.select('schoolName schoolImage')
			.lean();
		foundReport.sections = [];
	}

	const sectionsMap = {};

	foundReport?.sections.forEach(obj => {
		sectionsMap[obj.section_id] = { ...obj };
	});

	const sectionsOfSchool = await SectionModel.find(
		{ school: schoolId },
		{ _id: 1, name: 1 }
	)
		.populate('class_id', 'name')
		.lean();

	const defaultObj = {
		totalAssigned: 0,
		totalAssignment: 0,
		notSubmitted: 0,
		submitted: 0,
		evaluated: 0,
		reassigned: 0,
		lateSubmitted: 0,
		isAbleTo: 0,
		isNotAbleTo: 0,
	};

	foundReport.sections = sectionsOfSchool.map(section => {
		const newObj = {
			...defaultObj,
			...sectionsMap[section._id],
			name: `${section.class_id?.name} ${section.name}`,
		};

		return newObj;
	});

	res.status(200).json(SuccessResponse(foundReport, 1, ''));
});

/**
 * @param  {Date} date // single day is passed through query
 * @param  {ObjectId} schoolId // schoolId is passed through query.
 * @return {Object} data containing the sectionWise sorted assignment report and status.
 */
exports.ReportSectionList = catchAsync(async (req, res, next) => {
	const sectionMap = {};
	const responseObj = {};
	const { date, schoolId } = req.query;
	if (!date || !schoolId) {
		return res
			.status(400)
			.json(new ErrorResponse('date and schoolId is required'));
	}
	// Get startDate and endDate from customized function.
	const { startDate, endDate } = getDailyDates(date);
	const month = moment(date, 'MM-DD-YYYY').month() + 1;
	// Get all the sections from db by schoolId with classname and sequence_number populated.
	// @param schoolId
	let sectionList = await SectionModel.find(
		{ school: schoolId },
		{ _id: 1, name: 1 }
	)
		.populate('class_id', 'name sequence_number')
		.lean();
	if (sectionList.length === 0) {
		return res.status(204).json(new ErrorResponse('No sections Found'));
	}
	// restructure the sectionList array for the looping and matching the condition.
	sectionList = sectionList.map(el => ({
		_id: el._id,
		className: el.class_id.name,
		sectionName: el.name,
		sequence_number: el.class_id.sequence_number,
		status: false,
	}));
	/**
	 * @param {object} schoolId
	 * @param {date} startDate and endDate
	 * @return {array} foundAssignments with existing created report for the date passed.
	 */
	const foundAssignments = await Assignment.aggregate([
		{
			$facet: {
				sections: [
					{
						$match: {
							isGroup: false,
							school_id: mongoose.Types.ObjectId(schoolId),
							startDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
					{
						$project: {
							report: {
								$objectToArray: '$report',
							},
						},
					},
					{
						$unwind: {
							path: '$report',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$group: {
							_id: '$report.k',
							totalAssignments: {
								$addToSet: '$_id',
							},
							submitted: {
								$sum: '$report.v.submitted',
							},
							lateSubmitted: {
								$sum: '$report.v.lateSubmitted',
							},
							evaluated: {
								$sum: '$report.v.evaluated',
							},
							assignedTo: {
								$sum: '$report.v.totalAssignedTo',
							},
						},
					},
					{
						$project: {
							_id: 1,
							totalAssignments: {
								$size: '$totalAssignments',
							},
							submitted: {
								$multiply: [
									{
										$cond: [
											{
												$gt: [
													{
														$add: [
															{
																$sum: '$submitted',
															},
															{
																$sum: '$lateSubmitted',
															},
														],
													},
													0,
												],
											},
											{
												$divide: [
													{
														$add: [
															{
																$sum: '$submitted',
															},
															{
																$sum: '$lateSubmitted',
															},
														],
													},
													'$assignedTo',
												],
											},
											0,
										],
									},
									100,
								],
							},
							evaluated: {
								$multiply: [
									{
										$cond: [
											{
												$gt: ['$evaluated', 0],
											},
											{
												$divide: [
													'$evaluated',
													{
														$add: [
															{
																$sum: '$submitted',
															},
															{
																$sum: '$lateSubmitted',
															},
														],
													},
												],
											},
											0,
										],
									},
									100,
								],
							},
						},
					},
				],
				school: [
					{
						$match: {
							school_id: mongoose.Types.ObjectId(schoolId),
							$expr: {
								$eq: [
									{
										$month: '$EndDate',
									},
									month,
								],
							},
						},
					},
					{
						$project: {
							school_id: 1,
							report: {
								$objectToArray: '$report',
							},
						},
					},
					{
						$unwind: {
							path: '$report',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$group: {
							_id: '$school_id',
							totalAssignments: {
								$sum: 1,
							},
							lateSubmitted: {
								$sum: '$report.v.lateSubmitted',
							},
							submitted: {
								$sum: '$report.v.submitted',
							},
							evaluated: {
								$sum: '$report.v.evaluated',
							},
						},
					},
					{
						$addFields: {
							totalsubmitted: {
								$sum: ['$submitted', '$lateSubmitted'],
							},
						},
					},
				],
			},
		},
	]);
	const { sections, school } = foundAssignments[0];
	sections.forEach(el => {
		sectionMap[el._id] = {
			status: true,
			submitted: el.submitted,
			evaluated: el.evaluated,
			totalAssignments: el.totalAssignments,
		};
	});
	// Loop through sectionList and match the existing sectionIds and update the foundSection Object.
	sectionList = sectionList.map(ele => ({
		...ele,
		...sectionMap[ele._id.toString()],
	}));
	// const foundSection = sectionMap[ele._id];
	// if (foundSection) {
	// 	ele.status = true;
	// 	ele.totalAssignments = foundSection.totalAssignments;
	// 	ele.evaluated = foundSection.evaluated;
	// 	ele.submitted = foundSection.submitted;
	// }

	sectionList.sort((a, b) => a.sequence_number - b.sequence_number);
	responseObj.schoolData = school[0];
	responseObj.sectionData = sectionList;
	res.status(200).json(SuccessResponse(responseObj, 1, 'Success'));
});

exports.weekAssignmentCount = catchAsync(async (req, res, next) => {
	const payload = {};
	const { sectionId, classId, groupId, date } = req.query;
	sectionId
		? (payload['assignTo.section_id'] = mongoose.Types.ObjectId(sectionId))
		: null;
	classId ? (payload.class_id = mongoose.Types.ObjectId(classId)) : null;
	groupId ? (payload.group_id = mongoose.Types.ObjectId(groupId)) : null;
	const { weekStart, weekEnd } = getWeekDates(date);
	const { startDate, endDate } = getDailyDates(date);

	const weekReport = await Assignment.aggregate([
		{
			$facet: {
				weekData: [
					{
						$match: {
							...payload,
							startDate: {
								$gte: weekStart,
								$lt: weekEnd,
							},
						},
					},
					{
						$project: {
							day: {
								$dayOfMonth: '$startDate',
							},
							month: {
								$month: '$startDate',
							},
							year: {
								$year: '$startDate',
							},
						},
					},
					{
						$group: {
							_id: {
								day: '$day',
								month: '$month',
								year: '$year',
							},
							count: {
								$sum: 1,
							},
						},
					},
					{
						$sort: {
							_id: 1,
						},
					},
				],
				todayStatus: [
					{
						$match: {
							...payload,
							startDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
					{
						$group: {
							_id: '$status',
							data: {
								$push: '$_id',
							},
						},
					},
					{
						$addFields: {
							count: {
								$size: '$data',
							},
						},
					},
				],
			},
		},
	]);
	if (!weekReport) {
		res.status(404).json(new ErrorResponse(404, 'No Assignments Found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(weekReport, weekReport.length, 'Fetched Successfully')
		);
});

exports.reassign = catchAsync(async (req, res, next) => {
	try {
		const studentId = req.body.student_id;
		const { assignmentId, text } = req.body;
		const assignment = await Assignment.updateOne(
			{
				_id: assignmentId,
				'assignTo.student_id': studentId,
			},
			{
				$set: {
					'assignTo.$.status': 'REASSIGNED',
					'assignTo.$.comment': text,
					status: 'PENDING',
				},
			},
			{ new: true }
		).populate('created_by', 'profile_image');

		const studentData = await Student.findById(studentId);
		await Student.updateOne(
			{
				_id: studentId,
			},
			{
				$set: {
					'assignment.completed': studentData.assignment.completed - 1,
				},
			}
		);
		const arrOfDeviceToken = [];
		const studentData11 = await Student.findById(studentId);
		if (studentData && studentData.DeviceToken) {
			arrOfDeviceToken.push(studentData11.DeviceToken);
		}
		const payload = {
			notification: {
				title: `Reassigned Assignment`,
				body: assignment.title,
				image: assignment.created_by.profile_image
					? assignment.created_by.profile_image
					: '',
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'assignment',
			},
		};
		if (arrOfDeviceToken.length) {
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}

		res.status(200).json({
			status: 'Re work Assigned successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.groupCount = catchAsync(async (req, res, next) => {
	try {
		const { groupList } = req.body;
		const group = groupList.map(x => mongoose.Types.ObjectId(x));
		const count = await Assignment.aggregate([
			{
				$match: {
					group_id: {
						$in: group,
					},
				},
			},
			{
				$unwind: '$assignTo',
			},
			{
				$group: {
					_id: '$group_id',
					evaluated_count: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$status', 'EVALUATED'],
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
									$eq: ['$status', 'PENDING'],
								},
								then: 1,
								else: 0,
							},
						},
					},
				},
			},
		]);

		res.status(200).json({
			status: 'success',
			data: count,
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.classSectionCount = async (req, res, next) => {
	try {
		const { classList, sectionList } = req.body;
		const foundClass = classList.map(x => mongoose.Types.ObjectId(x));
		const section = sectionList.map(x => mongoose.Types.ObjectId(x));
		const count = await Assignment.aggregate([
			{
				$match: {
					class_id: {
						$in: foundClass,
					},
					'assignTo.section_id': {
						$in: section,
					},
					isGroup: false,
				},
			},
			{
				$unwind: '$assignTo',
			},
			{
				$group: {
					_id: {
						class_id: '$class_id',
						section_id: '$assignTo.section_id',
					},
					evaluated_count: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$status', 'EVALUATED'],
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
									$eq: ['$status', 'PENDING'],
								},
								then: 1,
								else: 0,
							},
						},
					},
				},
			},
		]);

		res.status(200).json({
			status: 'success',
			data: count,
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.classSectionCount = catchAsync(async (req, res, next) => {
	try {
		const { classList, sectionList } = req.body;
		const classes = classList.map(x => mongoose.Types.ObjectId(x));
		const section = sectionList.map(x => mongoose.Types.ObjectId(x));
		const count = await Assignment.aggregate([
			{
				$match: {
					class_id: {
						$in: classes,
					},
					'assignTo.section_id': {
						$in: section,
					},
					isGroup: false,
				},
			},
			{
				$unwind: '$assignTo',
			},
			{
				$group: {
					_id: {
						class_id: '$class_id',
						section_id: '$assignTo.section_id',
					},
					evaluated_count: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$status', 'EVALUATED'],
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
									$eq: ['$status', 'PENDING'],
								},
								then: 1,
								else: 0,
							},
						},
					},
				},
			},
		]);

		res.status(200).json({
			status: 'success',
			data: count,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.statusCount = catchAsync(async (req, res, next) => {
	try {
		const count = await Assignment.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(req.params.id),
				},
			},
			{
				$project: {
					submitted_count: {
						$size: {
							$filter: {
								input: '$assignTo',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'SUBMITTED'],
								},
							},
						},
					},
					not_submitted_count: {
						$size: {
							$filter: {
								input: '$assignTo',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'NOT_SUBMITTED'],
								},
							},
						},
					},
					late_submitted_count: {
						$size: {
							$filter: {
								input: '$assignTo',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'LATE_SUBMITTED'],
								},
							},
						},
					},
					reassign_count: {
						$size: {
							$filter: {
								input: '$assignTo',
								as: 'item',
								cond: {
									$eq: ['$$item.status', 'REASSIGNED'],
								},
							},
						},
					},
				},
			},
		]);

		res.status(200).json({
			status: 'success',
			data: count,
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.getAssignment = catchAsync(async (req, res, next) => {
	const {
		teacher_id,
		school_id,
		StartDate,
		status,
		isGroup,
		class_id,
		section_id,
		group_id,
		searchVal = null,
	} = req.body;
	const payload = {};
	const { startDate, endDate } = getDailyDates(StartDate);
	payload.startDate = {
		$gte: startDate,
		$lt: endDate,
	};
	if (status) {
		payload.status = {
			$in: status,
		};
	}
	if (group_id) {
		payload.group_id = group_id;
		payload.isGroup = true;
	}
	teacher_id ? (payload.teacher_id = teacher_id) : null;
	school_id ? (payload.school_id = school_id) : null;
	class_id ? (payload.class_id = class_id) : null;
	section_id ? (payload['assignTo.section_id'] = section_id) : null;
	if (searchVal) {
		payload.$text = { $search: searchVal };
	}

	const count = await Assignment.find(payload)
		.populate(
			'assignTo.student_id assignTo.section_id',
			'name profile_image assignment'
		)
		.populate('teacher_id', 'name profile_image')
		.populate('class_id group_id school_id', 'name schoolName group_name')
		.populate('doubts_id', 'total')
		.sort({ createdAt: -1 })
		.lean();

	// const classes = [];
	// const sections = [];
	// for (const ele of count) {
	// 	const not_submitted = [];
	// 	const submitted = [];
	// 	const reassign = [];
	// 	const late_submit = [];
	// 	let views = 0;
	// 	const viewed = [];
	// 	const not_viewed = [];
	// 	const group = [];
	// 	ele.assignTo.forEach(e => {
	// 		if (e.viewed == true) {
	// 			views += 1;
	// 			viewed.push(e);
	// 		}
	// 		if (e.viewed == false) {
	// 			not_viewed.push(e);
	// 		}
	// 		const index = classes.findIndex(x => x.class_id == e.class_id._id);
	// 		if (index == -1) {
	// 			if (e.section_id && e.section_id._id) {
	// 				const index2 = sections.findIndex(
	// 					x => x.section_id == e.section_id._id
	// 				);
	// 				if (index2 == -1) {
	// 					sections.push({
	// 						_id: e.class_id._id,
	// 						name: e.class_id.name,
	// 						section_id: e.section_id ? e.section_id._id : '',
	// 						section_name: e.section_id ? e.section_id.name : '',
	// 						school_id: e.school_id,
	// 						students: [e],
	// 					});
	// 				} else {
	// 					sections[index2].students.push(e);
	// 				}
	// 				classes.push({
	// 					class_id: e.class_id._id,
	// 					class_name: e.class_id.name,
	// 					section: sections,
	// 				});
	// 			}
	// 		} else {
	// 			classes[index].section[0].students.push(e);
	// 		}
	// 		if (e.group_id) {
	// 			const index1 = group.findIndex(x => x._id == e.group_id._id);
	// 			if (index1 == -1) {
	// 				group.push({
	// 					_id: e.group_id._id,
	// 					name: e.group_id.name,
	// 					class_id: e.class_id._id,
	// 					class_name: e.class_id.name,
	// 					section_id: e.section_id ? e.section_id._id : '',
	// 					section_name: e.section_id ? e.section_id.name : '',
	// 					school_id: e.school_id,
	// 					students: [e],
	// 				});
	// 			} else {
	// 				group[index1].students.push(e);
	// 			}
	// 		}
	// 	});

	// 	ele.viewed = viewed.length;
	// 	ele.submitted = submitted.length;
	// 	ele.asssigned = ele.assignTo.length;
	// 	ele.submitted_count = submitted.length;
	// 	ele.not_submitted_count = not_submitted.length;
	// 	ele.late_submitted_count = late_submit.length;
	// 	ele.reassign_count = reassign.length;
	// 	ele.classes = classes;
	// 	ele.group = group;
	// }
	count.forEach(e => {
		e.doubts_id ? (e.doubtCount = e.doubts_id.total) : 0;
	});
	res.status(200).json(successResponse(count, count.length));
});

exports.getAssignmentByClass = catchAsync(async (req, res, next) => {
	try {
		const { StartDate, status, teacher_id, school_id } = req.body;
		const { startDate, endDate } = getDailyDates(StartDate);
		const payload = {};
		teacher_id ? (payload.teacher_id = teacher_id) : null;
		school_id ? (payload.school_id = school_id) : null;
		let records = await Assignment.find({
			isGroup: false,
			...payload,
			status: { $in: status },
			startDate: {
				$gt: startDate,
				$lte: endDate,
			},
		})
			.populate('assignTo.student_id', 'name profile_image assignment')
			.populate('teacher_id', 'name profile_image')
			.populate('class_id group_id', 'name group_name')
			.populate('assignTo.section_id', 'name group_name')

			.select('-createdAt -updatedAt -__v')
			.lean();
		if (records && !records.length) {
			return next(
				new ErrorResponse(
					'No records found for this Teacher id, status and date',
					400
				)
			);
		}
		records = JSON.parse(JSON.stringify(records));
		const classes = [];
		const sections = [];
		for (const ele of records) {
			let submittedCount = 0;
			ele.assignTo.forEach(async e => {
				if (e.section_id && e.section_id._id) {
					const index = sections.findIndex(
						x => x.section_id == e.section_id._id
					);
					if (index == -1) {
						if (e.status == 'SUBMITTED') {
							submittedCount += 1;
						}
						sections.push({
							class_id: ele.class_id._id,
							class_name: ele.class_id.name,
							section_id: e.section_id ? e.section_id._id : '',
							section_name: e.section_id ? e.section_id.name : '',
							status: ele.status,
							submittedCount,
						});
					} else if (e.status == 'SUBMITTED') {
						sections[index].submittedCount += 1;
					}
				}
			});

			delete ele.assignTo;
		}
		for (const ele of sections) {
			const data = await Assignment.find({
				teacher_id: req.body.teacher_id,
				startDate: {
					$gt: startDate,
					$lte: endDate,
				},
				'assignTo.section_id': ele.section_id,
			}).count();
			ele.assignCount = data;
		}
		sections.forEach(e => {
			const index = classes.findIndex(x => x.class_id == e.class_id);
			if (index == -1) {
				const index1 = sections.findIndex(
					x => x.section_id == e.section_id._id
				);
				if (index1 == -1) {
					if (e.status == 'SUBMITTED') {
						e.submittedCount += 1;
					}
					classes.push({
						class_id: e.class_id,
						class_name: e.class_name,
						total_submitted_count: e.submittedCount,
						section: [e],
					});
				} else if (e.status == 'SUBMITTED') {
					e.submittedCount += 1;
				}
			} else {
				classes[index].section.push(e);
			}
		});

		res.status(200).json({
			status: 'success',
			data: classes,
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.getAssignmentByGroup = catchAsync(async (req, res, next) => {
	try {
		const { startDate, endDate } = getDailyDates(req.body.StartDate);
		let records = await Assignment.find({
			teacher_id: req.body.teacher_id,
			status: { $in: req.body.status },
			isGroup: true,
			startDate: {
				$gte: startDate,
				$lt: endDate,
			},
		})
			.populate('assignTo.student_id', 'name profile_image assignment')
			.populate('teacher_id', 'name profile_image')
			.populate('class_id group', 'name group_name')
			.populate('assignTo.section_id', 'name group_name')
			.select('-createdAt -updatedAt -__v')
			.lean();
		if (records && !records.length) {
			return next(
				new ErrorResponse(
					'No records found for this Teacher id, status and date',
					400
				)
			);
		}
		const group = [];
		const submitted = [];
		records = JSON.parse(JSON.stringify(records));
		let count = 0;
		for (const ele of records) {
			let submitted_count = 0;
			ele.assignTo.forEach(e => {
				if (e.status == 'SUBMITTED') {
					submitted.push(e);
				}
				if (ele.group_id) {
					const index1 = group.findIndex(x => x.group_id == ele.group_id._id);
					if (index1 == -1) {
						if (e.status == 'SUBMITTED') {
							submitted_count += 1;
						}
						group.push({
							group_id: ele.group_id._id,
							name: ele.group_id.group_name,
							class_id: ele.class_id._id,
							class_name: ele.class_id.name,
							section_id: e.section_id ? e.section_id._id : '',
							section_name: e.section_id ? e.section_id.name : '',
							school_id: ele.school_id,
							submitted_count,
						});
					} else if (e.status == 'SUBMITTED') {
						group[index1].submitted_count += 1;
					}
				}
				if (ele.status == 'EVALUATED') {
					count += 1;
				}
			});
		}

		res.status(200).json({
			status: 'success',
			groupData: group,
			evaluated_count: count,
			total_submitted_count: submitted.length,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
});

// TODO:
exports.assignmentBySection = catchAsync(async (req, res, next) => {
	const { section_id, date, user_id, status } = req.body;
	const { startDate, endDate } = getDailyDates(date);
	const AssignmentData = await Assignment.aggregate([
		{
			$match: {
				teacher_id: mongoose.Types.ObjectId(user_id),
				status: {
					$in: status,
				},
				'assignTo.section_id': mongoose.Types.ObjectId(section_id),
				startDate: {
					$gte: startDate,
					$lt: endDate,
				},
			},
		},
		{
			$project: {
				title: 1,
				teacher_id: 1,
				assignTo: 1,
				coin: 1,
				class_id: 1,
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$match: {
				'assignTo.section_id': mongoose.Types.ObjectId(section_id),
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					classId: '$class_id',
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
				as: 'assignTo.class_id',
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$assignTo.section_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$sectionId'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'assignTo.section_id',
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					userId: '$teacher_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$userId'],
							},
						},
					},
					{
						$project: {
							name: 1,
							profile_image: 1,
						},
					},
				],
				as: 'teacher_id',
			},
		},
		{
			$group: {
				_id: {
					assignmentid: '$_id',
					teacher_id: {
						$first: '$teacher_id',
					},
					class: {
						$first: '$class_id',
					},
					section: {
						$first: '$assignTo.section_id',
					},
					coin: '$coin',
				},
				assignTo: {
					$push: '$assignTo',
				},
				title: {
					$addToSet: '$title',
				},
			},
		},
		{
			$project: {
				_id: '$_id.assignmentid',
				title: {
					$first: '$title',
				},
				coin: '$_id.coin',
				teacher_id: '$_id.teacher_id',
				class: '$_id.class',
				section: '$_id.section',
				totalAssigned: {
					$size: '$assignTo',
				},
				evaluated: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'EVALUATED'],
							},
							1,
							0,
						],
					},
				},
				submitted: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				viewed: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.viewed', 'true'],
							},
							1,
							0,
						],
					},
				},
			},
		},
	]);

	res
		.status(200)
		.json(
			SuccessResponse(
				AssignmentData,
				AssignmentData.length,
				'Fetched Successfully'
			)
		);
});

exports.studentAssignments = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	let { startDate, endDate } = req.query;
	startDate = new Date(startDate);
	endDate = new Date(endDate);
	const assignmentData = await Assignment.aggregate([
		{
			$match: {
				'assignTo.student_id': mongoose.Types.ObjectId(id),
				startDate: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				startDate: {
					year: {
						$year: '$startDate',
					},
					month: {
						$month: '$startDate',
					},
					day: {
						$dayOfMonth: '$startDate',
					},
				},
				assignTo: {
					$filter: {
						input: '$assignTo',
						as: 'item',
						cond: {
							$eq: ['$$item.student_id', mongoose.Types.ObjectId(id)],
						},
					},
				},
			},
		},
		{
			$unwind: {
				path: '$assignTo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$startDate',
				totalCount: {
					$sum: 1,
				},
				submittedCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				notSubmittedCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'NOT_SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				lateSubmittedCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'LATE_SUBMITTED'],
							},
							1,
							0,
						],
					},
				},
				reassignedCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$assignTo.status', 'REASSIGNED'],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$sort: {
				'_id.day': 1,
			},
		},
	]);
	for (const el of assignmentData) {
		el.color =
			el.notSubmittedCount > 0
				? 'red'
				: el.lateSubmittedCount > 0
				? 'yellow'
				: el.reassignedCount > 0
				? 'blue'
				: 'green';
		delete el.notSubmittedCount;
		delete el.submittedCount;
		delete el.reassignedCount;
		delete el.lateSubmittedCount;
	}
	res
		.status(200)
		.json(SuccessResponse(assignmentData, assignmentData.length, 'Fetched'));
});

exports.assignmentByClass = catchAsync(async (req, res, next) => {
	try {
		const { startDate, endDate } = getDailyDates(req.body.StartDate);
		let records = await Assignment.find({
			teacher_id: req.body.teacher_id,
			status: { $in: req.body.status },
			startDate: {
				$gte: startDate,
				$lt: endDate,
			},
			'assignTo.class_id': req.body.class_id,
		})
			.populate('assignTo.student_id', 'name profile_image assignment')
			.populate('teacher_id', 'name profile_image')
			.populate('class_id group', 'name group_name')
			.populate('assignTo.section_id', 'name group_name')
			.select('-createdAt -updatedAt -__v')
			.lean();
		if (records && !records.length) {
			return next(
				new ErrorResponse(
					'No records found for this Teacher id, status and date',
					400
				)
			);
		}
		records = JSON.parse(JSON.stringify(records));
		const classes = [];
		const sections = [];
		for (const ele of records) {
			let submittedCount = 0;
			const not_submitted = [];
			const submitted = [];
			const reassign = [];
			const late_submit = [];
			let views = 0;
			const viewed = [];
			const not_viewed = [];
			ele.assignTo.forEach(async e => {
				if (ele.class_id._id == req.body.class_id) {
					if (e.viewed == true) {
						views += 1;
						viewed.push(e);
					}
					if (e.viewed == false) {
						not_viewed.push(e);
					}
					if (e.section_id && e.section_id._id) {
						const index = sections.findIndex(
							x => x.section_id == e.section_id._id
						);
						if (index == -1) {
							if (e.status == 'SUBMITTED') {
								submittedCount += 1;
							}
							sections.push({
								class_id: ele.class_id._id,
								class_name: ele.class_id.name,
								section_id: e.section_id ? e.section_id._id : '',
								section_name: e.section_id ? e.section_id.name : '',
								submittedCount,
							});
						} else if (e.status == 'SUBMITTED') {
							sections[index].submittedCount += 1;
						}
					}
				}
			});
			ele.viewed = viewed.length;
			ele.status = status;
			ele.submitted = submitted.length;
			ele.asssigned = ele.assignTo.length;
			ele.submitted_count = submitted.length;
			ele.not_submitted_count = not_submitted.length;
			ele.late_submitted_count = late_submit.length;
			ele.reassign_count = reassign.length;
		}
		for (const ele of sections) {
			const data = await Assignment.find({
				teacher_id: req.body.teacher_id,
				startDate: {
					$gt: startDate,
					$lte: endDate,
				},
				'assignTo.section_id': ele.section_id,
			}).count();
			ele.assignCount = data;
		}

		res.status(200).json({
			status: 'success',
			assignment: records,
			sections,
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
});

exports.getAllsections = catchAsync(async (req, res, next) => {
	try {
		const { teacher_id, StartDate } = req.body;
		let { school_id } = req.body;
		const { startDate, endDate } = getDailyDates(StartDate);
		let classList = null;
		if (teacher_id) {
			const userData = await User.findOne(
				{ _id: mongoose.Types.ObjectId(teacher_id) },
				{ name: 1, primary_class: 1, secondary_class: 1, school_id: 1 }
			);
			const { secondary_class, primary_class } = userData;
			classList = secondary_class.map(e =>
				mongoose.Types.ObjectId(e.secondClasses)
			);
			classList.push(primary_class);
			school_id = userData.school_id;
		} else {
			classList = await School.findOne({ _id: school_id }, { classList: 1 });
			classList = classList.classList;
		}
		const classes = await SectionModel.aggregate([
			{
				$match: {
					school: mongoose.Types.ObjectId(school_id),
					class_id: {
						$in: classList,
					},
				},
			},
			{
				$lookup: {
					from: 'students',
					localField: '_id',
					foreignField: 'section',
					as: 'students',
				},
			},
			{
				$match: {
					students: {
						$ne: [],
					},
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						class: '$class_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$class'],
								},
							},
						},
						{
							$project: {
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
				$group: {
					_id: '$class_id',
					sections: {
						$push: {
							_id: '$_id',
							name: '$name',
						},
					},
				},
			},
			{
				$project: {
					_id: '$_id._id',
					name: '$_id.name',
					sections: '$sections',
				},
			},
		]);
		res.status(200).json({
			status: 'success',
			classes,
		});
	} catch (err) {
		console.log('err', err.message);
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.GetDoubts = catchAsync(async (req, res, next) => {
	const { assignmentId } = req.params;

	const foundAssignment = await Assignment.findOne({ _id: assignmentId })
		.select({ commentsId: 1 })
		.lean();

	const foundComments = await CommentModel.findOne(
		{
			$or: [{ _id: foundAssignment.commentsId }, { assignmentId }],
		},
		{ _id: 1, comments: 1 }
	)
		.populate({
			path: 'studentId teacherId',
			select: 'name profile_image',
		})
		.populate({
			path: 'replies.studentId replies.teacherId',
			select: 'name profile_image',
		})
		.lean();

	res.status(200).json(successResponse(foundComments, 1, 'ok'));
});

exports.studentBySection = catchAsync(async (req, res, next) => {
	let { sectionList } = req.body;
	sectionList = sectionList.map(ele => mongoose.Types.ObjectId(ele));
	const studentList = await Student.aggregate([
		{
			$match: {
				section: {
					$in: sectionList,
				},
			},
		},
		{
			$project: {
				name: 1,
				assigned: '$assignment.assigned',
				completed: '$assignment.completed',
				profile_image: 1,
			},
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$studId', '$assignTo.student_id'],
							},
						},
					},
					{
						$limit: 7,
					},
					{
						$sort: {
							startDate: -1,
						},
					},
					{
						$project: {
							assignTo: {
								$filter: {
									input: '$assignTo',
									as: 'item',
									cond: {
										$eq: ['$$item.student_id', '$$studId'],
									},
								},
							},
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$assignTo.student_id',
							status: {
								$push: '$assignTo.status',
							},
						},
					},
				],
				as: 'assignments',
			},
		},
		{
			$project: {
				name: 1,
				profile_image: 1,
				assigned: 1,
				completed: 1,
				assignments: {
					$first: '$assignments.status',
				},
			},
		},
	]);
	if (!studentList) {
		return res.status(404).json(new ErrorResponse(404, 'No students found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(studentList, studentList.length, 'Fetched sucessfully')
		);
});

exports.studentByGroup = catchAsync(async (req, res, next) => {
	const { user_id, date, school_id, group_id } = req.body;
	const { startDate, endDate } = getDailyDates(date);
	const payload = {};
	user_id ? (payload.teacher_id = user_id) : null;
	school_id ? (payload.school_id = school_id) : null;
	let groupData = await Group.find({ ...payload, _id: group_id }, { _id: 1 });
	delete payload.school_id;
	if (!groupData.length) {
		return res.status(404).json(new ErrorResponse(404, 'No Groups Found'));
	}
	groupData = JSON.parse(JSON.stringify(groupData)).map(ele => ele._id);
	school_id ? (payload.school_id = mongoose.Types.ObjectId(school_id)) : null;
	let assignedGroup = await Assignment.aggregate([
		{
			$match: {
				isGroup: true,
				...payload,
				startDate: {
					$gte: startDate,
					$lt: endDate,
				},
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: '$group_id',
			},
		},
	]);
	if (assignedGroup.length) {
		assignedGroup = JSON.parse(JSON.stringify(assignedGroup)).map(
			ele => ele._id
		);
	}
	groupData = groupData
		.filter(val => !assignedGroup.includes(val))
		.map(ele => mongoose.Types.ObjectId(ele));
	const studentData = await Group.aggregate([
		{
			$match: {
				_id: {
					$in: groupData,
				},
			},
		},
		{
			$project: {
				group_name: 1,
				students: 1,
			},
		},
		{
			$unwind: '$students',
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					studId: '$students',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$studId', '$assignTo.student_id'],
							},
						},
					},
					{
						$limit: 7,
					},
					{
						$sort: {
							startDate: -1,
						},
					},
					{
						$project: {
							assignTo: {
								$filter: {
									input: '$assignTo',
									as: 'item',
									cond: {
										$eq: ['$$item.student_id', '$$studId'],
									},
								},
							},
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$assignTo.student_id',
							status: {
								$push: '$assignTo.status',
							},
						},
					},
				],
				as: 'assignments',
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					studId: '$students',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$studId'],
							},
						},
					},
					{
						$project: {
							name: 1,
							profile_image: 1,
							assigned: '$assignment.assigned',
							completed: '$assignment.completed',
						},
					},
				],
				as: 'students',
			},
		},
		{
			$project: {
				students: {
					$first: '$students',
				},
				group_name: 1,
				assignments: {
					$first: '$assignments.status',
				},
			},
		},
		{
			$group: {
				_id: {
					group_id: '$_id',
					name: '$group_name',
				},
				studentList: {
					$push: {
						_id: '$students._id',
						name: '$students.name',
						profile_image: '$students.profile_image',
						assigned: '$students.assigned',
						completed: '$students.completed',
						assignments: '$assignments',
					},
				},
			},
		},
	]);
	if (!studentData.length) {
		return res.status(404).json(new ErrorResponse(404, 'No students found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(studentData, studentData.length, 'Fetched successfully')
		);
});
exports.schoolMonthlyExcel = catchAsync(async (req, res, next) => {
	const { schoolId, startDate, endDate } = req.query;
	if (!schoolId || !startDate || !endDate) {
		return next(
			new ErrorResponse('Please provide schoolId, startDate and endDate', 400)
		);
	}
	const schoolData = await School.findById(schoolId).select('schoolName');
	const today = new Date();
	let dateStart = new Date(startDate);
	let dateEnd = new Date(endDate);
	const monthArray = getDaysInMonth(
		dateStart.getMonth(),
		dateStart.getFullYear()
	);
	const reports = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				isGroup: false,
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				date: {
					year: {
						$year: '$startDate',
					},
					month: {
						$month: '$startDate',
					},
					day: {
						$dayOfMonth: '$startDate',
					},
				},
			},
		},
		{
			$group: {
				_id: {
					date: '$date',
					class_id: '$class_id',
				},
				totalAssignments: {
					$sum: 1,
				},
				totalAssignedTo: {
					$sum: '$report.totalAssignedTo',
				},
				submission: {
					$sum: '$report.submitted',
				},
				lateSubmitted: {
					$sum: '$report.lateSubmitted',
				},
				evaluated: {
					$sum: '$report.evaluated',
				},
				outcomes: {
					$sum: '$report.isAbleTo',
				},
			},
		},
		{
			$sort: {
				'_id.date': 1,
			},
		},
		{
			$project: {
				_id: 0,
				totalAssignments: 1,
				totalAssignedTo: 1,
				date: '$_id.date.day',
				class_id: '$_id.class_id',
				submission: {
					$sum: ['$submission', '$lateSubmitted'],
				},
				evaluated: 1,
				outcomes: 1,
			},
		},
		{
			$group: {
				_id: '$class_id',
				totalAssignments: {
					$sum: '$totalAssignments',
				},
				totalAssignedTo: {
					$sum: '$totalAssignedTo',
				},
				totalSubmissions: {
					$sum: '$submission',
				},
				totalEvaluated: {
					$sum: '$evaluated',
				},
				totalOutcomes: {
					$sum: '$outcomes',
				},
				data: {
					$push: {
						day: '$date',
						submission: {
							$sum: '$submission',
						},
						evaluated: {
							$sum: '$evaluated',
						},
						outcomes: {
							$sum: '$outcomes',
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$id'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: '_id',
			},
		},
		{
			$project: {
				_id: 0,
				classId: {
					$first: '$_id',
				},
				totalAssignments: 1,
				totalSubmissions: {
					$multiply: [
						{
							$divide: ['$totalSubmissions', '$totalAssignedTo'],
						},
						100,
					],
				},
				totalEvaluated: {
					$multiply: [
						{
							$divide: ['$totalEvaluated', '$totalAssignedTo'],
						},
						100,
					],
				},
				totalOutcomes: {
					$multiply: [
						{
							$divide: ['$totalOutcomes', '$totalAssignedTo'],
						},
						100,
					],
				},
				data: 1,
			},
		},
	]);
	const classWiseData = await AssignmentReportExcelModel.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(schoolId),
				month: dateStart.getMonth(),
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$studentId',
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
				as: 'studentId',
			},
		},
		{
			$sort: {
				'studentId.name': 1,
			},
		},
		{
			$group: {
				_id: {
					sectionId: '$sectionId',
					classId: '$classId',
				},
				students: {
					$push: {
						name: {
							$first: '$studentId.name',
						},
						totalAssignments: '$totalAssignments',
						AssignmentReport: '$AssignmentReport',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$_id.classId',
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
				as: 'class_id',
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					section_id: '$_id.sectionId',
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
				as: 'section_id',
			},
		},
		{
			$project: {
				_id: 0,
				className: {
					$first: '$class_id.name',
				},
				sequence: {
					$first: '$class_id.sequence_number',
				},
				sectionName: {
					$first: '$section_id.name',
				},
				students: 1,
			},
		},
		{
			$sort: {
				sequence: 1,
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
	worksheet.cell(1, 1).string('Report Type:').style(style);
	worksheet.cell(1, 2).string('Monthly');
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet
		.cell(2, 2)
		.string(`${dateStart.toLocaleString('default', { month: 'long' })}`);
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${schoolData.schoolName}`);
	worksheet.cell(4, 1).string(`Date:`);
	worksheet
		.cell(4, 2)
		.string(`${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`);
	worksheet.cell(5, 1).string(`Class`);
	worksheet.cell(5, 2).string(`Total Assigned`);
	let col1 = 3;
	let date = new Date(startDate);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 2, true)
			.string(
				`${date.getDate()} ${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Submission').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(5, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);
	let row = 6;
	let col = 1;
	for (const ele2 of reports) {
		const { data } = ele2;

		// const count = await Assignment.find({
		// 	school_id: schoolId,
		// 	class_id: ele2._id.class_id._id,
		// 	isGroup: false,
		// 	startDate: {
		// 		$gte: dateStart,
		// 		$lte: dateEnd,
		// 	},
		// }).count();
		worksheet.cell(row, col).string(` ${ele2.classId.name}`).style(style);
		worksheet
			.cell(row, col + 1)
			.string(`${ele2.totalAssignments}`)
			.style(style);
		dateStart = dateStart.getDate();
		dateEnd = dateEnd.getDate();
		let i = 2;
		for (const el of monthArray) {
			const idx = data.findIndex(e => e.day === el.getDate());
			if (idx != -1) {
				const { submission, evaluated, outcomes } = data[idx];
				worksheet
					.cell(row, col + i)
					.string(`${submission}`)
					.style(style);
				worksheet
					.cell(row, col + i + 1)
					.string(`${evaluated}`)
					.style(style);
				worksheet
					.cell(row, col + i + 2)
					.string(`${outcomes}`)
					.style(style);
			}
			i += 3;
		}
		// worksheet
		//  .cell(row, col1 + 2)
		//  .string(`${ele2.submitted_count}`)
		//  .style(style);
		// worksheet
		//  .cell(row, col1 + 2)
		//  .string(`${ele2.submitted_count}`)
		//  .style(style);
	}
	for (const ele2 of classWiseData) {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2.className} ${ele2.sectionName}`
		);
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1.cell(1, 2).string(
			`${dateStart.getDate()} ${dateStart.toLocaleString('default', {
				month: 'long',
			})}`
		);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		// row 2
		worksheet1.cell(2, 1).string('Class Name :').style(style);
		worksheet1.cell(2, 2).string(`${ele2.className}`);
		worksheet1.cell(2, 3).string(`Submission`);
		worksheet1.cell(2, 4).string(`${ele2.submitted_count}`);
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1.cell(3, 4).string(`${ele2.evaluated_count}`).style(style);
		worksheet1.cell(4, 3).string('Outcomes').style(style);
		worksheet1
			.cell(4, 4)
			.string(
				`${
					(ele2.isAbleTo_count /
						(ele2.late_submitted_count +
							ele2.evaluated_count +
							ele2.reassign_count)) *
					100
				}`
			)
			.style(style);
		// row 3
		col1 = 3;
		date = new Date(startDate);
		do {
			worksheet1
				.cell(5, col1, 5, col1 + 1, true)
				.string(
					`${date.toLocaleDateString('default', {
						weekday: 'long',
					})},${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getDate()}, ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(6, col1).string('Submission').style(style);
			worksheet1
				.cell(6, col1 + 1)
				.string('Evaluated')
				.style(style);
			worksheet1
				.cell(6, col1 + 2)
				.string('Outcomes')
				.style(style);
			col1 += 2;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);
		// row 4
		worksheet1.cell(6, 1).string('Student Name').style(style);
		worksheet1.cell(6, 2).string('Total Assignment').style(style);
		row = 7;
		col = 1;
		let count = 0;
		ele2.students.forEach(ele1 => {
			worksheet1
				.cell(row, col)
				.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
			if (ele1.AssignmentReport.length) {
				count += 1;
				// Insert Student Data
				let col2 = 3;
				const date1 = new Date(startDate);
				do {
					const itemIndex = ele1.assignmentDetails.findIndex(
						att => date1.getTime() == att.startDate.getTime()
					);
					worksheet1
						.cell(row, col2)
						.string(
							itemIndex == -1
								? ''
								: `${ele1.assignmentDetails[itemIndex].status}`
						);
					worksheet1
						.cell(row, col2 + 1)
						.string(
							itemIndex == -1
								? ''
								: `${ele1.assignmentDetails[itemIndex].status}`
						);
					col2 += 2;
					date1.setDate(date1.getDate() + 1);
				} while (date1 <= dateEnd);
				row += 1;
			}
		});
	}
	workbook.write('SchoolMonthly.xlsx');
	let dataReport = await workbook.writeToBuffer();
	dataReport = dataReport.toJSON().data;
	res.status(200).json({
		status: 'success',
		report: dataReport,
	});
});

exports.assignmentBySectionCount = catchAsync(async (req, res, next) => {
	try {
		const { AssignmentData, data } = await getDetails(
			req.body.class_id,
			req.body.section_id,
			req.body.teacher_id,
			req.body.StartDate
		);
		let evaluated_count;
		let pending_count;
		data.forEach(e => {
			e._id == 'PENDING' ? (pending_count = e.count) : 0;
			e._id == 'EVALUATED' ? (evaluated_count = e.count) : 0;
		});

		res.status(200).json({
			status: 'success',
			previousDay: AssignmentData,
			evaluated_count: evaluated_count || 0,
			pending_count: pending_count || 0,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.assignmentByClassCount = catchAsync(async (req, res, next) => {
	try {
		const { AssignmentData, data } = await getDetails(
			req.body.class_id,
			req.body.section_id,
			req.body.teacher_id,
			req.body.StartDate
		);
		let evaluated_count;
		let pending_count;
		data.forEach(e => {
			e._id == 'PENDING' ? (pending_count = e.count) : 0;
			e._id == 'EVALUATED' ? (evaluated_count = e.count) : 0;
		});

		res.status(200).json({
			status: 'success',
			previousDay: AssignmentData,
			evaluated_count: evaluated_count || 0,
			pending_count: pending_count || 0,
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
});

exports.teacherDailyReport = catchAsync(async (req, res, next) => {
	try {
		let { teacherId, date } = req.query;
		date = new Date(date);
		if (!teacherId || !date) {
			return next(new ErrorResponse('Please provide teacherId & date', 400));
		}
		const { startDate, endDate } = getDailyDates(date);
		const { reportData } = await getData(
			teacherId,
			startDate,
			endDate,
			'teacher'
		);
		if (!reportData && reportData.length) {
			return res.status(204).json(new ErrorResponse(204, 'No content Found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

async function getSchoolData(schoolId, startDate, endDate) {
	const reportData = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				startDate: {
					$gt: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				totalStudents: '$assignTo',
				school_id: 1,
			},
		},
		{
			$unwind: '$totalStudents',
		},
		{
			$group: {
				_id: 'school_id',
				assignTo: {
					$push: '$totalStudents',
				},
			},
		},
		{
			$addFields: {
				total_count: {
					$size: '$assignTo',
				},
				evaluated: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'EVALUATED'],
							},
						},
					},
				},
				not_submitted_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'NOT_SUBMITTED'],
							},
						},
					},
				},
				submitted_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'SUBMITTED'],
							},
						},
					},
				},
				reassign_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'REASSIGNED'],
							},
						},
					},
				},
				late_submitted_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.status', 'LATE_SUBMITTED'],
							},
						},
					},
				},
				isAbleTo_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.isAbleTo', 'true'],
							},
						},
					},
				},
				isNotAbleTo_count: {
					$size: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.isAbleTo', 'false'],
							},
						},
					},
				},
			},
		},
	]);

	return reportData;
}

exports.getStudentAssignment = catchAsync(async (req, res, next) => {
	const { studentId, startDate, endDate } = req.query;

	if (!studentId) {
		return next(new ErrorResponse(400, 'Please provide studentId'));
	}

	const payload = {
		'assignTo.student_id': studentId,
	};

	if (startDate) {
		if (!endDate) {
			const { startDate: startOfDay, endDate: endOfDay } =
				getDailyDates(startDate);

			payload.startDate = {
				$gte: startOfDay,
				$lt: endOfDay,
			};
		} else {
			const { startDate: sDate } = getDailyDates(startDate);
			const { endDate: eDate } = getDailyDates(endDate);

			payload.startDate = {
				$gte: sDate,
			};

			payload.EndDate = {
				$lte: eDate,
			};
		}
	}

	const assignment = await Assignment.find(
		payload,
		assignmentProjection(studentId)
	)
		.populate('doubts_id')
		.populate([
			{
				path: 'teacher_id class_id school_id group_id',
				select: 'name profile_image schoolName group_name',
			},
			{
				path: 'assignTo.student_id assignTo.section_id',
				select: 'name profile_image assignment',
			},
			{
				path: 'commentsId',
				select: 'comments',
			},
		])
		.sort({ createdAt: -1 })
		.lean();

	if (!assignment) {
		return next(new ErrorResponse(204, 'No assignment found'));
	}
	for (const ele of assignment) {
		if (ele.doubts_id) {
			const index = ele.doubts_id.doubts.findIndex(
				x => x.student_id == studentId
			);
			if (index != -1) {
				let doubtCount = 0;
				const isDoubtCleared = ele.doubts_id.doubts[index].isCleared;
				for (const ele1 of ele.doubts_id.doubts[index].messages.reverse()) {
					if (!ele1.teacher_id) {
						doubtCount += 1;
					} else {
						break;
					}
				}
				ele.doubtCount = doubtCount;
				ele.isDoubtCleared = isDoubtCleared;
			}
		}
		delete ele.doubts_id;
	}
	res.status(200).json({
		status: 'success',
		data: assignment,
	});
});

exports.schoolWeeklyReport = catchAsync(async (req, res, next) => {
	try {
		let { schoolId, startDate, endDate } = req.query;
		// const startDate = date ? new Date(date) : new Date();
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		if (!schoolId || !startDate || !endDate) {
			return next(new ErrorResponse('Please provide schoolId', 400));
		}
		const reportData = await getData(schoolId, startDate, endDate, 'school');
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res
			.status(200)
			.json(SuccessResponse(reportData, 1, 'Fetched SuccessFully'));
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.schoolMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, month, year } = req.query;

	if (!schoolId || !month || !year) {
		return next(
			new ErrorResponse('Please provide schoolId, month and year', 400)
		);
	}

	const data = await getMonthlyReport(
		schoolId,
		parseInt(month),
		parseInt(year)
	);
	const finalData = {
		totalAssignedTo: 0,
		totalAssignments: 0,
		totalEvaluated: 0,
		isAbleTo: 0,
		isNotAbleTo: 0,
		lateSubmitted: 0,
		notSubmitted: 0,
		reassigned: 0,
		Submitted: 0,
		doubtsTotalCount: 0,
		doubtsClearedCount: 0,
		submittedAVG: 0,
		lateSubmittedAVG: 0,
		notSubmittedAVG: 0,
		evaluatedAVG: 0,
		outcome: 0,
		isNotAbleToAVG: 0,
	};

	if (data) {
		data.sections.forEach(e => {
			finalData.totalAssignments += e.totalAssignment;
			finalData.totalAssignedTo += e.totalAssigned;
			finalData.totalEvaluated += e.evaluated;
			finalData.isAbleTo += e.isAbleTo;
			finalData.isNotAbleTo += e.isNotAbleTo;
			finalData.lateSubmitted += e.lateSubmitted;
			finalData.notSubmitted += e.notSubmitted;
			finalData.reassigned += e.reassigned;
			finalData.Submitted += e.submitted;
			finalData.doubtsTotalCount += e.totalDoubts;
			finalData.doubtsClearedCount += e.totalClearedDoubts;
		});
		finalData.submittedAVG =
			finalData.Submitted === 0
				? 0
				: (finalData.Submitted / finalData.totalAssignedTo) * 100;
		finalData.lateSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.lateSubmitted / finalData.totalAssignedTo) * 100;
		finalData.notSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.notSubmitted / finalData.totalAssignedTo) * 100;
		finalData.outcome =
			finalData.isAbleTo === 0
				? 0
				: (finalData.isAbleTo / finalData.totalEvaluated) * 100;
		finalData.isNotAbleToAVG =
			finalData.isNotAbleTo === 0
				? 0
				: (finalData.isNotAbleTo / finalData.totalEvaluated) * 100;
		finalData.evaluatedAVG =
			finalData.totalEvaluated === 0
				? 0
				: (finalData.totalEvaluated /
						(finalData.Submitted + finalData.lateSubmitted)) *
				  100;
		finalData.doubts =
			finalData.doubtsTotalCount === 0
				? 0
				: (finalData.doubtsClearedCount / finalData.doubtsTotalCount) * 100;

		res.status(200).json({
			status: 'success',
			data: finalData,
		});
	} else {
		res.status(200).json({
			status: 'success',
			message: 'no data found',
			data,
		});
	}
});

exports.classMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, month, year, class_id } = req.query;
	if (!schoolId || !month || !year || !class_id) {
		return next(
			new ErrorResponse('Please provide schoolId, month and year', 400)
		);
	}

	const data = await getMonthlyReport(
		schoolId,
		parseInt(month),
		parseInt(year)
	);
	const finalData = {
		totalAssignedTo: 0,
		totalAssignments: 0,
		totalEvaluated: 0,
		isAbleTo: 0,
		isNotAbleTo: 0,
		lateSubmitted: 0,
		notSubmitted: 0,
		reassigned: 0,
		Submitted: 0,
		doubtsTotalCount: 0,
		doubtsClearedCount: 0,
		submittedAVG: 0,
		lateSubmittedAVG: 0,
		notSubmittedAVG: 0,
		evaluatedAVG: 0,
		outcome: 0,
		isNotAbleToAVG: 0,
	};
	if (data) {
		data.sections.forEach(e => {
			if (e.class_id == class_id) {
				finalData.totalAssignments += e.totalAssignment;
				finalData.totalAssignedTo += e.totalAssigned;
				finalData.totalEvaluated += e.evaluated;
				finalData.isAbleTo += e.isAbleTo;
				finalData.isNotAbleTo += e.isNotAbleTo;
				finalData.lateSubmitted += e.lateSubmitted;
				finalData.notSubmitted += e.notSubmitted;
				finalData.reassigned += e.reassigned;
				finalData.Submitted += e.submitted;
				finalData.doubtsTotalCount += e.totalDoubts;
				finalData.doubtsClearedCount += e.totalClearedDoubts;
			}
		});
		finalData.submittedAVG =
			finalData.Submitted === 0
				? 0
				: (finalData.Submitted / finalData.totalAssignedTo) * 100;
		finalData.lateSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.lateSubmitted / finalData.totalAssignedTo) * 100;
		finalData.notSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.notSubmitted / finalData.totalAssignedTo) * 100;
		finalData.outcome =
			finalData.isAbleTo === 0
				? 0
				: (finalData.isAbleTo / finalData.totalEvaluated) * 100;
		finalData.isNotAbleToAVG =
			finalData.isNotAbleTo === 0
				? 0
				: (finalData.isNotAbleTo / finalData.totalEvaluated) * 100;
		finalData.evaluatedAVG =
			finalData.totalEvaluated === 0
				? 0
				: (finalData.totalEvaluated /
						(finalData.Submitted + finalData.lateSubmitted)) *
				  100;
		finalData.doubts =
			finalData.doubtsTotalCount === 0
				? 0
				: (finalData.doubtsClearedCount / finalData.doubtsTotalCount) * 100;

		res.status(200).json({
			status: 'success',
			data: finalData,
		});
	} else {
		res.status(200).json({
			status: 'success',
			message: 'no data found',
			data: finalData,
		});
	}
});

exports.classWeeklyReport = catchAsync(async (req, res, next) => {
	try {
		let { schoolId, classId, startDate, endDate } = req.query;
		if (!schoolId || !classId || !startDate || !endDate) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id and startDate',
					400
				)
			);
		}
		const payload = {
			schoolId,
			classId,
		};
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		const reportData = await getData(payload, startDate, endDate, 'class');
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData,
			// last_week: lastWeek,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.classWeeklyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		let { schoolId, classId, startDate, endDate } = req.query;
		if (!schoolId || !classId || !startDate || !endDate) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id and startDate',
					400
				)
			);
		}
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			null,
			startDate,
			endDate
		);

		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.sectionWeeklyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		let { schoolId, classId, sectionId, startDate, endDate } = req.query;
		if (!schoolId || !classId || !sectionId || !startDate || !endDate) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id, section_id and startDate',
					400
				)
			);
		}
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			sectionId,
			startDate,
			endDate
		);

		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.classMonthlyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, classId, date } = req.query;
		if (!schoolId || !classId || !date) {
			return next(
				new ErrorResponse('Please provide school_id, class_id and date', 400)
			);
		}
		const prev = false;
		const { monthStart, monthEnd } = MonthlyDates(date, prev);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			null,
			monthStart,
			monthEnd
		);

		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.sectionMonthlyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, classId, sectionId, date } = req.query;
		if (!schoolId || !classId || !sectionId || !date) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id, section_id and date',
					400
				)
			);
		}
		const prev = false;
		const { monthStart, monthEnd } = MonthlyDates(date, prev);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			sectionId,
			monthStart,
			monthEnd
		);

		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.classDailyReport = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, classId, date } = req.query;
		if (!schoolId || !classId || !date) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id and startDate',
					400
				)
			);
		}
		const payload = {
			schoolId,
			classId,
		};
		const { startDate, endDate } = getDailyDates(date);
		const reportData = await getData(payload, startDate, endDate, 'class');
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.classDailyReportExcel = catchAsync(async (req, res, next) => {
	const { schoolId, classId, date } = req.query;
	const schoolData = await School.findById(schoolId).select('schoolName');
	if (!schoolId || !classId || !date) {
		return next(
			new ErrorResponse('Please provide schoolId, classId & date', 400)
		);
	}
	const dateM = new Date(date);
	const startDate = new Date(date);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(date);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				isGroup: false,
				startDate: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$project: {
				startDate: 1,
				school_id: 1,
				class_id: 1,
				report: {
					$objectToArray: '$report',
				},
				assignTo: 1,
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$assignTo.student_id',
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
				as: 'assignTo.student_id',
			},
		},
		{
			$unwind: {
				path: '$assignTo.student_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$sort: {
				'assignTo.student_id.name': 1,
			},
		},
		{
			$unwind: {
				path: '$report',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: {
					school_id: '$school_id',
					class_id: '$class_id',
					section_id: '$report.k',
				},
				data: {
					$push: '$assignTo',
				},
				totalAssigned: {
					$sum: '$report.v.totalAssignedTo',
				},
				submitted: {
					$sum: '$report.v.submitted',
				},
				lateSubmitted: {
					$sum: '$report.v.lateSubmitted',
				},
				evaluated: {
					$sum: '$report.v.evaluated',
				},
				isAbleTo: {
					$sum: '$report.v.isAbleTo',
				},
				totalAssignments: {
					$addToSet: '$_id',
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
					section_id: {
						$toObjectId: '$_id.section_id',
					},
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
		.cell(4, 3, 4, 5, true)
		.string(` ${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()} `)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(5, 2).string('Total Assigned').style(style);
	worksheet.cell(5, 3).string('Submission').style(style);
	worksheet.cell(5, 4).string('Evaluated').style(style);
	worksheet.cell(5, 5).string('Outcomes').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 6;
	let col = 1;

	reports.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`)
			.style(style);
		worksheet
			.cell(row, col + 1) // TODO: change the report.assignmentTO in the aggregation.
			.string(`${ele.totalAssigned}`)
			.style(style);
		worksheet
			.cell(row, col + 2)
			.string(
				`${parseFloat(
					((ele.submitted + ele.lateSubmitted) / ele.totalAssigned) * 100
				).toFixed(2)} %`
			)
			.style(style);
		worksheet
			.cell(row, col + 3)
			.string(
				`${parseFloat(
					(ele.evaluated / (ele.submitted + ele.lateSubmitted)) * 100
				).toFixed(2)} %`
			)
			.style(style);
		worksheet
			.cell(row, col + 4)
			.string(
				`${parseFloat((ele.outcomes / ele.evaluated) * 100).toFixed(2)} %`
			)
			.style(style);
	});
	for (const ele of reports) {
		const totalAssignments = ele.totalAssignments.length;
		// reports.forEach(async ele => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele._id.class_id.name} ${ele._id.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1
			.cell(1, 2)
			.string(
				`${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}`
			);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		worksheet1.cell(1, 4).string(`${totalAssignments}`).style(style);
		// row 2
		worksheet1.cell(2, 1).string('Class Name ').style(style);
		worksheet1.cell(2, 2).string(`${ele._id.class_id.name}`);
		worksheet1.cell(2, 3).string('Submission');
		worksheet1
			.cell(2, 4)
			.string(
				`${parseFloat(
					((ele.submitted + ele.lateSubmitted) / ele.totalAssigned) * 100
				).toFixed(2)} %`
			);
		// row 3
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1
			.cell(3, 4)
			.string(
				`${parseFloat(
					(ele.evaluated / (ele.submitted + ele.lateSubmitted)) * 100
				).toFixed(2)} %`
			)
			.style(style);
		// row 4
		worksheet1.cell(4, 3).string('Outcomes').style(style);
		worksheet1
			.cell(4, 4)
			.string(
				`${parseFloat((ele.isAbleTo / ele.evaluated) * 100).toFixed(2)} %`
			)
			.style(style);
		worksheet1.cell(5, 1).string('Student Name').style(style);
		worksheet1.cell(5, 2).string('Total Assignment').style(style);
		worksheet1.cell(5, 3).string('Submission').style(style);
		worksheet1.cell(5, 4).string('Evaluated').style(style);
		worksheet1.cell(5, 5).string('Outcomes').style(style);

		row = 6;
		col = 1;
		let ableTo_count = 0;
		for (const ele1 of ele.data) {
			if (ele1.isAbleTo == true) {
				ableTo_count += 1;
			}
			// ele.data.forEach(async ele1 => {
			const totalAssign = await Assignment.find({
				'assignTo.student_id': ele1.student_id._id,
				startDate: {
					$gte: startDate,
					$lte: endDate,
				},
			}).estimatedDocumentCount();
			worksheet1
				.cell(row, col)
				// .string(`${ele1.student_id.name}`);
				.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 1)
				.string(`${ele1.status == 'SUBMITTED' ? 1 : 0}/${totalAssign}`);
			worksheet1
				.cell(row, col + 2)
				.string(
					`${
						ele1.status == 'SUBMITTED'
							? parseFloat(
									(ele1.status == 'SUBMITTED' ? 1 : 0 / totalAssign) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			worksheet1
				.cell(row, col + 3)
				.string(
					`${
						ele1.status == 'EVALUATED'
							? parseFloat(
									(ele1.status == 'EVALUATED' ? 1 : 0 / totalAssign) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			worksheet1
				.cell(row, col + 4)
				.string(
					`${
						ele1.isAbleTo == true
							? parseFloat(
									(ele1.isAbleTo == true
										? 1
										: 0 /
										  (ele1.status == 'LATE_SUBMITTED'
												? 1
												: 0 + ele1.status == 'EVALUATED'
												? 1
												: 0 + ele1.status == 'REASSIGNED'
												? 1
												: 0)) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			row += 1;
			col = 1;
		}
		// );
	}
	// );

	workbook.write('ClassDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.classWeeklyReportExcel = catchAsync(async (req, res, next) => {
	let { schoolId, classId, date } = req.query;
	if (!classId || !schoolId || !date) {
		return next(
			new ErrorResponse('Please provide schoolId, classId & date', 400)
		);
	}
	const dateM = new Date(date);
	const { weekStart, weekEnd } = getWeekDates(date);
	const startDate = new Date(weekStart);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(weekEnd);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: {
					school_id: '$school_id',
					class_id: '$class_id',
					startDate: '$startDate',
					section_id: '$assignTo.section_id',
				},
				report: {
					$first: '$report',
				},
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school_id: '$_id.school_id',
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
				as: '_id.school_id',
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
			$unwind: '$_id.school_id',
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$unwind: '$_id.section_id',
		},
		{
			$group: {
				_id: {
					school_id: '$_id.school_id',
					class_id: '$_id.class_id',
					section_id: '$_id.section_id',
				},
				report: {
					$push: '$$ROOT',
				},
			},
		},
	]);

	const studentReport = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'assignTo.startDate': '$startDate',
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$assignTo.section_id',
					student_id: '$assignTo.student_id',
				},
				assignTo: {
					$push: '$assignTo',
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id.student_id',
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
				as: '_id.student_id',
			},
		},
		{
			$unwind: '$_id.student_id',
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
			$unwind: '$_id.class_id',
		},
		{
			$unwind: '$_id.section_id',
		},
		{
			$sort: {
				'_id.student_id.name': 1,
			},
		},
		{
			$group: {
				_id: {
					class_id: '$_id.class_id',
					section_id: '$_id.section_id',
				},
				totalStudents: {
					$push: {
						class_id: '$_id.class_id',
						section_id: '$_id.section_id',
						student_id: '$_id.student_id',
						assignTo: '$assignTo',
					},
				},
			},
		},
	]);
	if (!reports.length) {
		res.status(200).json({ message: 'no data found' });
	}
	let assignToCount = 0;
	let submissionCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
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
	worksheet.cell(1, 2).string('Weekly');
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet.cell(2, 2).string(
		`${dateM.toLocaleString('default', {
			month: 'long',
		})}`
	);

	worksheet.cell(3, 1).string('School Name').style(style);
	worksheet.cell(3, 2).string(`${reports[0]._id.school_id.schoolName}`);
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet
		.cell(4, 2)
		.string(
			` ${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})}
			`
		)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(5, 2).string('Total Submission').style(style);
	worksheet.cell(5, 3).string('Total Evaluated').style(style);
	worksheet.cell(5, 4).string('Total Outcomes').style(style);
	worksheet.cell(5, 5).string('Total Assigned').style(style);

	date = new Date(startDate);
	let col1 = 6;
	do {
		worksheet
			.cell(4, col1, 4, col1 + 2, true)
			.string(
				`${date.getDate()} ${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Submission').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(5, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		date.setDate(date.getDate() + 1);
	} while (date <= endDate);

	// row 6
	let row = 6;
	let col = 1;
	reports.forEach(ele => {
		assignToCount = 0;
		submissionCount = 0;
		evaluatedCount = 0;
		ableToCount = 0;
		const lateSubmitted = 0;
		const reassigned = 0;
		for (const ele of reports) {
			ele.report.forEach(ele1 => {
				submissionCount += ele1.report.submitted;
				evaluatedCount += ele1.report.evaluated;
				ableToCount += ele1.report.isAbleTo;
				assignToCount += ele1.report.totalAssignedTo;
			});
		}
		worksheet
			.cell(row, col)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`);
		worksheet
			.cell(row, col + 1)
			.string(
				`${parseFloat((submissionCount / assignToCount) * 100).toFixed(2)}%`
			);
		worksheet
			.cell(row, col + 2)
			.string(
				`${parseFloat((evaluatedCount / assignToCount) * 100).toFixed(2)}%`
			);
		worksheet
			.cell(row, col + 3)
			.string(
				`${
					ableToCount == 0
						? 0
						: parseFloat(
								(ableToCount / (lateSubmitted + reassigned + evaluatedCount)) *
									100
						  ).toFixed(2)
				}%`
			);
		worksheet.cell(row, col + 4).string(`${assignToCount}`);
		col = 6;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.report.findIndex(
				att =>
					date1.getTime() ==
					new Date(att._id.startDate.setHours(0, 0, 0, 0)).getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.string(
						`${parseFloat(
							(ele.report[itemIndex].report.submitted /
								ele.report[itemIndex].report.totalAssignedTo) *
								100
						).toFixed(2)}%`
					);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${parseFloat(
								(ele.report[itemIndex].report.evaluated /
									ele.report[itemIndex].report.totalAssignedTo) *
									100
						  ).toFixed(2)}%`
				);
			worksheet
				.cell(row, col + 2)
				.string(
					itemIndex == -1
						? ''
						: `${
								ele.report[itemIndex].report.isAbleTo == 0
									? 0
									: parseFloat(
											(ele.report[itemIndex].report.isAbleTo /
												(ele.report[itemIndex].report.lateSubmitted +
													ele.report[itemIndex].report.reassigned +
													ele.report[itemIndex].report.evaluated)) *
												100
									  ).toFixed(2)
						  }%`
				);
			col += 3;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= endDate);
		row += 1;
		col = 1;
	});

	for (const ele of studentReport) {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele._id.class_id.name} ${ele._id.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1
			.cell(1, 2)
			.string(
				`${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}`
			);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		worksheet1.cell(1, 4).string(``).style(style);
		// row 2
		worksheet1.cell(2, 1).string('Class Name ').style(style);
		worksheet1
			.cell(2, 2)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`);
		worksheet1.cell(2, 3).string('Submission').style(style);
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1.cell(4, 3).string('Outcomes').style(style);
		date = new Date(startDate);
		col1 = 3;
		do {
			worksheet1
				.cell(5, col1, 5, col1 + 2, true)
				.string(
					`${date.getDate()} ${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(6, col1).string('Submission').style(style);
			worksheet1
				.cell(6, col1 + 1)
				.string('Evaluated')
				.style(style);
			worksheet1
				.cell(6, col1 + 2)
				.string('Outcomes')
				.style(style);
			col1 += 3;
			date.setDate(date.getDate() + 1);
		} while (date <= endDate);

		worksheet1.cell(6, 1).string('Student Name').style(style);
		worksheet1.cell(6, 2).string('Total Assignment').style(style);

		for (const ele1 of ele.totalStudents) {
			submissionCount = 0;
			assignToCount = 0;
			evaluatedCount = 0;
			ableToCount = 0;
			ele1.assignTo.forEach(e => {
				if (e.status == 'SUBMITTED') {
					submissionCount += 1;
				}
				if (e.status == 'EVALUATED') {
					evaluatedCount += 1;
				}
				if (e.isAbleTo == true) {
					ableToCount += 1;
				}
				assignToCount += 1;
			});
			worksheet1
				.cell(row, col)
				.string(`${ele1.student_id ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 1)
				.string(`${submissionCount}/${assignToCount}`);
			col = 3;
			const date1 = new Date(startDate);
			do {
				const itemIndex = ele1.assignTo.findIndex(
					att =>
						date1.getTime() ==
						new Date(att.startDate.setHours(0, 0, 0, 0)).getTime()
				);
				if (itemIndex == -1) {
					worksheet1.cell(row, col).string('');
				} else {
					worksheet1
						.cell(row, col)
						.string(
							`${
								ele1.assignTo[itemIndex].status == 'SUBMITTED'
									? parseFloat(
											(ele1.assignTo[itemIndex].status == 'SUBMITTED'
												? 1
												: 0 / assignToCount) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
					worksheet1
						.cell(row, col + 1)
						.string(
							`${
								ele1.assignTo[itemIndex].evaluated
									? parseFloat(
											(ele1.assignTo[itemIndex].status == 'EVALUATED'
												? 1
												: 0 / assignToCount) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
					worksheet1
						.cell(row, col + 2)
						.string(
							`${
								ele1.assignTo[itemIndex].isAbleTo == true
									? parseFloat(
											(ele1.assignTo[itemIndex].isAbleTo == true
												? 1
												: 0 /
												  (ele1.assignTo[itemIndex].status == 'LATE_SUBMITTED'
														? 1
														: 0 + ele1.assignTo[itemIndex].status ==
														  'REASSIGNED'
														? 1
														: 0 + ele1.assignTo[itemIndex].status == 'EVALUATED'
														? 1
														: 0)) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
				}
				col += 3;
				date1.setDate(date1.getDate() + 1);
			} while (date1 <= endDate);

			row += 1;
			col = 1;
		}
	}
	// workbook.write('ClassWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.classMonthlyReportExcel = catchAsync(async (req, res, next) => {
	let { schoolId, classId, date } = req.query;
	if (!classId || !schoolId || !date) {
		return next(
			new ErrorResponse('Please provide schoolId, classId & date', 400)
		);
	}
	const dateM = new Date(date);
	const allDate = getDaysInMonth(dateM.getMonth() + 1, dateM.getFullYear());
	const startDate = new Date(allDate[0]);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(allDate[allDate.length - 1]);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: {
					school_id: '$school_id',
					class_id: '$class_id',
					startDate: '$startDate',
					section_id: '$assignTo.section_id',
				},
				report: {
					$first: '$report',
				},
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school_id: '$_id.school_id',
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
				as: '_id.school_id',
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
			$unwind: '$_id.school_id',
		},
		{
			$unwind: '$_id.class_id',
		},
		{
			$unwind: '$_id.section_id',
		},
		{
			$group: {
				_id: {
					school_id: '$_id.school_id',
					class_id: '$_id.class_id',
					section_id: '$_id.section_id',
				},
				report: {
					$push: '$$ROOT',
				},
			},
		},
	]);

	const studentReport = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				class_id: mongoose.Types.ObjectId(classId),
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'assignTo.startDate': '$startDate',
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: {
					class_id: '$class_id',
					section_id: '$assignTo.section_id',
					student_id: '$assignTo.student_id',
				},
				assignTo: {
					$push: '$assignTo',
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$_id.student_id',
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
				as: '_id.student_id',
			},
		},
		{
			$unwind: '$_id.student_id',
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
			$unwind: '$_id.class_id',
		},
		{
			$unwind: '$_id.section_id',
		},
		{
			$sort: {
				'_id.student_id.name': 1,
			},
		},
		{
			$group: {
				_id: {
					class_id: '$_id.class_id',
					section_id: '$_id.section_id',
				},
				totalStudents: {
					$push: {
						class_id: '$_id.class_id',
						section_id: '$_id.section_id',
						student_id: '$_id.student_id',
						assignTo: '$assignTo',
					},
				},
			},
		},
	]);
	if (!reports.length) {
		res.status(200).json({ message: 'no data found' });
	}
	let assignToCount = 0;
	let submissionCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
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
	worksheet.cell(1, 2).string('Monthly');
	worksheet.cell(2, 1).string('Month:').style(style);
	worksheet.cell(2, 2).string(
		`${dateM.toLocaleString('default', {
			month: 'long',
		})}`
	);

	worksheet.cell(3, 1).string('School Name').style(style);
	worksheet.cell(3, 2).string(`${reports[0]._id.school_id.schoolName}`);
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet
		.cell(4, 2)
		.string(
			` ${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})}
			`
		)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(5, 2).string('Total Submission').style(style);
	worksheet.cell(5, 3).string('Total Evaluated').style(style);
	worksheet.cell(5, 4).string('Total Outcomes').style(style);
	worksheet.cell(5, 5).string('Total Assigned').style(style);

	date = new Date(startDate);
	let col1 = 6;
	do {
		worksheet
			.cell(4, col1, 4, col1 + 2, true)
			.string(
				`${date.getDate()} ${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Submission').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(5, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		date.setDate(date.getDate() + 1);
	} while (date <= endDate);

	// row 6
	let row = 6;
	let col = 1;
	reports.forEach(ele => {
		assignToCount = 0;
		submissionCount = 0;
		evaluatedCount = 0;
		ableToCount = 0;
		const lateSubmitted = 0;
		const reassigned = 0;
		for (const ele of reports) {
			ele.report.forEach(ele1 => {
				submissionCount += ele1.report.submitted;
				evaluatedCount += ele1.report.evaluated;
				ableToCount += ele1.report.isAbleTo;
				assignToCount += ele1.report.totalAssignedTo;
			});
		}
		worksheet
			.cell(row, col)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`);
		worksheet
			.cell(row, col + 1)
			.string(
				`${parseFloat((submissionCount / assignToCount) * 100).toFixed(2)}%`
			);
		worksheet
			.cell(row, col + 2)
			.string(
				`${parseFloat((evaluatedCount / assignToCount) * 100).toFixed(2)}%`
			);
		worksheet
			.cell(row, col + 3)
			.string(
				`${
					ableToCount == 0
						? 0
						: parseFloat(
								(ableToCount / (lateSubmitted + reassigned + evaluatedCount)) *
									100
						  ).toFixed(2)
				}%`
			);
		worksheet.cell(row, col + 4).string(`${assignToCount}`);
		col = 6;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.report.findIndex(
				att =>
					date1.getTime() ==
					new Date(att._id.startDate.setHours(0, 0, 0, 0)).getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.string(
						`${parseFloat(
							(ele.report[itemIndex].report.submitted /
								ele.report[itemIndex].report.totalAssignedTo) *
								100
						).toFixed(2)}%`
					);
			}
			worksheet
				.cell(row, col + 1)
				.string(
					itemIndex == -1
						? ''
						: `${parseFloat(
								(ele.report[itemIndex].report.evaluated /
									ele.report[itemIndex].report.totalAssignedTo) *
									100
						  ).toFixed(2)}%`
				);
			worksheet
				.cell(row, col + 2)
				.string(
					itemIndex == -1
						? ''
						: `${
								ele.report[itemIndex].report.isAbleTo == 0
									? 0
									: parseFloat(
											(ele.report[itemIndex].report.isAbleTo /
												(ele.report[itemIndex].report.lateSubmitted +
													ele.report[itemIndex].report.reassigned +
													ele.report[itemIndex].report.evaluated)) *
												100
									  ).toFixed(2)
						  }%`
				);
			col += 3;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= endDate);
		row += 1;
		col = 1;
	});

	for (const ele of studentReport) {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele._id.class_id.name} ${ele._id.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1
			.cell(1, 2)
			.string(
				`${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}`
			);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		worksheet1.cell(1, 4).string(``).style(style);
		// row 2
		worksheet1.cell(2, 1).string('Class Name ').style(style);
		worksheet1
			.cell(2, 2)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`);
		worksheet1.cell(2, 3).string('Submission').style(style);
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1.cell(4, 3).string('Outcomes').style(style);
		date = new Date(startDate);
		col1 = 3;
		do {
			worksheet1
				.cell(5, col1, 5, col1 + 2, true)
				.string(
					`${date.getDate()} ${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(6, col1).string('Submission').style(style);
			worksheet1
				.cell(6, col1 + 1)
				.string('Evaluated')
				.style(style);
			worksheet1
				.cell(6, col1 + 2)
				.string('Outcomes')
				.style(style);
			col1 += 3;
			date.setDate(date.getDate() + 1);
		} while (date <= endDate);

		worksheet1.cell(6, 1).string('Student Name').style(style);
		worksheet1.cell(6, 2).string('Total Assignment').style(style);

		for (const ele1 of ele.totalStudents) {
			submissionCount = 0;
			assignToCount = 0;
			evaluatedCount = 0;
			ableToCount = 0;
			ele1.assignTo.forEach(e => {
				if (e.status == 'SUBMITTED') {
					submissionCount += 1;
				}
				if (e.status == 'EVALUATED') {
					evaluatedCount += 1;
				}
				if (e.isAbleTo == true) {
					ableToCount += 1;
				}
				assignToCount += 1;
			});
			worksheet1
				.cell(row, col)
				.string(`${ele1.student_id ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 1)
				.string(`${submissionCount}/${assignToCount}`);
			col = 3;
			const date1 = new Date(startDate);
			do {
				const itemIndex = ele1.assignTo.findIndex(
					att =>
						date1.getTime() ==
						new Date(att.startDate.setHours(0, 0, 0, 0)).getTime()
				);
				if (itemIndex == -1) {
					worksheet1.cell(row, col).string('');
				} else {
					worksheet1
						.cell(row, col)
						.string(
							`${
								ele1.assignTo[itemIndex].status == 'SUBMITTED'
									? parseFloat(
											(ele1.assignTo[itemIndex].status == 'SUBMITTED'
												? 1
												: 0 / assignToCount) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
					worksheet1
						.cell(row, col + 1)
						.string(
							`${
								ele1.assignTo[itemIndex].evaluated
									? parseFloat(
											(ele1.assignTo[itemIndex].status == 'EVALUATED'
												? 1
												: 0 / assignToCount) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
					worksheet1
						.cell(row, col + 2)
						.string(
							`${
								ele1.assignTo[itemIndex].isAbleTo == true
									? parseFloat(
											(ele1.assignTo[itemIndex].isAbleTo == true
												? 1
												: 0 /
												  (ele1.assignTo[itemIndex].status == 'LATE_SUBMITTED'
														? 1
														: 0 + ele1.assignTo[itemIndex].status ==
														  'REASSIGNED'
														? 1
														: 0 + ele1.assignTo[itemIndex].status == 'EVALUATED'
														? 1
														: 0)) * 100
									  ).toFixed(2)
									: 0
							}%`
						);
				}
				col += 3;
				date1.setDate(date1.getDate() + 1);
			} while (date1 <= endDate);

			row += 1;
			col = 1;
		}
	}
	// workbook.write('ClassMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.classDailyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, classId, date } = req.query;
		if (!schoolId || !classId || !date) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id and startDate',
					400
				)
			);
		}
		const { startDate, endDate } = getDailyDates(date);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			null,
			startDate,
			endDate
		);
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.sectionDailyReportStudentList = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, classId, sectionId, date } = req.query;
		if (!schoolId || !classId || !date) {
			return next(
				new ErrorResponse(
					'Please provide school_id, class_id and startDate',
					400
				)
			);
		}
		const { startDate, endDate } = getDailyDates(date);
		const reportData = await getDataStudentList(
			schoolId,
			classId,
			sectionId,
			startDate,
			endDate
		);
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res.status(200).json({
			status: 'success',
			data: reportData.reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.sectionWeeklyReport = catchAsync(async (req, res, next) => {
	try {
		let { sectionId, startDate, endDate } = req.query;
		if (!sectionId || !startDate || !endDate) {
			return next(
				new ErrorResponse('Please provide section_id and startDate', 400)
			);
		}
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		const { sectionReport } = await getSectionReport(
			sectionId,
			startDate,
			endDate
		);
		if (sectionReport) {
			res.status(200).json({
				status: 'success',
				data: sectionReport,
			});
		} else {
			res.status(204).json(new ErrorResponse(204, 'No Assignments Found'));
		}
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.sectionDailyReport = catchAsync(async (req, res, next) => {
	const { sectionId, date } = req.query;
	if (!sectionId || !date) {
		return next(
			new ErrorResponse('Please provide section_id and startDate', 400)
		);
	}
	const { startDate, endDate } = getDailyDates(date);
	const { sectionReport } = await getSectionReport(
		sectionId,
		startDate,
		endDate
	);

	res.status(200).json({
		status: 'success',
		data: sectionReport,
	});
});

exports.sectionDailyReportExcel = catchAsync(async (req, res, next) => {
	const { sectionId, date } = req.query;
	if (!sectionId || !date) {
		return next(new ErrorResponse('Please provide sectionId & date', 400));
	}
	const dateM = new Date(date);
	const startDate = new Date(date);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(date);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.find({
		'assignTo.section_id': sectionId,
		startDate: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('school_id class_id', 'name schoolName')
		.populate('assignTo.section_id assignTo.student_id', 'name')
		.lean();
	let assignToCount = 0;
	let submissionCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
	const studentArr = [];
	reports.forEach(ele => {
		ele.assignTo.forEach(ele1 => {
			if (ele1.section_id._id == sectionId) {
				if (ele1.status == 'SUBMITTED') {
					submissionCount += 1;
				}
				if (ele1.status == 'EVALUATED') {
					evaluatedCount += 1;
				}
				if (ele1.isAbleTo == true) {
					ableToCount += 1;
				}
				assignToCount += 1;
				studentArr.push(ele1);
			}
		});
	});
	studentArr.sort((a, b) => {
		const nameA = a.student_id.name.toUpperCase();
		const nameB = b.student_id.name.toUpperCase();
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		// names must be equal
		return 0;
	});
	const uniqueIds = [];
	const studentReport = studentArr.filter(element => {
		const isDuplicate = uniqueIds.includes(element.student_id._id);

		if (!isDuplicate) {
			uniqueIds.push(element.student_id._id);

			return true;
		}

		return false;
	});
	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet(
		`${
			reports[0].class_id
				? reports[0].class_id.name
				: reports[1].class_id
				? reports[1].class_id.name
				: ''
		}`
	);
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
	worksheet.cell(1, 1).string('Date:').style(style);
	worksheet
		.cell(1, 2)
		.string(
			` ${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}
			`
		)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(1, 3).string('Total Assignment').style(style);
	worksheet
		.cell(1, 4)
		.string(`${reports ? reports.length : 0}`)
		.style({ alignment: { horizontal: 'center' } });

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Class Name').style(style);
	worksheet
		.cell(2, 2)
		.string(
			`${
				reports[0].class_id
					? reports[0].class_id.name
					: reports[1].class_id
					? reports[1].class_id.name
					: ''
			}`
		)
		.style(style);
	worksheet.cell(2, 3).string('Submission').style(style);
	worksheet
		.cell(2, 4)
		.string(
			`${parseFloat((submissionCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });
	// row 3
	worksheet.cell(3, 3).string('Evaluated').style(style);
	worksheet
		.cell(3, 4)
		.string(
			`${parseFloat((evaluatedCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 4
	worksheet.cell(4, 3).string('Outcomes').style(style);
	worksheet
		.cell(4, 4)
		.string(`${ableToCount}/${assignToCount}`)
		.style({ alignment: { horizontal: 'center' } });
	worksheet
		.cell(5, 3, 5, 5, true)
		.string(
			` ${dateM.getDate()} ${dateM.toLocaleString('default', {
				month: 'long',
			})} ${dateM.getFullYear()} `
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(6, 1).string('Student Name').style(style);
	worksheet.cell(6, 2).string('Total Assigned').style(style);
	worksheet.cell(6, 3).string('Submission').style(style);
	worksheet.cell(6, 4).string('Evaluated').style(style);
	worksheet.cell(6, 5).string('Outcomes').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 7;
	let col = 1;
	for (const ele of studentReport) {
		// const totalAssig = studentArr.find(
		// 	({ student_id }) => student_id._id == ele.student_id._id
		// );
		// const lookup = studentArr.reduce((a, e) => {
		// 	a[e.student_id._id] = ++a[e.student_id._id] || 0;
		// 	return a;
		// }, {});

		// const totalAssig = studentArr.filter(e => lookup[e.student_id._id]);
		const totalAssig = studentArr.filter(
			e => e.student_id._id == ele.student_id._id
		);
		let submitCount = 0;
		let evaluateCount = 0;
		let ableToCount = 0;
		let lateSubmitCount = 0;
		let reassignCount = 0;
		totalAssig.forEach(e => {
			if (ele.status == 'SUBMITTED') {
				submitCount += 1;
			}
			if (ele.status == 'EVALUATED') {
				evaluateCount += 1;
			}
			if (ele.status == 'REASSIGNED') {
				reassignCount += 1;
			}
			if (ele.status == 'LATE_SUBMITTED') {
				lateSubmitCount += 1;
			}
			if (ele.isAbleTo == true) {
				ableToCount += 1;
			}
		});
		worksheet
			.cell(row, col)
			.string(`${ele.student_id ? ele.student_id.name : ''}`);
		worksheet
			.cell(row, col + 1)
			.string(`${totalAssig.length}/${reports.length}`);
		worksheet
			.cell(row, col + 2)
			.string(
				`${parseFloat((submitCount / reports.length) * 100).toFixed(2)} %`
			);
		worksheet
			.cell(row, col + 3)
			.string(
				`${parseFloat((evaluateCount / reports.length) * 100).toFixed(2)} %`
			);
		worksheet
			.cell(row, col + 4)
			.string(
				`${
					ableToCount == 0
						? 0
						: parseFloat(
								((ableToCount /
									(lateSubmitCount + reassignCount + evaluateCount)) *
									100) /
									reports.length
						  ).toFixed(2)
				} %`
			);
		row += 1;
		col = 1;
	}
	// workbook.write('SectionDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.sectionWeeklyReportExcel = catchAsync(async (req, res, next) => {
	let { sectionId, startDate, endDate } = req.query;
	if (!sectionId || !startDate || !endDate) {
		return next(new ErrorResponse('Please provide sectionId & date', 400));
	}
	const dateM = new Date();
	startDate = new Date(startDate);
	endDate = new Date(endDate);
	startDate.setHours(0, 0, 0, 0);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.find({
		'assignTo.section_id': sectionId,
		startDate: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('school_id class_id', 'name schoolName')
		.populate('assignTo.section_id assignTo.student_id', 'name')
		.lean();

	const studentReport = await Assignment.aggregate([
		{
			$match: {
				'assignTo.section_id': mongoose.Types.ObjectId(sectionId),
				startDate: {
					$gte: new Date(startDate),
					$lte: new Date(endDate),
				},
			},
		},
		{
			$addFields: {
				'assignTo.startDate': '$startDate',
			},
		},
		{
			$group: {
				_id: {},
				assignTo: {
					$push: {
						$filter: {
							input: '$assignTo',
							as: 'item',
							cond: {
								$eq: ['$$item.section_id', mongoose.Types.ObjectId(sectionId)],
							},
						},
					},
				},
			},
		},
		{
			$project: {
				assignTo: {
					$reduce: {
						input: '$assignTo',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$group: {
				_id: '$assignTo.student_id',
				assignTo: {
					$push: '$assignTo',
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
			$unwind: '$_id',
		},
		{
			$sort: {
				'_id.name': 1,
			},
		},
	]);
	if (!reports.length) {
		res.status(200).json({ message: 'no data found' });
	}
	let assignToCount = 0;
	let submissionCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
	reports.forEach(ele => {
		ele.assignTo.forEach(ele1 => {
			if (ele1.section_id._id == sectionId) {
				if (ele1.status == 'SUBMITTED') {
					submissionCount += 1;
				}
				if (ele1.status == 'EVALUATED') {
					evaluatedCount += 1;
				}
				if (ele1.isAbleTo == true) {
					ableToCount += 1;
				}
				assignToCount += 1;
			}
		});
	});

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet(
		`${
			reports[0].class_id
				? reports[0].class_id.name
				: reports[1].class_id
				? reports[1].class_id.name
				: ''
		}`
	);
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
	worksheet.cell(1, 1).string('Date:').style(style);
	worksheet
		.cell(1, 2)
		.string(
			` ${dateM.getDate()}- ${dateM.getMonth() + 1}- ${dateM.getFullYear()}
			`
		)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(1, 3).string('Total Assignment').style(style);
	worksheet
		.cell(1, 4)
		.string(`${reports ? reports.length : 0}`)
		.style({ alignment: { horizontal: 'center' } });

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Class Name').style(style);
	worksheet
		.cell(2, 2)
		.string(
			`${
				reports[0].class_id
					? reports[0].class_id.name
					: reports[1].class_id
					? reports[1].class_id.name
					: ''
			}`
		)
		.style(style);
	worksheet.cell(2, 3).string('Submission').style(style);
	worksheet
		.cell(2, 4)
		.string(
			`${parseFloat((submissionCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });
	// row 3
	worksheet.cell(3, 1).string('Report Type:').style(style);
	worksheet.cell(3, 2).string('Weekly').style(style);
	worksheet.cell(3, 3).string('Evaluated').style(style);
	worksheet
		.cell(3, 4)
		.string(
			`${parseFloat((evaluatedCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 4
	worksheet.cell(4, 3).string('Outcomes').style(style);
	worksheet
		.cell(4, 4)
		.string(`${ableToCount}/${assignToCount}`)
		.style({ alignment: { horizontal: 'center' } });
	let col1 = 3;
	do {
		worksheet
			.cell(5, col1, 5, col1 + 2, true)
			.string(
				`${startDate.getDate()} ${startDate.toLocaleString('default', {
					month: 'long',
				})} ${startDate.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(6, col1).string('Submission').style(style);
		worksheet
			.cell(6, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(6, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		startDate.setDate(startDate.getDate() + 1);
	} while (startDate <= endDate);

	// row 5
	worksheet.cell(6, 1).string('Student Name').style(style);
	worksheet.cell(6, 2).string('Total Assigned').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 7;
	let col = 1;
	for (const ele of studentReport) {
		submissionCount = 0;
		assignToCount = 0;
		evaluatedCount = 0;
		ableToCount = 0;
		ele.assignTo.forEach(e => {
			if (e.status == 'SUBMITTED') {
				submissionCount += 1;
			}
			if (e.status == 'EVALUATED') {
				evaluatedCount += 1;
			}
			if (e.isAbleTo == true) {
				ableToCount += 1;
			}
			assignToCount += 1;
		});
		worksheet.cell(row, col).string(`${ele._id ? ele._id.name : ''}`);
		worksheet.cell(row, col + 1).string(`${submissionCount}/${assignToCount}`);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.assignTo.findIndex(
				att =>
					date1.getTime() ==
					new Date(att.startDate.setHours(0, 0, 0, 0)).getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.string(
						`${
							ele.assignTo[itemIndex].status == 'SUBMITTED'
								? parseFloat(
										(ele.assignTo[itemIndex].status == 'SUBMITTED'
											? 1
											: 0 / assignToCount) * 100
								  ).toFixed(2)
								: 0
						}%`
					);
				worksheet
					.cell(row, col + 1)
					.string(
						`${
							ele.assignTo[itemIndex].evaluated
								? parseFloat(
										(ele.assignTo[itemIndex].status == 'EVALUATED'
											? 1
											: 0 / assignToCount) * 100
								  ).toFixed(2)
								: 0
						}%`
					);
				worksheet
					.cell(row, col + 2)
					.string(
						`${
							ele.assignTo[itemIndex].isAbleTo == true
								? parseFloat(
										(ele.assignTo[itemIndex].isAbleTo == true
											? 1
											: 0 /
											  (ele.assignTo[itemIndex].status == 'LATE_SUBMITTED'
													? 1
													: 0 + ele.assignTo[itemIndex].status == 'REASSIGNED'
													? 1
													: 0 + ele.assignTo[itemIndex].status == 'EVALUATED'
													? 1
													: 0)) * 100
								  ).toFixed(2)
								: 0
						}%`
					);
			}
			col += 3;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= endDate);

		row += 1;
		col = 1;
	}
	// workbook.write('SectionWeekly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.sectionMonthlyReportExcel = catchAsync(async (req, res, next) => {
	let { sectionId, date } = req.query;
	if (!sectionId || !date) {
		return next(new ErrorResponse('Please provide sectionId & date', 400));
	}
	const dateM = new Date(date);
	const allDate = getDaysInMonth(dateM.getMonth() + 1, dateM.getFullYear());
	const startDate = new Date(allDate[0]);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(allDate[allDate.length - 1]);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.find({
		'assignTo.section_id': sectionId,
		startDate: {
			$gte: startDate,
			$lte: endDate,
		},
	})
		.populate('school_id class_id', 'name schoolName')
		.populate('assignTo.section_id assignTo.student_id', 'name')
		.lean();

	const studentReport = await AssignmentReportExcelModel.find({
		sectionId,
		month: dateM.getMonth() + 1,
		year: dateM.getFullYear(),
	})
		.populate('schoolId classId', 'name schoolName')
		.populate('sectionId studentId', 'name')
		.lean();
	if (!reports.length) {
		res.status(200).json({ message: 'no data found' });
	}
	let assignToCount = 0;
	let submissionCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
	reports.forEach(ele => {
		ele.assignTo.forEach(ele1 => {
			if (ele1.section_id._id == sectionId) {
				if (ele1.status == 'SUBMITTED') {
					submissionCount += 1;
				}
				if (ele1.status == 'EVALUATED') {
					evaluatedCount += 1;
				}
				if (ele1.isAbleTo == true) {
					ableToCount += 1;
				}
				assignToCount += 1;
			}
		});
	});

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet(
		`${
			reports[0].class_id
				? reports[0].class_id.name
				: reports[1].class_id
				? reports[1].class_id.name
				: ''
		}`
	);
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
	worksheet.cell(1, 1).string('Date:').style(style);
	worksheet
		.cell(1, 2)
		.string(
			` ${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}
			`
		)
		.style({ alignment: { horizontal: 'center' } });

	worksheet.cell(1, 3).string('Total Assignment').style(style);
	worksheet
		.cell(1, 4)
		.string(`${reports ? reports.length : 0}`)
		.style({ alignment: { horizontal: 'center' } });

	// Set value of cell A2 to 'string' styled with paramaters of style
	worksheet.cell(2, 1).string('Class Name').style(style);
	worksheet
		.cell(2, 2)
		.string(
			`${
				reports[0].class_id
					? reports[0].class_id.name
					: reports[1].class_id
					? reports[1].class_id.name
					: ''
			}`
		)
		.style(style);
	worksheet.cell(2, 3).string('Submission').style(style);
	worksheet
		.cell(2, 4)
		.string(
			`${parseFloat((submissionCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });
	// row 3
	worksheet.cell(3, 1).string('Report Type:').style(style);
	worksheet.cell(3, 2).string('Monthly').style(style);
	worksheet.cell(3, 3).string('Evaluated').style(style);
	worksheet
		.cell(3, 4)
		.string(
			`${parseFloat((evaluatedCount / assignToCount) * 100).toFixed(2)} %`
		)
		.style({ alignment: { horizontal: 'center' } });

	// row 4
	worksheet.cell(4, 3).string('Outcomes').style(style);
	worksheet
		.cell(4, 4)
		.string(`${ableToCount}/${assignToCount}`)
		.style({ alignment: { horizontal: 'center' } });
	date = new Date(startDate);
	let col1 = 3;
	do {
		worksheet
			.cell(5, col1, 5, col1 + 2, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(6, col1).string('Submission').style(style);
		worksheet
			.cell(6, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(6, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		date.setDate(date.getDate() + 1);
	} while (date <= endDate);

	// row 5
	worksheet.cell(6, 1).string('Student Name').style(style);
	worksheet.cell(6, 2).string('Total Assigned').style(style);

	// row 6
	studentReport.sort((a, b) => {
		const nameA = a.studentId.name.toUpperCase();
		const nameB = b.studentId.name.toUpperCase();
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		// names must be equal
		return 0;
	});
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 7;
	let col = 1;
	for (const ele of studentReport) {
		submissionCount = 0;
		assignToCount = 0;
		ele.AssignmentReport.forEach(e => {
			submissionCount += e.submitted;
			assignToCount += e.assignmentCount;
		});
		worksheet
			.cell(row, col)
			.string(`${ele.studentId ? ele.studentId.name : ''}`);
		worksheet.cell(row, col + 1).string(`${submissionCount}/${assignToCount}`);
		col = 3;
		const date1 = new Date(startDate);
		do {
			const itemIndex = ele.AssignmentReport.findIndex(
				att =>
					date1.getTime() == new Date(ele.year, ele.month, att.date).getTime()
			);
			if (itemIndex == -1) {
				worksheet.cell(row, col).string('');
			} else {
				worksheet
					.cell(row, col)
					.string(
						`${
							ele.AssignmentReport[itemIndex].submitted
								? parseFloat(
										(ele.AssignmentReport[itemIndex].submitted /
											ele.AssignmentReport[itemIndex].assignmentCount) *
											100
								  ).toFixed(2)
								: 0
						}%`
					);
				worksheet
					.cell(row, col + 1)
					.string(
						`${
							ele.AssignmentReport[itemIndex].evaluated
								? parseFloat(
										(ele.AssignmentReport[itemIndex].evaluated /
											ele.AssignmentReport[itemIndex].assignmentCount) *
											100
								  ).toFixed(2)
								: 0
						}%`
					);
				worksheet
					.cell(row, col + 2)
					.string(
						`${
							ele.AssignmentReport[itemIndex].isAbleTo
								? parseFloat(
										(ele.AssignmentReport[itemIndex].isAbleTo /
											(ele.AssignmentReport[itemIndex].lateSubmitted +
												ele.AssignmentReport[itemIndex].reassigned +
												ele.AssignmentReport[itemIndex].evaluated)) *
											100
								  ).toFixed(2)
								: 0
						}%`
					);
			}
			col += 3;
			date1.setDate(date1.getDate() + 1);
		} while (date1 <= endDate);

		row += 1;
		col = 1;
	}
	// workbook.write('SectionMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.studentMonthlyReportExcel = catchAsync(async (req, res, next) => {
	const { studentId, date } = req.query;
	if (!studentId || !date) {
		return next(new ErrorResponse('Please provide sectionId & startDate', 400));
	}
	const dateM = new Date(date);
	const reports = await AssignmentReportExcelModel.findOne({
		studentId,
		month: dateM.getMonth() + 1,
		year: dateM.getFullYear(),
	})
		.populate('schoolId classId sectionId', 'name schoolName')
		.populate('studentId', 'name')
		.lean();

	let submissionCount = 0;
	let latesubmissionCount = 0;
	let notSubmittedCount = 0;
	let outcomeCount = 0;
	let reassignCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
	reports.AssignmentReport.forEach(e => {
		evaluatedCount += e.evaluated;
		ableToCount += e.evaluated;
		latesubmissionCount += e.lateSubmitted;
		notSubmittedCount += e.notSubmitted;
		outcomeCount += e.outcomes;
		reassignCount += e.reassigned;
		submissionCount += e.submitted;
	});

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	// student name
	const worksheet = workbook.addWorksheet(``);
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
	worksheet.cell(1, 1).string('Student Name:').style(style);
	worksheet.cell(1, 2).string(`${reports.studentId.name}`).style(style);
	worksheet.cell(1, 3).string('Summary:').style(style);
	worksheet.cell(1, 4).string('Count').style(style);
	worksheet.cell(1, 5).string('Percentage').style(style);

	worksheet.cell(2, 1).string('Report Type:').style(style);
	worksheet.cell(2, 2).string('Monthly').style(style);
	worksheet.cell(2, 3).string('Total Assignments').style(style);
	worksheet.cell(2, 4).string(`${reports.totalAssignments}`).style(style);

	worksheet.cell(3, 1).string('Month:').style(style);
	worksheet
		.cell(3, 2)
		.string(`${dateM.getMonth() + 1}`)
		.style(style);
	worksheet.cell(3, 3).string('Submitted').style(style);
	worksheet.cell(3, 4).string(`${submissionCount}`).style(style);
	worksheet
		.cell(3, 5)
		.string(
			`${
				submissionCount == 0
					? 0
					: parseFloat(
							(submissionCount / reports.totalAssignments) * 100
					  ).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(4, 1).string('School Name:').style(style);
	worksheet.cell(4, 2).string(`${reports.schoolId.schoolName}`).style(style);
	worksheet.cell(4, 3).string('Evaluated').style(style);
	worksheet.cell(4, 4).string(`${evaluatedCount}`).style(style);
	worksheet
		.cell(4, 5)
		.string(
			`${
				evaluatedCount == 0
					? 0
					: parseFloat(
							(evaluatedCount / reports.totalAssignments) * 100
					  ).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(5, 1).string('Class:').style(style);
	worksheet
		.cell(5, 2)
		.string(`${reports.classId.name} ${reports.sectionId.name}`)
		.style(style);
	worksheet.cell(5, 3).string('Not Submitted').style(style);
	worksheet.cell(5, 4).string(`${notSubmittedCount}`).style(style);
	worksheet
		.cell(5, 5)
		.string(
			`${
				notSubmittedCount == 0
					? 0
					: parseFloat(
							(notSubmittedCount / reports.totalAssignments) * 100
					  ).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(6, 1).string('Date:').style(style);
	worksheet
		.cell(6, 2)
		.string(
			` ${dateM.getDate()}-${dateM.getMonth() + 1}-${dateM.getFullYear()}`
		)
		.style({ alignment: { horizontal: 'center' } });
	worksheet.cell(6, 3).string('Late Submitted').style(style);
	worksheet.cell(6, 4).string(`${latesubmissionCount}`).style(style);
	worksheet
		.cell(6, 5)
		.string(
			`${
				latesubmissionCount == 0
					? 0
					: parseFloat(
							(latesubmissionCount / reports.totalAssignments) * 100
					  ).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(7, 3).string('Reassigned').style(style);
	worksheet.cell(7, 4).string(`${reassignCount}`).style(style);
	worksheet
		.cell(7, 5)
		.string(
			`${
				reassignCount == 0
					? 0
					: parseFloat(
							(reassignCount / reports.totalAssignments) * 100
					  ).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(8, 3).string('coins').style(style);
	worksheet.cell(8, 4).string(`${reports.coins}`).style(style);

	worksheet.cell(10, 1).string('Day').style(style);
	worksheet.cell(10, 2).string('Date').style(style);
	worksheet.cell(10, 3).string('Total Assignments').style(style);
	worksheet.cell(10, 4).string('Submitted').style(style);
	worksheet.cell(10, 5).string('Not Submitted').style(style);
	worksheet.cell(10, 6).string('Evaluated').style(style);
	worksheet.cell(10, 7).string('Late Submitted').style(style);
	worksheet.cell(10, 8).string('Reassign').style(style);

	const allDates = getDaysInMonth(dateM.getMonth(), dateM.getFullYear());
	let row = 11;
	let col = 1;
	allDates.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(
				`${ele.toLocaleString('default', {
					weekday: 'long',
				})}`
			)
			.style(style);
		worksheet
			.cell(row, col + 1)
			.string(` ${ele.getDate()}-${ele.getMonth() + 1}-${ele.getFullYear()}`)
			.style(style);
		row += 1;
	});
	// row 11
	row = 11;
	col = 1;
	for (const ele of allDates) {
		for (const e of reports.AssignmentReport) {
			const newDate = new Date(
				`${dateM.getMonth() + 1}-${e.date}-${dateM.getFullYear()}`
			);
			if (newDate.getTime() == ele.getTime()) {
				evaluatedCount += e.evaluated;
				ableToCount += e.evaluated;
				latesubmissionCount += e.lateSubmitted;
				notSubmittedCount += e.notSubmitted;
				outcomeCount += e.outcomes;
				reassignCount += e.reassigned;
				submissionCount += e.submitted;
				worksheet
					.cell(row, col + 2)
					.string(`${e.assignmentCount}`)
					.style(style);
				worksheet
					.cell(row, col + 3)
					.string(`${e.submitted}`)
					.style(style);
				worksheet
					.cell(row, col + 4)
					.string(`${e.notSubmitted}`)
					.style(style);
				worksheet
					.cell(row, col + 5)
					.string(`${e.evaluated}`)
					.style(style);
				worksheet
					.cell(row, col + 6)
					.string(`${e.lateSubmitted}`)
					.style(style);
				worksheet
					.cell(row, col + 7)
					.string(`${e.reassigned}`)
					.style(style);
				break;
			}
		}
		row += 1;
		col = 1;
	}
	// workbook.write('StudentMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.teacherMonthlyReportExcel = catchAsync(async (req, res, next) => {
	const { teacherId, date } = req.query;
	if (!teacherId || !date) {
		return next(new ErrorResponse('Please provide sectionId & startDate', 400));
	}
	const dateM = new Date(date);
	const allDate = getDaysInMonth(dateM.getMonth(), dateM.getFullYear());
	const userData = await User.findOne({ _id: teacherId })
		.select('name school_id')
		.populate('school_id', 'schoolName')
		.lean();
	const reports = await Assignment.aggregate([
		{
			$match: {
				teacher_id: mongoose.Types.ObjectId(teacherId),
				startDate: {
					$gte: allDate[0],
					$lt: allDate[allDate.length - 1],
				},
			},
		},
		{
			$sort: {
				startDate: 1,
			},
		},
		{
			$addFields: {
				'report.date': '$startDate',
			},
		},
		{
			$group: {
				_id: '$teacher_id',
				data: {
					$push: '$report',
				},
			},
		},
	]);

	let assignmentCount = 0;
	let submissionCount = 0;
	let latesubmissionCount = 0;
	let notSubmittedCount = 0;
	let outcomeCount = 0;
	let reassignCount = 0;
	let evaluatedCount = 0;
	let ableToCount = 0;
	reports[0].data.forEach(e => {
		assignmentCount += e.totalAssignedTo;
		evaluatedCount += e.evaluated;
		ableToCount += e.evaluated;
		latesubmissionCount += e.lateSubmitted;
		notSubmittedCount += e.notSubmitted;
		outcomeCount += e.outcomes;
		reassignCount += e.reassigned;
		submissionCount += e.submitted;
	});

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	// student name
	const worksheet = workbook.addWorksheet(`${userData.name}`);
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
	worksheet.cell(1, 1).string('Teacher Name:').style(style);
	worksheet.cell(1, 2).string(`${userData.name}`).style(style);
	worksheet.cell(1, 3).string('Summary:').style(style);
	worksheet.cell(1, 4).string('Count').style(style);
	worksheet.cell(1, 5).string('Percentage').style(style);

	worksheet.cell(2, 1).string('Report Type:').style(style);
	worksheet.cell(2, 2).string('Monthly').style(style);
	worksheet.cell(2, 3).string('Total Assignments').style(style);
	worksheet.cell(2, 4).string(`${assignmentCount}`).style(style);

	worksheet.cell(3, 1).string('Month:').style(style);
	worksheet
		.cell(3, 2)
		.string(`${dateM.getMonth() + 1}`)
		.style(style);
	worksheet.cell(3, 3).string('Submitted').style(style);
	worksheet.cell(3, 4).string(`${submissionCount}`).style(style);
	worksheet
		.cell(3, 5)
		.string(
			`${
				submissionCount == 0
					? 0
					: parseFloat((submissionCount / assignmentCount) * 100).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(4, 1).string('School Name:').style(style);
	worksheet.cell(4, 2).string(`${userData.school_id.schoolName}`).style(style);
	worksheet.cell(4, 3).string('Evaluated').style(style);
	worksheet.cell(4, 4).string(`${evaluatedCount}`).style(style);
	worksheet
		.cell(4, 5)
		.string(
			`${
				evaluatedCount == 0
					? 0
					: parseFloat((evaluatedCount / assignmentCount) * 100).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(5, 1).string('Date:').style(style);
	worksheet
		.cell(5, 2)
		.string(
			` ${dateM.getDate()}-${dateM.getMonth() + 1}-${dateM.getFullYear()}`
		)
		.style({ alignment: { horizontal: 'center' } });
	worksheet.cell(5, 3).string('Not Submitted').style(style);
	worksheet.cell(5, 4).string(`${notSubmittedCount}`).style(style);
	worksheet
		.cell(5, 5)
		.string(
			`${
				notSubmittedCount == 0
					? 0
					: parseFloat((notSubmittedCount / assignmentCount) * 100).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(6, 3).string('Late Submitted').style(style);
	worksheet.cell(6, 4).string(`${latesubmissionCount}`).style(style);
	worksheet
		.cell(6, 5)
		.string(
			`${
				latesubmissionCount == 0
					? 0
					: parseFloat((latesubmissionCount / assignmentCount) * 100).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(7, 3).string('Reassigned').style(style);
	worksheet.cell(7, 4).string(`${reassignCount}`).style(style);
	worksheet
		.cell(7, 5)
		.string(
			`${
				reassignCount == 0
					? 0
					: parseFloat((reassignCount / assignmentCount) * 100).toFixed(2)
			}%`
		)
		.style(style);

	worksheet.cell(8, 3).string('coins').style(style);
	worksheet.cell(8, 4).string(`${reports.coins}`).style(style);

	worksheet.cell(10, 1).string('Day').style(style);
	worksheet.cell(10, 2).string('Date').style(style);
	worksheet.cell(10, 3).string('Total Assigned').style(style);
	worksheet.cell(10, 4).string('Submission').style(style);
	worksheet.cell(10, 5).string('Evaluated').style(style);
	worksheet.cell(10, 6).string('Outcomes').style(style);

	const allDates = getDaysInMonth(dateM.getMonth(), dateM.getFullYear());
	let row = 11;
	let col = 1;
	allDates.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(
				`${ele.toLocaleString('default', {
					weekday: 'long',
				})}`
			)
			.style(style);
		worksheet
			.cell(row, col + 1)
			.string(` ${ele.getDate()}-${ele.getMonth() + 1}-${ele.getFullYear()}`)
			.style(style);
		row += 1;
	});
	// row 11
	row = 11;
	col = 1;
	for (const ele of allDates) {
		for (const e of reports[0].data) {
			const newDate = new Date(e.date);
			newDate.setHours(0, 0, 0, 0);
			if (newDate.getTime() == ele.getTime()) {
				evaluatedCount += e.evaluated;
				ableToCount += e.evaluated;
				latesubmissionCount += e.lateSubmitted;
				notSubmittedCount += e.notSubmitted;
				outcomeCount += e.outcomes;
				reassignCount += e.reassigned;
				submissionCount += e.submitted;
				worksheet
					.cell(row, col + 2)
					.string(`${e.totalAssignedTo}`)
					.style(style);
				worksheet
					.cell(row, col + 3)
					.string(`${e.submitted}`)
					.style(style);
				worksheet
					.cell(row, col + 4)
					.string(`${e.evaluated}`)
					.style(style);
				worksheet
					.cell(row, col + 5)
					.string(
						`${
							e.isAbleTo
								? parseFloat((e.isAbleTo / e.evaluated) * 100).toFixed(2)
								: 0
						}%`
					)
					.style(style);
				break;
			}
		}
		row += 1;
		col = 1;
	}
	// workbook.write('TeacherMonthly.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.studentDailyReport = catchAsync(async (req, res, next) => {
	try {
		const { studentId, date } = req.query;
		if (!studentId || !date) {
			return next(new ErrorResponse('Please provide studentId and date', 400));
		}
		const { startDate, endDate } = getDailyDates(date);
		const { studentReport } = await getStudentReport(
			studentId,
			startDate,
			endDate
		);

		res.status(200).json({
			status: 'success',
			data: studentReport,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.studentWeeklyReport = catchAsync(async (req, res, next) => {
	try {
		const { studentId, date } = req.query;
		if (!studentId || !date) {
			return next(new ErrorResponse('Please provide studentId and date', 400));
		}
		let { currentWeekStartDate, currentWeekEndDate } =
			getCurrentWeekDatesDay(date);
		currentWeekStartDate = new Date(currentWeekStartDate);
		currentWeekStartDate.setHours(0, 0, 0, 0);
		currentWeekEndDate = new Date(currentWeekEndDate);
		currentWeekEndDate.setHours(23, 59, 59, 999);
		const { studentReport } = await getStudentReport(
			studentId,
			currentWeekStartDate,
			currentWeekEndDate
		);
		res.status(200).json({
			status: 'success',
			data: studentReport,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.studentMonthlyReport = catchAsync(async (req, res, next) => {
	try {
		const { studentId, date } = req.query;
		if (!studentId || !date) {
			return next(new ErrorResponse('Please provide studentId and date', 400));
		}
		const prev = false;
		const { monthStart, monthEnd } = MonthlyDates(date, prev);
		const { studentReport } = await getStudentReport(
			studentId,
			monthStart,
			monthEnd
		);

		res.status(200).json({
			status: 'success',
			data: studentReport,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.studentSubmission = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { studentId, status, ratingCount = 0 } = req.body;
	const { file, text, lateReason } = req.body.attachments[0];
	const updatedAssignment = await Assignment.findOneAndUpdate(
		{ _id: id, 'assignTo.student_id': studentId },
		{
			'assignTo.$.status': status,
			$push: {
				'assignTo.$.attachments': {
					file,
					isStudent: true,
					status,
					text,
					lateReason,
				},
			},
			'assignTo.$.isOffline': false,
		},
		{
			new: true,
			projection: assignmentProjection(studentId),
		}
	)
		.populate(
			'assignTo.student_id assignTo.section_id',
			'name profile_image assignment'
		)
		.populate('teacher_id', '_id name profile_image')
		.populate('school_id class_id group_id', 'name schoolName group_name');

	if (!updatedAssignment) {
		return res.status(404).json(new ErrorResponse(404, 'No assignment found'));
	}

	const { _id } = updatedAssignment.teacher_id;

	await depositCoin(ratingCount, _id, 'TEACHER');

	res.status(200).json({
		message: 'Submitted SuccessFully',
		data: updatedAssignment,
	});
});

exports.sectionMonthlyReport = catchAsync(async (req, res, next) => {
	const { schoolId, month, year, section_id } = req.query;
	if (!schoolId || !month || !year || !section_id) {
		return next(
			new ErrorResponse('Please provide schoolId, month and year', 400)
		);
	}

	const data = await getMonthlyReport(
		schoolId,
		parseInt(month),
		parseInt(year)
	);
	const finalData = {
		totalAssignedTo: 0,
		totalAssignments: 0,
		totalEvaluated: 0,
		isAbleTo: 0,
		isNotAbleTo: 0,
		lateSubmitted: 0,
		notSubmitted: 0,
		reassigned: 0,
		Submitted: 0,
		doubtsTotalCount: 0,
		doubtsClearedCount: 0,
		submittedAVG: 0,
		lateSubmittedAVG: 0,
		notSubmittedAVG: 0,
		evaluatedAVG: 0,
		outcome: 0,
		isNotAbleToAVG: 0,
	};

	if (data) {
		data.sections.forEach(e => {
			if (e.section_id == section_id) {
				finalData.totalAssignments += e.totalAssignment;
				finalData.totalAssignedTo += e.totalAssigned;
				finalData.totalEvaluated += e.evaluated;
				finalData.isAbleTo += e.isAbleTo;
				finalData.isNotAbleTo += e.isNotAbleTo;
				finalData.lateSubmitted += e.lateSubmitted;
				finalData.notSubmitted += e.notSubmitted;
				finalData.reassigned += e.reassigned;
				finalData.Submitted += e.submitted;
				finalData.doubtsTotalCount += e.totalDoubts;
				finalData.doubtsClearedCount += e.totalClearedDoubts;
			}
		});
		finalData.submittedAVG =
			finalData.Submitted === 0
				? 0
				: (finalData.Submitted / finalData.totalAssignedTo) * 100;
		finalData.lateSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.lateSubmitted / finalData.totalAssignedTo) * 100;
		finalData.notSubmittedAVG =
			finalData.lateSubmitted === 0
				? 0
				: (finalData.notSubmitted / finalData.totalAssignedTo) * 100;
		finalData.outcome =
			finalData.isAbleTo === 0
				? 0
				: (finalData.isAbleTo / finalData.totalEvaluated) * 100;
		finalData.isNotAbleToAVG =
			finalData.isNotAbleTo === 0
				? 0
				: (finalData.isNotAbleTo / finalData.totalEvaluated) * 100;
		finalData.evaluatedAVG =
			finalData.totalEvaluated === 0
				? 0
				: (finalData.totalEvaluated /
						(finalData.Submitted + finalData.lateSubmitted)) *
				  100;
		finalData.doubts =
			finalData.doubtsTotalCount === 0
				? 0
				: (finalData.doubtsClearedCount / finalData.doubtsTotalCount) * 100;

		res.status(200).json({
			status: 'success',
			data: finalData,
		});
	} else {
		res.status(200).json({
			status: 'success',
			message: 'no data found',
			data: finalData,
		});
	}
});

exports.schoolDailyReport = catchAsync(async (req, res, next) => {
	try {
		const { schoolId, date } = req.query;
		const startDate = new Date(date);
		const endDate = new Date(startDate);
		if (!schoolId || !date) {
			return next(
				new ErrorResponse('Please provide schoolId, startDate & endDate', 400)
			);
		}
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);
		const reportData = await getData(schoolId, startDate, endDate, 'school');
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No assignments found'));
		}
		res
			.status(200)
			.json(SuccessResponse(reportData, 1, 'Fetched SuccessFully'));
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.schoolDailyReportExcel = catchAsync(async (req, res, next) => {
	const { schoolId, date } = req.query;
	const schoolData = await School.findById(schoolId).select('schoolName');
	if (!schoolId || !date) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateM = new Date(date);
	const startDate = new Date(date);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(date);
	endDate.setHours(23, 59, 59, 999);

	const reports = await Assignment.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				isGroup: false,
				startDate: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		},
		{
			$addFields: {
				'assignTo.startDate': '$startDate',
				'assignTo.school_id': '$school_id',
				'assignTo.class_id': '$class_id',
				'assignTo.report': '$report',
			},
		},
		{
			$unwind: '$assignTo',
		},
		{
			$lookup: {
				from: 'students',
				let: {
					student_id: '$assignTo.student_id',
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
				as: 'assignTo.student_id',
			},
		},
		{
			$unwind: {
				path: '$assignTo.student_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$sort: { 'assignTo.student_id.name': 1 },
		},
		{
			$group: {
				_id: {
					school_id: '$school_id',
					class_id: '$class_id',
					section_id: '$assignTo.section_id',
				},
				data: {
					$push: '$assignTo',
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
		.cell(4, 3, 4, 5, true)
		.string(` ${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()} `)
		.style({ alignment: { horizontal: 'center' } });

	// row 5
	worksheet.cell(5, 2).string('Total Assigned').style(style);
	worksheet.cell(5, 3).string('Submission').style(style);
	worksheet.cell(5, 4).string('Evaluated').style(style);
	worksheet.cell(5, 5).string('Outcomes').style(style);

	// row 6
	// for loop c1 class name c2 t_p_avg% c3 p% c4 p_count
	let row = 6;
	let col = 1;

	reports.forEach(ele => {
		worksheet
			.cell(row, col)
			.string(`${ele._id.class_id.name} ${ele._id.section_id.name}`)
			.style(style);
		worksheet
			.cell(row, col + 1)
			.string(`${ele.data[0].report.totalAssignedTo}`)
			.style(style);
		worksheet
			.cell(row, col + 2)
			.string(
				`${parseFloat(
					(((ele.data[0].report.submitted /
						ele.data[0].report.totalAssignedTo) *
						100) /
						ele.data[0].report.totalAssignedTo) *
						100
				).toFixed(2)} %`
			)
			.style(style);
		worksheet
			.cell(row, col + 3)
			.string(
				`${parseFloat(
					(((ele.data[0].report.evaluated /
						ele.data[0].report.totalAssignedTo) *
						100) /
						ele.data[0].report.totalAssignedTo) *
						100
				).toFixed(2)} %`
			)
			.style(style);
		worksheet
			.cell(row, col + 4)
			.string(
				`${parseFloat(
					(((ele.data[0].report.isAbleTo /
						(ele.data[0].report.lateSubmitted +
							ele.data[0].report.evaluated +
							ele.data[0].report.reassigned)) *
						100) /
						ele.data[0].report.totalAssignedTo) *
						100
				).toFixed(2)} %`
			)
			.style(style);
	});
	for (const ele of reports) {
		// reports.forEach(async ele => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele._id.class_id.name} ${ele._id.section_id.name}`
		);
		// inner loop of worksheet
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1
			.cell(1, 2)
			.string(
				`${dateM.getDate()}- ${dateM.getMonth()}- ${dateM.getFullYear()}`
			);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		worksheet1
			.cell(1, 4)
			.string(`${ele.data[0].report.totalAssignedTo}`)
			.style(style);
		// row 2
		worksheet1.cell(2, 1).string('Class Name ').style(style);
		worksheet1.cell(2, 2).string(`${ele._id.class_id.name}`);
		worksheet1.cell(2, 3).string('Submission');
		worksheet1
			.cell(2, 4)
			.string(
				`${parseFloat(
					(((ele.data[0].report.submitted /
						ele.data[0].report.totalAssignedTo) *
						100) /
						ele.data[0].report.totalAssignedTo) *
						100
				).toFixed(2)} %`
			);
		// row 3
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1
			.cell(3, 4)
			.string(
				`${parseFloat(
					(((ele.data[0].report.evaluated /
						ele.data[0].report.totalAssignedTo) *
						100) /
						ele.data[0].report.totalAssignedTo) *
						100
				).toFixed(2)} %`
			)
			.style(style);
		// row 4
		worksheet1.cell(4, 3).string('Outcomes').style(style);

		worksheet1.cell(5, 1).string('Student Name').style(style);
		worksheet1.cell(5, 2).string('Total Assignment').style(style);
		worksheet1.cell(5, 3).string('Submission').style(style);
		worksheet1.cell(5, 4).string('Evaluated').style(style);
		worksheet1.cell(5, 5).string('Outcomes').style(style);

		row = 6;
		col = 1;
		let ableTo_count = 0;
		for (const ele1 of ele.data) {
			if (ele1.isAbleTo == true) {
				ableTo_count += 1;
			}
			// ele.data.forEach(async ele1 => {
			const totalAssign = await Assignment.find({
				'assignTo.student_id': ele1.student_id._id,
				startDate: {
					$gte: startDate,
					$lte: endDate,
				},
			}).count();
			worksheet1
				.cell(row, col)
				// .string(`${ele1.student_id.name}`);
				.string(`${ele1.student_id.name ? ele1.student_id.name : ''}`);
			worksheet1
				.cell(row, col + 1)
				.string(`${ele1.status == 'SUBMITTED' ? 1 : 0}/${totalAssign}`);
			worksheet1
				.cell(row, col + 2)
				.string(
					`${
						ele1.status == 'SUBMITTED'
							? parseFloat(
									(ele1.status == 'SUBMITTED' ? 1 : 0 / totalAssign) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			worksheet1
				.cell(row, col + 3)
				.string(
					`${
						ele1.status == 'EVALUATED'
							? parseFloat(
									(ele1.status == 'EVALUATED' ? 1 : 0 / totalAssign) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			worksheet1
				.cell(row, col + 4)
				.string(
					`${
						ele1.isAbleTo == true
							? parseFloat(
									(ele1.isAbleTo == true
										? 1
										: 0 /
										  (ele1.status == 'LATE_SUBMITTED'
												? 1
												: 0 + ele1.status == 'EVALUATED'
												? 1
												: 0 + ele1.status == 'REASSIGNED'
												? 1
												: 0)) * 100
							  ).toFixed(2)
							: 0
					} %`
				);
			row += 1;
			col = 1;
		}
		worksheet1
			.cell(4, 4)
			.string(`${ableTo_count}/${ele.data[0].report.totalAssignedTo}`)
			.style(style);
		// );
	}
	// );

	workbook.write('SchoolDaily.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.schoolMonthlyReportExcel = catchAsync(async (req, res, next) => {
	const { schoolId, startDate } = req.query;
	if (!schoolId || !startDate) {
		return next(new ErrorResponse('Please provide schoolId & date', 400));
	}
	const dateM = new Date(startDate);
	const allDate = getDaysInMonth(dateM.getMonth(), dateM.getFullYear());
	const dateStart = new Date(allDate[0]);
	const dateEnd = new Date(allDate[allDate.length - 1]);

	let data = await getMonthlyReport(
		schoolId,
		parseInt(dateStart.getMonth() + 1),
		parseInt(dateStart.getFullYear())
	);
	const finalData = {
		totalAssigned: 0,
		totalAssignment: 0,
		evaluated: 0,
		isAbleTo: 0,
		isNotAbleTo: 0,
		lateSubmitted: 0,
		notSubmitted: 0,
		reassigned: 0,
		submitted: 0,
		doubtsTotalCount: 0,
		doubtsClearedCount: 0,
		submittedAVG: 0,
		lateSubmittedAVG: 0,
		notSubmittedAVG: 0,
		isAbleToAVG: 0,
		isNotAbleToAVG: 0,
		evaluatedAVG: 0,
	};

	if (data) {
		data.sections.forEach(e => {
			finalData.totalAssignment += e.totalAssignment;
			finalData.totalAssigned += e.totalAssigned;
			finalData.evaluated += e.evaluated;
			finalData.isAbleTo += e.isAbleTo;
			finalData.isNotAbleTo += e.isNotAbleTo;
			finalData.lateSubmitted += e.lateSubmitted;
			finalData.notSubmitted += e.notSubmitted;
			finalData.reassigned += e.reassigned;
			finalData.submitted += e.submitted;
			finalData.doubtsTotalCount += e.totalDoubts;
			finalData.doubtsClearedCount += e.totalClearedDoubts;
		});
		finalData.submittedAVG =
			(finalData.submitted / finalData.totalAssigned) * 100;
		finalData.lateSubmittedAVG =
			(finalData.lateSubmitted / finalData.totalAssigned) * 100;
		finalData.notSubmittedAVG =
			(finalData.notSubmitted / finalData.totalAssigned) * 100;
		finalData.isAbleToAVG =
			(finalData.isAbleTo / finalData.totalAssigned) * 100;
		finalData.isNotAbleToAVG =
			(finalData.isNotAbleTo / finalData.totalAssigned) * 100;
		finalData.evaluatedAVG =
			(finalData.evaluated / finalData.totalAssigned) * 100;
		finalData.doubtAVG =
			(finalData.doubtsClearedCount / finalData.doubtsTotalCount) * 100;
	}
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
	// row 3
	worksheet.cell(3, 1).string('School Name :').style(style);
	worksheet.cell(3, 2).string(`${data.schoolId.schoolName}`);

	// row 4
	worksheet.cell(4, 1).string('Date:').style(style);
	worksheet.cell(5, 2).string('Total Submission').style(style);
	worksheet.cell(5, 3).string('Total Evaluated').style(style);
	worksheet.cell(5, 4).string('Total Outcomes').style(style);
	worksheet.cell(5, 5).string('Total Assigned').style(style);
	let col1 = 6;
	const date = new Date(dateStart);
	do {
		worksheet
			.cell(4, col1, 4, col1 + 2, true)
			.string(
				`${date.toLocaleDateString('default', {
					weekday: 'long',
				})},${date.toLocaleString('default', {
					month: 'long',
				})} ${date.getDate()}, ${date.getFullYear()} `
			)
			.style({ alignment: { horizontal: 'center' } });
		worksheet.cell(5, col1).string('Submission').style(style);
		worksheet
			.cell(5, col1 + 1)
			.string('Evaluated')
			.style(style);
		worksheet
			.cell(5, col1 + 2)
			.string('Outcomes')
			.style(style);
		col1 += 3;
		date.setDate(date.getDate() + 1);
	} while (date <= dateEnd);

	const row = 6;
	const col = 1;

	data.sections.forEach(ele2 => {
		const worksheet1 = workbook.addWorksheet(
			`Class ${ele2.class_id.name} ${ele2.section_id.name}`
		);
		worksheet1.cell(1, 1).string('Date:').style(style);
		worksheet1
			.cell(1, 2)
			.string(
				`${dateStart.getDate()}-${
					dateStart.getMonth() + 1
				}-${dateStart.getFullYear()}`
			);
		worksheet1.cell(1, 3).string('Total Assignment').style(style);
		worksheet1.cell(1, 4).string('').style(style);

		// row 2
		worksheet1.cell(2, 1).string('Class Name :').style(style);
		worksheet1.cell(2, 2).string(`${ele2.class_id.name}`);
		worksheet1.cell(2, 3).string(`Submission`).style(style);
		worksheet1.cell(2, 4).string(``);
		// row 3
		worksheet1.cell(3, 3).string('Evaluated').style(style);
		worksheet1.cell(3, 4).string('').style(style);
		worksheet1.cell(4, 3).string('Outcomes').style(style);
		worksheet1.cell(4, 4).string('').style(style);
		let col1 = 3;
		const date = new Date(startDate);
		do {
			worksheet1
				.cell(5, col1, 5, col1 + 2, true)
				.string(
					`${date.getDate()} ${date.toLocaleString('default', {
						month: 'long',
					})} ${date.getFullYear()} `
				)
				.style({ alignment: { horizontal: 'center' } });
			worksheet1.cell(6, col1).string('Submission').style(style);
			worksheet1
				.cell(6, col1 + 1)
				.string('Evaluated')
				.style(style);
			worksheet1
				.cell(6, col1 + 2)
				.string('Outcomes')
				.style(style);
			col1 += 3;
			date.setDate(date.getDate() + 1);
		} while (date <= dateEnd);

		worksheet1.cell(6, 1).string('Student Name').style(style);
		worksheet1.cell(6, 2).string('Total Assignment').style(style);
	});
	// workbook.write('SchoolMonthly.xlsx');
	data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(successResponse(data, data.length));
});

exports.teacherWeeklyReport = catchAsync(async (req, res, next) => {
	try {
		let { teacherId, startDate, endDate } = req.query;

		if (!teacherId || !startDate || !endDate) {
			return next(
				new ErrorResponse('Please provide teacherId, startDate & endDate', 400)
			);
		}
		startDate = new Date(startDate);
		startDate.setHours(0, 0, 0, 0);
		endDate = new Date(endDate);
		endDate.setHours(23, 59, 59, 999);
		const { reportData } = await getData(
			teacherId,
			startDate,
			endDate,
			'teacher'
		);
		if (!reportData && reportData.length) {
			return res
				.status(204)
				.json(new ErrorResponse(204, 'No Assignments Found'));
		}
		res.status(200).json({
			status: 'Success',
			data: reportData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
});

exports.CreateDoubt = catchAsync(async (req, res, next) => {
	const { assignmentId } = req.params;

	const {
		message,
		studentId = null,
		teacherId = null,
		isReply,
		replyMessageId,
	} = req.body;

	if (!message || !assignmentId) {
		return next(new ErrorResponse('Message & assignment is required', 400));
	}

	if (!studentId && !teacherId) {
		return next(new ErrorResponse('Teacher or student required', 400));
	}

	if (isReply && !replyMessageId) {
		return next(new ErrorResponse('message id is required for replying', 400));
	}

	const foundAssignment = await Assignment.findOne(
		{ _id: assignmentId },
		{ commentsId: 1 }
	);

	if (!foundAssignment) {
		return next(new ErrorResponse('Assignment not found', 404));
	}

	const commentObj = {
		_id: mongoose.Types.ObjectId(),
		message,
		studentId,
		teacherId,
	};

	let foundComment = await CommentModel.findOne(
		{
			$or: [{ _id: foundAssignment.commentsId }, { assignmentId }],
		},
		{ _id: 1, teacher_id: 1, comments: 1 }
	);

	if (!foundComment) {
		foundComment = await CommentModel.create({ assignmentId });

		if (isReply) {
			return next(new ErrorResponse('Comment not found for replying', 404));
		}
	}

	let recieverId = foundComment.teacher_id;

	if (isReply) {
		const messageToReply = foundComment.comments.id(replyMessageId);

		if (!messageToReply) {
			return next(new ErrorResponse('comment not found for replying', 404));
		}

		recieverId = messageToReply.studentId;

		messageToReply.replies.push(commentObj);
	} else {
		foundComment.comments.push(commentObj);
	}

	await foundComment.save();

	req.io.on('connection', async socket => {
		const roomName = `assignment_doubt_${assignmentId}:${recieverId}`;
		socket.join(roomName);

		req.io.to(roomName).emit('assignment_doubt_created', {
			...commentObj,
			isReply,
			replyMessageId,
		});

		socket.leave(roomName);
	});

	if (!foundAssignment.commentsId) {
		foundAssignment.commentsId = foundComment._id;
		foundAssignment.save();
	}

	res
		.status(201)
		.json(successResponse(foundAssignment, 1, 'Created successfully'));
});

exports.DeleteDoubt = catchAsync(async (req, res, next) => {
	const { assignmentId } = req.params;

	const { isReply, messageId, replyId } = req.body;

	if (!assignmentId || !messageId) {
		return next(new ErrorResponse('Message & assignment is required', 400));
	}

	const foundAssignment = await Assignment.findOne(
		{ _id: assignmentId },
		{ commentsId: 1 }
	).lean();

	if (!foundAssignment) {
		return next(new ErrorResponse('Assignment not found', 404));
	}

	const foundComment = await CommentModel.findOne(
		{
			$or: [{ _id: foundAssignment.commentsId }, { assignmentId }],
		},
		{ _id: 1, comments: 1 }
	);

	if (!foundComment) {
		return next(new ErrorResponse('Comments not found', 404));
	}

	if (isReply) {
		const foundMessage = foundComment.comments.id(messageId);

		foundMessage.replies.id(replyId).remove();
	} else {
		const foundMessage = foundComment.comments.id(messageId);

		foundMessage.remove();
	}

	await foundComment.save();

	req.io.on('connection', async socket => {
		socket.join(`assignment_comment_${assignmentId}`);
	});

	req.io
		.to(`assignment_comment_${assignmentId}`)
		.emit('assignment_comment_deleted', {
			messageId,
			isReply,
			replyId,
		});

	res
		.status(200)
		.json(successResponse(foundAssignment, 1, 'Deleted successfully'));
});
