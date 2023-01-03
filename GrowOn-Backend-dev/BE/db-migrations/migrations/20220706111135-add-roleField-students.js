const {
	Types: { ObjectId },
} = require('mongoose');

module.exports = {
	async up(db) {
		const foundRole = await db
			.collection('roles')
			.findOne({ role_name: 'student' });

		if (!foundRole) {
			return Promise.reject(new Error('Role not found'));
		}

		return db
			.collection('students')
			.updateMany({}, { $set: { role: ObjectId(foundRole._id) } });
	},

	async down() {
		return Promise.resolve('ok');
	},
};
