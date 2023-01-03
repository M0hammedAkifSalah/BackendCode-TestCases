/* eslint-disable no-case-declarations */
/* eslint-disable no-param-reassign */

const ExcelReportModel = require('../model/assignmentExcel');

module.exports = (assignment, startDate) =>
	new Promise((resolve, reject) => {
		if (!assignment) {
			reject(new Error('Assignment is required'));
		}

		// Initialistions
		const {
			studentId,
			sectionId,
			schoolId,
			classId,
			totalAssignments,
			assignmentReport,
			coins,
		} = assignment;
		const tempArray = [];
		const assignmentCount = 1;

		// Loop through all assignmentReport object and push the status counts into tempArray
		assignmentReport.forEach(el => {
			let evaluated = 0;
			let isAbleTo = 0;
			let submitted = 0;
			let notSubmitted = 0;
			let lateSubmitted = 0;
			let reassigned = 0;
			let { status, isAbleTo: ableTo, attachments = [], date } = el;

			date = date.getDate();
			switch (status) {
				case 'LATE_SUBMITTED':
					lateSubmitted += 1;
					break;
				case 'NOT_SUBMITTED':
					notSubmitted += 1;
					break;
				case 'SUBMITTED':
					submitted += 1;
					break;
				case 'REASSIGNED':
					reassigned += 1;
					break;
				case 'EVALUATED':
					evaluated += 1;
					const Index = attachments.length - 1;
					const { submissionStatus } = attachments[Index];
					if (submissionStatus) {
						switch (submissionStatus) {
							case 'LATE_SUBMITTED':
								lateSubmitted += 1;
								break;
							case 'NOT_SUBMITTED':
								notSubmitted += 1;
								break;
							case 'SUBMITTED':
								submitted += 1;
								break;
							default:
								break;
						}
					}
					if (ableTo == true) {
						isAbleTo += 1;
					}
					break;
				default:
					break;
			}
			const foundObj = tempArray.find(e => e.date === date);
			if (foundObj) {
				foundObj.assignmentCount += 1;
				foundObj.submitted += submitted;
				foundObj.notSubmitted += notSubmitted;
				foundObj.evaluated += evaluated;
				foundObj.lateSubmitted += lateSubmitted;
				foundObj.reassigned += reassigned;
				foundObj.isAbleTo += isAbleTo;
				foundObj.outcomes =
					foundObj.evaluated == 0
						? 0
						: (foundObj.isAbleTo / foundObj.evaluated) * 100;
			} else {
				tempArray.push({
					assignmentCount,
					date,
					submitted,
					evaluated,
					notSubmitted,
					lateSubmitted,
					reassigned,
					isAbleTo,
					outcomes: evaluated == 0 ? 0 : (isAbleTo / evaluated) * 100,
				});
			}
		});

		// get month and year for payload
		startDate = new Date(startDate);
		const month = startDate.getUTCMonth() + 1;
		const year = startDate.getUTCFullYear();

		// query payload
		const findObj = {
			studentId,
			month,
			year,
		};
		// find and update the monthly document for each section at month end
		ExcelReportModel.findOne(findObj)
			.then(async foundReport => {
				try {
					if (!foundReport) {
						foundReport = await ExcelReportModel.create(findObj);
						foundReport.classId = classId;
						foundReport.sectionId = sectionId;
						foundReport.schoolId = schoolId;
					}
					foundReport.coins = coins;
					foundReport.totalAssignments = totalAssignments;
					foundReport.AssignmentReport = tempArray;

					resolve(await foundReport.save());
				} catch (error) {
					reject(error);
				}
			})
			.catch(err => reject(err));
	});
