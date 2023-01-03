module.exports = {
	async up(db) {
		const attendances = await db
			.collection('attendances')
			.find({})
			.limit(1)
			// change the skip and limit process only 10000 at a time (js heap error)
			// .skip(11000)
			// .limit(10000)
			.toArray();

		const operations = attendances.map(att =>
			att.attendanceDetails.map(atd =>
				db
					.collection('students')
					.findOne({ _id: atd.student_id })
					.then(foundStud => {
						// console.log(foundStud);
						if (foundStud === null || !foundStud) {
							// console.log('hit');
							db.collection('attendances').updateMany(
								{ 'attendanceDetails.student_id': atd.student_id },
								{
									$pull: {
										attendanceDetails: { student_id: atd.student_id },
									},
								}
							);
						}
					})
			)
		);
		return Promise.all(operations);
	},

	async down(db) {
		return Promise.all('ok');
	},
};
