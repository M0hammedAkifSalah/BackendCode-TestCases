module.exports = {
	async up(db) {
		// need to give repository.id(school_id) in params
		const Sections = await db
			.collection('sections')
			.find({ 'repository.id': '62b05b389418552fdb96e031' })
			.toArray();

		const operations = Sections.map(ele =>
			db
				.collection('students')
				.aggregate([
					{
						$match: {
							section: ele._id,
						},
					},
					{
						$group: {
							_id: {
								name: '$name',
								username: '$username',
							},
							count: {
								$sum: 1,
							},
							ids: {
								$push: '$_id',
							},
						},
					},
					{
						$match: {
							count: {
								$gt: 1,
							},
						},
					},
					{
						$addFields: {
							num: {
								$subtract: ['$count', 1],
							},
						},
					},
					{
						$project: {
							ids: {
								$slice: ['$ids', 1, '$num'],
							},
							count: '$num',
						},
					},
				])
				.toArray()
				.then(Students => {
					if (Students.length > 0) {
						Students.map(el => {
							db.collection('attendances').updateMany(
								{
									section_id: ele._id,
									'attendanceDetails.student_id': {
										$in: el.ids,
									},
								},
								{
									$pull: {
										attendanceDetails: {
											student_id: {
												$in: el.ids,
											},
										},
									},
								}
							);
							return db.collection('students').deleteMany({
								_id: {
									$in: el.ids,
								},
							});
						});
					}
				})
				.catch(err => {
					console.log(err.message);
				})
		);
		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
