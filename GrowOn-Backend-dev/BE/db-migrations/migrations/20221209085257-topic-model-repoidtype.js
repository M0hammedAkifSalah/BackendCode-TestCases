const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const topics = await db.collection('topics').find({}).toArray();

		const operations = topics.map(topic => {
			let repository = [];

			if (Array.isArray(topic.repository) && topic.repository.length > 0) {
				repository = topic.repository.map(repObj => {
					const newObj = { ...repObj };

					if (
						newObj.id &&
						typeof newObj.id === 'string' &&
						newObj.id.length > 2
					) {
						newObj.id = ToObjectId(newObj.id);
					}

					return newObj;
				});
			}

			return db.collection('topics').updateOne(
				{ _id: topic._id },
				{
					$set: {
						repository,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
