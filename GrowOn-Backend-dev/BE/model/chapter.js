const mongoose = require('mongoose');

const chapterSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,

		name: {
			type: String,
			required: false,
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Class',
		},
		files_upload: [
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
		about_file: [
			{
				type: String,
				required: false,
			},
		],
		board_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
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
		chapter_image: {
			type: String,
			required: false,
		},
		description: {
			type: String,
			required: false,
		},
		repository: {
			type: [
				{
					id: mongoose.Schema.Types.ObjectId,
					branch_name: String,
					repository_type: String,
				},
			],
			default: [],
		},
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

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
