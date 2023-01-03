const mongoose = require('mongoose');

const topicSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		name: {
			type: String,
			required: false,
		},
		files_upload: {
			type: [
				{
					file: {
						type: String,
						required: false,
					},
					file_name: {
						type: String,
						required: false,
					},
					file_size: {
						type: String,
						required: false,
					},
					file_type: {
						type: String,
						required: false,
					},
					uploaded_date: {
						type: Date,
						default: Date.now,
					},
				},
			],
			default: [],
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Class',
		},
		tags: {
			type: Array,
			required: false,
		},
		board_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Board',
		},
		syllabus_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Syllabus',
		},
		subject_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Subject',
		},
		chapter_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Chapter',
		},
		topic_image: {
			type: String,
			required: false,
		},
		description: {
			type: String,
			required: false,
		},
		repository: [
			{
				repository_type: String,
				branch_name: String,
				id: mongoose.Schema.Types.ObjectId,
			},
		],
		created_by: {
			type: String,
			required: false,
		},
		updated_by: {
			type: String,
			required: false,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
