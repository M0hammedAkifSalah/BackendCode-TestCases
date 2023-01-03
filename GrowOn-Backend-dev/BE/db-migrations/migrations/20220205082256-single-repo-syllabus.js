const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const syllabuses = await db.collection('syllabuses').find({}).toArray();

		const operations = syllabuses.map(sy => {
			const repository = [];

			if (Array.isArray(sy.repository) && sy.repository.length > 0) {
				sy.repository.forEach(
					({
						id = '',
						branch_name = '',
						repository_type = '',
						mapDetails = [],
					}) => {
						const rep = {
							id,
							branch_name,
							repository_type,
							mapDetails: [],
						};

						if (mapDetails.length > 0) {
							mapDetails.forEach(({ classId, boardId }) => {
								const obj = {};
								if (classId && classId.length > 2) {
									obj.classId = ToObjectId(classId);
								}
								if (boardId && boardId.length > 2) {
									obj.boardId = ToObjectId(boardId);
								}
								if (obj.classId || obj.boardId) {
									rep.mapDetails.push(obj);
								}
							});
						}

						repository.push(rep);
					}
				);
			}

			return db.collection('syllabuses').updateOne(
				{ _id: sy._id },
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
