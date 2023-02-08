const cron = require('node-cron');

const generateAttendanceReport = require('../../helper/generateAttendanceReport');

const AttendanceModel = require('../../model/attendance');

// run everyday at 10pm
cron.schedule('0 22 * * *', async () => {
	try {
		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date();
		endDate.setHours(23, 59, 59, 999);

		const attendances = await AttendanceModel.find({
			createdAt: {
				$gte: startDate,
				$lt: endDate,
			},
		}).lean();

		const reportsResponses = await Promise.allSettled(
			attendances.map(att => generateAttendanceReport(att))
		);

		const rejected = reportsResponses
			.filter(report => report.status === 'rejected')
			.map(report => report.reason);

		if (rejected.length) {
			throw new Error(rejected);
		}
	} catch (e) {
		console.error(e);
	}
});
