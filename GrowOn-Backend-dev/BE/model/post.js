const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
	{
		file: [
			{
				type: String,
				required: [true, 'file is required'],
			},
		],
		file_name: {
			type: String,
			required: [true, 'file_name is required'],
		},
		description: {
			type: String,
			required: false,
		},
		group_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ContentGroup',
			required: [true, 'group_id is required'],
		},
		uploaded_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'uploaded_by is required'],
		},
		uploaded_date: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

const posts = mongoose.model('Post', postSchema);

module.exports = posts;
