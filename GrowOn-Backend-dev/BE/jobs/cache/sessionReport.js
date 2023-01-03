const cron = require('node-cron');
const mongoose = require('mongoose');
const redisClient = require('../../config/redisClient');
const { appsignal } = require('../../appsignal');

const tracer = appsignal.tracer();

const schoolModel = require('../../model/school');
const InstituteModel = require('../../model/institute');

// run everyday at 12pm (midnight)
cron.schedule('0 12 * * *', async () => {
	try {
		const institutes = await InstituteModel.find({}).select('_id');

		const reportPromises = institutes.map(async ({ _id: instituteId }) => {
			const aggregateQuery = schoolModel.aggregate([
				{
					$match: {
						institute: mongoose.Types.ObjectId(instituteId),
					},
				},
				{
					$project: {
						_id: 1,
						schoolName: 1,
						schoolImage: 1,
						city: 1,
						state: 1,
					},
				},
				// populate sessions related to school
				// get count of attended students & teachers
				{
					$lookup: {
						from: 'sessions',
						let: { school_id: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{
												$in: ['$$school_id', '$schools'],
											},
											{
												$lte: ['$session_start_Date', new Date()],
											},
										],
									},
								},
							},
							{
								$group: {
									_id: null,
									totalSessions: {
										$sum: 1,
									},
									attendedStudents: {
										$sum: {
											$cond: [
												{ $isArray: '$student_join_session' },
												{ $size: '$student_join_session' },
												0,
											],
										},
									},
									attendedTeachers: {
										$sum: {
											$cond: [
												{ $isArray: '$teacher_join_session' },
												{ $size: '$teacher_join_session' },
												0,
											],
										},
									},
								},
							},
							{
								$project: {
									_id: 0,
									totalSessions: 1,
									attendedUsers: {
										$sum: ['$attendedStudents', '$attendedTeachers'],
									},
								},
							},
						],
						as: 'sessions',
					},
				},
				// get count of total students in school
				{
					$lookup: {
						from: 'students',
						let: { school_id: '$_id' },
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
				// get count of total teachers in school
				{
					$lookup: {
						from: 'users',
						let: { school_id: '$_id' },
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
				// populate state
				{
					$lookup: {
						from: 'states',
						let: { state_id: '$state' },
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
				// populate city
				{
					$lookup: {
						from: 'cities',
						let: { city_id: '$city' },
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
						schoolId: '$_id',
						schoolName: 1,
						schoolImage: 1,
						city: { $arrayElemAt: ['$city', 0] },
						state: { $arrayElemAt: ['$state', 0] },
						totalSessions: {
							$ifNull: [{ $first: '$sessions.totalSessions' }, 0],
						},
						attendedUsers: {
							$ifNull: [{ $first: '$sessions.attendedUsers' }, 0],
						},
						totalUsers: {
							$ifNull: [
								{
									$sum: [
										{ $first: '$totalStudents.totalStudents' },
										{ $first: '$totalTeachers.totalTeachers' },
									],
								},
								0,
							],
						},
					},
				},
			]);

			return new Promise((res, rej) => {
				aggregateQuery
					.then(result => {
						res({ result, instituteId });
					})
					.catch(err => {
						err.instituteId = instituteId;
						rej(err);
					});
			});
		});

		const reports = await Promise.allSettled(reportPromises);

		const fulfilled = reports.filter(report => report.status === 'fulfilled');
		const rejected = reports
			.filter(report => report.status === 'rejected')
			.map(report => report.reason);

		const cachePromises = fulfilled.map(({ value }) => {
			const cacheKey = `sessionreport:institute:${value.instituteId}`;

			return redisClient.set(cacheKey, JSON.stringify(value.result), {
				EX: 60 * 60 * 24,
			});
		});

		await Promise.allSettled(cachePromises);

		if (rejected.length) {
			throw new Error(rejected);
		}
	} catch (e) {
		tracer.setError(e);
	}
});
