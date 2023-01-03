/* eslint-disable no-plusplus */
module.exports = {
	async up(db) {
		const parents = await db.collection('parents').find({}).toArray();
		let i = 0;
		const operations = parents.map(ele => {
			console.log('count', i++);
			const p_type = ele.parentType;
			switch (p_type) {
				case 'FATHER': {
					ele.name = ele.father_name;
					break;
				}
				case 'MOTHER': {
					ele.name = ele.mother_name;
					break;
				}
				default: {
					ele.name = ele.guardian_name;
					break;
				}
			}
			return db.collection('parents').updateOne(
				{ _id: ele._id },
				{
					$set: ele,
				}
			);
		});
		return Promise.all(operations);
	},

	async down(db) {
		const parents = await db.collection('parents').find({}).toArray();

		const operations = parents.map(ele =>
			db.collection('parents').updateOne(
				{ _id: ele._id },
				{
					$unset: {
						name: null,
					},
				}
			)
		);
		return Promise.all(operations);
	},
};
