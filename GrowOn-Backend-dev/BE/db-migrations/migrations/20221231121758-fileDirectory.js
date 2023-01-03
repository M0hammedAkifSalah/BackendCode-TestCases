const { ObjectId } = require('mongoose').Types;

module.exports = {
	async up(db) {
		const posts = await db.collection('posts').find({}).toArray();

		const documents = posts.map(post => ({
			_id: ObjectId(),
			description: post.description,
			name: post.file_name,
			files: post.file,
			type: 'FILES',
			groupId: post.group_id,
			uploadedBy: post.uploaded_by,
			updatedAt: post.uploaded_date,
			createdAt: post.uploaded_date,
			parentFolder: null,
		}));

		return db.collection('filedirectories').insertMany(documents);
	},

	async down(db, client) {
		return Promise.all('ok');
	},
};
