const {
	Types: { ObjectId },
} = require('mongoose');

module.exports = {
	async up(db) {
		const users = await db.collection('users').find({}).toArray();
		const foundRole = await db
			.collection('roles')
			.findOne({ role_name: 'teacher' });

		// eslint-disable-next-line array-callback-return
		const operations = users.map(usr => {
			let passwd = null;
			const role = usr.profile_type || foundRole._id;

			if (usr.pin !== null && usr.pin !== undefined) {
				passwd = usr.pin;
			}

			if (passwd) {
				return db.collection('users').updateOne(
					{ _id: ObjectId(usr._id) },
					{
						$set: {
							password: passwd,
							role: ObjectId(role),
						},
					}
				);
			}
		});

		return Promise.all(operations);
	},

	async down(db, client) {
		return Promise.resolve('ok');
	},
};
