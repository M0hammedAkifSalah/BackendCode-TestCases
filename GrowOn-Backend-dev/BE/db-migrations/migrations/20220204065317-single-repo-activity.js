module.exports = {
	async up(db) {
		const activities = await db.collection('activities').find({}).toArray();

		const operations = activities.map(activity =>
			db.collection('activities').updateOne(
				{ _id: activity._id },
				{
					$set: {
						startDate: new Date(activity.startDate),
						StartTime: new Date(activity.StartTime),
						EndDate: new Date(activity.EndDate),
						EndTime: new Date(activity.EndTime),
						dueDate: new Date(activity.dueDate),
						publish_date: new Date(activity.publish_date),
					},
				}
			)
		);

		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
