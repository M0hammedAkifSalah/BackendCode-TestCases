const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const subjects = await db.collection('subjects').find({}).toArray();

		const operations = subjects.map(sbj => {
			const repository = [];

			if (Array.isArray(sbj.repository) && sbj.repository.length > 0) {
				sbj.repository.forEach(
					({ id = '', repository_type = '', mapDetails = [] }) => {
						const rep = {
							id: ToObjectId(id),
							repository_type,
							mapDetails: [],
						};

						if (mapDetails.length > 0) {
							mapDetails.forEach(({ syllabuseId, boardId, classId }) => {
								const obj = {};
								if (syllabuseId && syllabuseId.length > 2) {
									obj.syllabuseId = ToObjectId(syllabuseId);
								}
								if (boardId && boardId.length > 2) {
									obj.boardId = ToObjectId(boardId);
								}
								if (classId && classId.length > 2) {
									obj.classId = ToObjectId(classId);
								}

								// push obj to rep.mapdetails
								if (obj.syllabuseId || obj.boardId || obj.classId) {
									rep.mapDetails.push(obj);
								}
							});
						}

						repository.push(rep);
					}
				);
			}

			return db.collection('subjects').updateOne(
				{ _id: sbj._id },
				{
					$set: {
						repository,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down(db, client) {
		return Promise.resolve('ok');
	},
};
