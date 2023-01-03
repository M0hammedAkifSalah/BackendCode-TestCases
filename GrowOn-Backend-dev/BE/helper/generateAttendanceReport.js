/* eslint-disable no-param-reassign */
const AttendanceReportModel = require('../model/attendanceReport');

module.exports = attendance =>
	new Promise((resolve, reject) => {
		if (!attendance) {
			reject(new Error('Attendace is required'));
		}

		// const presentCount = attendance.attendanceDetails.filter(
		// 	({ status }) => status === 'Present'
		// ).length;
		// const absentCount = attendance.attendanceDetails.filter(
		// 	({ status }) => status === 'Absent'
		// ).length;
		// const lateCount = attendance.attendanceDetails.filter(
		// 	({ status }) => status === 'Late'
		// ).length;
		// const partialCount = attendance.attendanceDetails.filter(
		// 	({ status }) => status === 'Partial_Absent'
		// ).length;

		let presentCount = 0;
		let absentCount = 0;
		let lateCount = 0;
		let partialCount = 0;

		attendance.attendanceDetails.forEach(({ status }) => {
			switch (status) {
				case 'Present':
					presentCount += 1;
					break;
				case 'Absent':
					absentCount += 1;
					break;
				case 'Late':
					lateCount += 1;
					break;
				case 'Partial_Absent':
					partialCount += 1;
					break;
				default:
					break;
			}
		});

		const attDate = attendance.createdAt || attendance.date;

		const startDate = new Date(attDate);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(attDate);
		endDate.setHours(23, 59, 59, 999);

		const date = endDate.getUTCDate();
		const month = endDate.getUTCMonth() + 1;
		const year = endDate.getUTCFullYear();

		const dayReport = {
			date,
			present: presentCount,
			absent: absentCount,
			late: lateCount,
			partial: partialCount,
		};

		const findObj = {
			schoolId: attendance.school_id,
			classId: attendance.class_id,
			sectionId: attendance.section_id,
			month,
			year,
		};

		AttendanceReportModel.findOne(findObj)
			.then(async foundReport => {
				try {
					if (!foundReport) {
						foundReport = await AttendanceReportModel.create(findObj);
					}

					const frIdx = foundReport.dailyReports.findIndex(
						fr => Number(fr.date) == Number(dayReport.date)
					);

					if (frIdx < 0) {
						foundReport.dailyReports.push(dayReport);
					} else {
						foundReport.dailyReports[frIdx] = dayReport;
					}

					resolve(await foundReport.save());
				} catch (error) {
					reject(error);
				}
			})
			.catch(err => reject(err));
	});
