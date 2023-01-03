module.exports = {
	async up(db) {
		const users = await db.collection('users').find({}).toArray();

		const operations = users.map(async user => {
			const data = JSON.parse(JSON.stringify(user));
			if (!data.dob || data.dob === 'Invalid Date') {
				user.dob = '02-05-2000';
			}
			const dob_date = new Date(data.dob);
			const today = new Date();
			const age = today.getFullYear() - dob_date.getFullYear();
			await db.collection('users').updateOne(
				{ _id: user._id },
				{
					$set: {
						age,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down(db) {
		const users = await db.collection('users').find({}).toArray();
		const operations = users.map(async user => {
			await db.collection('users').updateOne(
				{ _id: user._id },
				{
					$unset: {
						age: '',
					},
				}
			);
		});

		return Promise.all(operations);
	},
};
