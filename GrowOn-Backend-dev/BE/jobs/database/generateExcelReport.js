const cron = require('node-cron');

const generateStudentReport = require('../../helper/generateExcelReport.js');

const Assignment = require('../../model/assignment');

cron.schedule('0 0 1 * *', async () => {
	try {
		// check for the last day of the month
		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		// set month date
		const startDate = new Date(today.setDate(1));
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(
			startDate.getFullYear(),
			startDate.getMonth() + 1,
			startDate.getDate()
		);
		endDate.setHours(0, 0, 0, 0);

		// check whether the prev and current month are different
		if (today.getMonth() !== tomorrow.getMonth()) {
			// run your cron job
			const assignments = await Assignment.aggregate([
				{
					$match: {
						isGroup: false,
						EndDate: {
							$gte: startDate,
							$lt: endDate,
						},
					},
				},
				{
					$project: {
						startDate: 1,
						school_id: 1,
						class_id: 1,
						assignTo: 1,
					},
				},
				{
					$unwind: {
						path: '$assignTo',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$sort: {
						startDate: 1,
					},
				},
				{
					$addFields: {
						'assignTo.date': '$startDate',
					},
				},
				{
					$group: {
						_id: {
							studentId: '$assignTo.student_id',
							sectionId: '$assignTo.section_id',
							class_id: '$class_id',
							school_id: '$school_id',
						},
						totalAssignments: {
							$addToSet: '$_id',
						},
						assignmentReport: {
							$push: {
								status: '$assignTo.status',
								date: '$assignTo.date',
								isAbleTo: '$assignTo.isAbleTo',
								attachments: '$assignTo.attachments',
							},
						},
					},
				},
				{
					$lookup: {
						from: 'students',
						let: {
							studId: '$_id.studentId',
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
									coin: 1,
								},
							},
						],
						as: 'coins',
					},
				},
				{
					$project: {
						_id: 0,
						studentId: '$_id.studentId',
						sectionId: '$_id.sectionId',
						classId: '$_id.class_id',
						schoolId: '$_id.school_id',
						coins: {
							$first: '$coins.coin',
						},
						totalAssignments: {
							$size: '$totalAssignments',
						},
						assignmentReport: '$assignmentReport',
					},
				},
			]);
			// push and save each student into the monthly school report document
			const reportsResponses = await Promise.allSettled(
				assignments.map(el => generateStudentReport(el, startDate, endDate))
			);

			const rejected = reportsResponses
				.filter(report => report.status === 'rejected')
				.map(report => report.reason);

			if (rejected.length) {
				throw new Error(rejected);
			}
		}
	} catch (e) {
		console.error(e);
	}
});
