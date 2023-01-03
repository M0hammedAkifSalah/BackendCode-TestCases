const {
	Types: { ObjectId },
} = require('mongoose');

module.exports = {
	async up(db) {
		// TODO write your migration here.
		// get all schoolIds from DB.
		const schoolList = await db.collection('schools').find({}).toArray();
		// get all classes and its sections in the below format of a particular school
		console.log('count', schoolList.length);
		const operations = schoolList.map(ele =>
			db
				.collection('sections')
				.aggregate([
					{
						$match: {
							school: ObjectId(ele._id),
						},
					},
					{
						$group: {
							_id: '$class_id',
							section: {
								$push: '$_id',
							},
						},
					},
					{
						$project: {
							_id: 0,
							secondClasses: '$_id',
							section: 1,
						},
					},
				])
				.toArray()
				.then(result => {
					console.log('el', ele);
					// result: [{
					//   secondClasses: ObjectId,
					//   section: ['ObjectId']
					// }]
					// update all user's secondary_class of that school
					db.collection('users').updateMany(
						{ school_id: ele._id },
						{
							$set: {
								secondary_class: result,
							},
						}
					);
				})
				.catch(err => console.log(err.message))
		);
		return Promise.all(operations);
	},

	async down(db) {
		// TODO write the statements to rollback your migration (if possible)
		// const operations = db.collection('users').updateMany(
		// 	{},
		// 	{
		// 		$unset: {
		// 			secondary_class: null,
		// 		},
		// 	}
		// );
		return Promise.all('ok');
	},
};
