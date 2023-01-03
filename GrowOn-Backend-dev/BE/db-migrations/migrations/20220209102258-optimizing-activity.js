module.exports = {
	async up(db) {
		const activities = await db.collection('activities').find({}).toArray();

		const operations = activities.map(act => {
			const assignTo =
				Array.isArray(act.assignTo) && act.assignTo.length > 0
					? act.assignTo.map(ato => ({
							...ato,
							class_id:
								Array.isArray(ato.class_id) && ato.class_id.length > 0
									? ato.class_id[0]
									: null,
					  }))
					: [];

			return db.collection('activities').updateOne(
				{ _id: act._id },
				{
					$set: {
						assignTo,
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
