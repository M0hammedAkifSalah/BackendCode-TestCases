const cron = require('node-cron');
const moment = require('moment');

const generateAssignmentReport = require('../../helper/generateAssignmentReport');
const AssignmentReportModel = require('../../model/assignmentReport');
// require

const Assignment = require('../../model/assignment');

cron.schedule('0 0 1 * *', async () => {
	try {
		const yesterday = moment().subtract(1, 'day');
		const today = moment();
		const month = yesterday.month() + 1;
		const year = yesterday.year();
		// check whether the prev and current month are different
		if (yesterday.month() !== today.month()) {
			// run your cron job
			/**
			 * @param {number} month
			 * @param {number} year
			 * @return {array} assignments, grouped by section.
			 */
			const assignments = await Assignment.aggregate([
				{
					$match: {
						isGroup: false,
						$expr: {
							$and: [
								{ $eq: [{ $year: '$EndDate' }, year] },
								{ $eq: [{ $month: '$EndDate' }, month] },
							],
						},
					},
				},
				{
					$project: {
						school_id: 1,
						class_id: 1,
						report: {
							$objectToArray: '$report',
						},
						createdAt: 1,
						startDate: 1,
						doubts_id: 1,
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
							section_id: '$report.k',
							school_id: '$school_id',
							class_id: '$class_id',
						},
						totalAssignments: {
							$addToSet: '$_id',
						},
						doubts: {
							$addToSet: '$doubts_id',
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
					$lookup: {
						from: 'assignmentdoubts',
						let: {
							ids: '$doubts',
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$in: ['$_id', '$$ids'],
									},
								},
							},
							{
								$project: {
									total: 1,
									cleared: 1,
								},
							},
						],
						as: 'doubts',
					},
				},
			]);

			// push and save each section into the monthly school report document
			for (const section of assignments) {
				const { school_id } = section._id;
				/**
				 * @param {ObjectId} section
				 * @return {object} sectionReport, formatted data to be pushed into the sections array.
				 */
				const { sectionReport } = generateAssignmentReport(section);
				// Querying DB for the document existence.
				let found = await AssignmentReportModel.findOne({
					schoolId: school_id,
					month,
					year,
				});
				if (!found) {
					// If not found for that month,year and schoolId create a new document with query properties
					found = await AssignmentReportModel.create({
						schoolId: school_id,
						month,
						year,
						sections: [],
					});
				}
				// pushing the fetched sections object from the function into the sections.
				found.sections.push(sectionReport);
				await found.save();
			}
		}
	} catch (e) {
		console.error(e);
	}
});
