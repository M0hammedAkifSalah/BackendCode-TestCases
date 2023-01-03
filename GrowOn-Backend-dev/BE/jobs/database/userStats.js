const cron = require('node-cron');
const { appsignal } = require('../../appsignal');

const tracer = appsignal.tracer();

const AttendanceModel = require('../../model/attendance');
const StudentModel = require('../../model/student');

// run everyday at 10:30pm
cron.schedule('30 22 * * *', async () => {
	try {
		const attendanceDetails = await AttendanceModel.aggregate([
			{
				$match: {},
			},
			{
				$unwind: {
					path: '$attendanceDetails',
				},
			},
			{
				$group: {
					_id: '$attendanceDetails.student_id',
					present: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$attendanceDetails.status', 'Present'],
								},
								then: 1,
								else: 0,
							},
						},
					},
					absent: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$attendanceDetails.status', 'Absent'],
								},
								then: 1,
								else: 0,
							},
						},
					},
					late: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$attendanceDetails.status', 'Late'],
								},
								then: 1,
								else: 0,
							},
						},
					},
					partial: {
						$sum: {
							$cond: {
								if: {
									$eq: ['$attendanceDetails.status', 'Partial_Absent'],
								},
								then: 1,
								else: 0,
							},
						},
					},
				},
			},
		]);

		const usersPromises = attendanceDetails.map(async atDetail =>
			StudentModel.updateOne(
				{ _id: atDetail._id },
				{
					'stats.attendance': {
						...atDetail,
					},
				}
			)
		);

		const reportsResponses = await Promise.allSettled(usersPromises);

		const rejected = reportsResponses.filter(
			report => report.status === 'rejected'
		);

		if (rejected.length) {
			throw new Error(rejected);
		}
	} catch (e) {
		tracer.setError(e);
	}
});
