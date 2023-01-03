const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const chapters = await db.collection('chapters').find({}).toArray();

		const operations = chapters.map(chapter => {
			let repository = [];

			if (Array.isArray(chapter.repository) && chapter.repository.length > 0) {
				repository = chapter.repository.map(repObj => {
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

			return db.collection('chapters').updateOne(
				{ _id: chapter._id },
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
