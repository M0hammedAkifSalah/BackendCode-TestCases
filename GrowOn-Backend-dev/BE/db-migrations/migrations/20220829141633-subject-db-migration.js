module.exports = {
	async up(db) {
		const subjects = await db
			.collection('subjects')
			.aggregate(
				[
					{
						$project: {
							name: 1,
							repository: 1,
						},
					},
					{
						$unwind: '$repository',
					},
					{
						$unwind: '$repository.mapDetails',
					},
					{
						$group: {
							_id: {
								school: '$repository.id',
								board: '$repository.mapDetails.boardId',
								syllabus: '$repository.mapDetails.syllabuseId',
								class: '$repository.mapDetails.classId',
							},
							subject: {
								$addToSet: {
									_id: '$repository.mapDetails._id',
									subject_id: '$_id',
									name: '$name',
								},
							},
						},
					},
					{
						$project: {
							_id: 0,
							school: '$_id.school',
							board: '$_id.board',
							syllabus: '$_id.syllabus',
							class: '$_id.class',
							subject: 1,
						},
					},
				],
				{ allowDiskUse: true }
			)
			.skip(200)
			.limit(15)
			.toArray();
		let i = 0;
		let j = 0;
		const operations = subjects.map(ele => {
			// eslint-disable-next-line no-plusplus
			console.log('sub_num', i++);
			return db
				.collection('sections')
				.find({ 'repository.id': ele.school.toString(), class_id: ele.class })
				.forEach(obj => {
					// eslint-disable-next-line no-plusplus
					console.log('sections', j++);
					db.collection('sections').updateOne(
						{ _id: obj._id },
						{
							$set: {
								school: ele.school,
								board: ele.board,
								syllabus: ele.syllabus,
								subjectList: ele.subject,
							},
						}
					);
				});
		});
		return Promise.all(operations);
	},

	async down(db) {
		// const sections = await db.collection('sections').find({}).toArray();
		// const operations = sections.map(ele =>
		// 	db.collection('sections').updateOne(
		// 		{ _id: ele._id },
		// 		{
		// 			$unset: {
		// 				school: null,
		// 				board: null,
		// 				syllabus: null,
		// 				subjectList: null,
		// 			},
		// 		}
		// 	)
		// );
		return Promise.all('ok');
	},
};
