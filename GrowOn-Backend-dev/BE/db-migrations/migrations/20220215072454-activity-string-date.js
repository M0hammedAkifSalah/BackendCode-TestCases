module.exports = {
	async up(db) {
		const activities = await db.collection('activities').find({}).toArray();

		// eslint-disable-next-line array-callback-return
		const operations = activities.map(act => {
			const comment = [];
			if (act.comment && Array.isArray(act.comment) && act.comment.length) {
				act.comment.forEach(cm => {
					const obj = { ...cm };
					if (cm.comment_date) {
						obj.comment_date = new Date(cm.comment_date);
					}
					comment.push(obj);
				});
			}

			if (comment.length) {
				return db.collection('activities').updateOne(
					{ _id: act._id },
					{
						$set: {
							comment,
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
