const mongoose = require('mongoose');

const ContentGroupSchema = mongoose.Schema(
	{
		group_name: {
			type: String,
		},
		description: {
			type: String,
			required: false,
		},
		curriculum: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Curriculum',
			required: true,
		},
		userList: {
			type: [
				{
					teacher_id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'User',
						required: false,
					},
					status: {
						type: String,
						required: false,
						enum: ['requested', 'approved', 'rejected'],
						default: 'requested',
					},
					requested_At: {
						type: Date,
						required: false,
						default: Date.now,
					},
				},
			],
			default: [],
		},
		posts: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Post',
					required: false,
				},
			],
			default: [],
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		updated_by: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'User',
		},
	},
	{ timestamps: true }
);

const Group = mongoose.model('ContentGroup', ContentGroupSchema);

module.exports = Group;
