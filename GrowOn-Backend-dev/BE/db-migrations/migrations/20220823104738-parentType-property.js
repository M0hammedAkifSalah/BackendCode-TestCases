module.exports = {
	async up(db) {
		const parents = await db
			.collection('parents')
			.find({ guardian: { $exists: true } })
			.toArray();

		const operations = parents.map(parent => {
			const { guardian } = parent;
			switch (guardian) {
				case 'father': {
					return db.collection('parents').updateOne(
						{ _id: parent._id },
						{
							$set: {
								parentType: 'FATHER',
							},
						}
					);
				}
				case 'mother': {
					return db.collection('parents').updateOne(
						{ _id: parent._id },
						{
							$set: {
								parentType: 'MOTHER',
							},
						}
					);
				}
				case 'guardian': {
					return db.collection('parents').updateOne(
						{ _id: parent._id },
						{
							$set: {
								parentType: 'GUARDIAN',
							},
						}
					);
				}
				default: {
					return db.collection('parents').updateOne(
						{ _id: parent._id },
						{
							$set: {
								parentType: 'OTHER',
							},
						}
					);
				}
			}
		});
		return Promise.all(operations);
	},

	async down(db) {
		const parents = await db
			.collection('parents')
			.find({ guardian: 'mother' })
			.toArray();
		const operations = parents.map(parent =>
			db.collection('parents').updateOne(
				{ _id: parent._id },
				{
					$unset: {
						parentType: '',
					},
				}
			)
		);
		return Promise.all(operations);
	},
};
