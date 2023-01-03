const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const activities = await db.collection('activities').find({}).toArray();

		const operations = activities.map(async act => {
			const data = [];

			if (
				act.acknowledge_by &&
				Array.isArray(act.acknowledge_by) &&
				act.acknowledge_by.length > 0
			) {
				act.acknowledge_by.forEach(
					({ acknowledge_by = [], submitted_date = null }) => {
						const obj = {};

						if (acknowledge_by.length > 0) {
							obj.acknowledge_by = ToObjectId(acknowledge_by[0]);
							obj.submitted_date = new Date(submitted_date);
						}

						if (Object.keys(obj).length !== 0) {
							data.push(obj);
						}
					}
				);
			}

			if (data.length) {
				return db.collection('activities').updateOne(
					{
						_id: act._id,
					},
					{
						$set: {
							acknowledge_by: data,
						},
					}
				);
			}
		});

		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
