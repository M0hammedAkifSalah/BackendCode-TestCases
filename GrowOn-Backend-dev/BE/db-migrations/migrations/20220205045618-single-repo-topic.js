const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const topics = await db.collection('topics').find({}).toArray();

		const operations = topics.map(topi => {
			const boardId =
				topi.board_id && topi.board_id.length > 2
					? ToObjectId(topi.board_id)
					: null;

			return db.collection('topics').updateOne(
				{ _id: topi._id },
				{
					$set: {
						boardId,
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
