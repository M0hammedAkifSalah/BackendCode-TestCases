module.exports = {
	async up(db) {
		const students = await db
			.collection('students')
			.find({ dob: { $exists: true } })
			.toArray();

		const operations = students.map(student => {
			let dob = new Date();

			if (student.dob.toLowerCase !== 'invalid date' && student.dob) {
				dob = new Date(student.dob);
			}

			return db.collection('students').updateOne(
				{ _id: student._id },
				{
					$set: {
						dob,
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
