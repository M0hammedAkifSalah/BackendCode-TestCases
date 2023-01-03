const {
	Types: { ObjectId },
} = require('mongoose');

module.exports = {
	async up(db) {
		const groups = await db.collection('groups').find({}).toArray();

		// eslint-disable-next-line array-callback-return
		const operations = groups.map(gr => {
			const students = gr.students ? gr.students : [];

			if (gr.gr_person && Array.isArray(gr.gr_person) && gr.gr_person.length) {
				gr.gr_person.forEach(gr_obj => {
					if (gr_obj.student_id && ObjectId.isValid(gr_obj.student_id)) {
						students.push(ObjectId(gr_obj.student_id));
					}
				});
			}

			if (students.length) {
				return db.collection('groups').updateOne(
					{ _id: ObjectId(gr._id) },
					{
						$addToSet: { students: { $each: students } },
						$unset: { gr_person: 1 },
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
