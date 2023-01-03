const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const chapters = await db.collection('chapters').find({}).toArray();

		const operations = chapters.map(chap => {
			const boardId =
				chap.board_id && chap.board_id.length > 2
					? ToObjectId(chap.board_id)
					: null;

			return db.collection('chapters').updateOne(
				{ _id: chap._id },
				{
					$set: {
						board_id: boardId,
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
