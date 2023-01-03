const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const students = await db.collection('students').find({}).toArray();

		// eslint-disable-next-line array-callback-return
		const operations = students.map(std => {
			const updateObj = {};

			if (std.city_id && std.city_id.length > 2) {
				updateObj.city_id = ToObjectId(std.city_id);
			}

			if (std.country_id && std.country_id.length > 2) {
				updateObj.country_id = ToObjectId(std.country_id);
			}

			if (std.state_id && std.state_id.length > 2) {
				updateObj.state_id = ToObjectId(std.state_id);
			}

			if (std.section && std.section.length > 5) {
				updateObj.section = ToObjectId(std.section);
			}

			// subject
			const subject = [];
			if (std.subject && Array.isArray(std.subject) && std.subject.length > 0) {
				std.subject.forEach(su => {
					if (su.length > 2) {
						subject.push(ToObjectId(su));
					}
				});
			}
			if (subject.length) updateObj.subject = subject;

			if (Object.keys(updateObj).length !== 0) {
				return db.collection('students').updateOne(
					{ _id: std._id },
					{
						$set: updateObj,
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
