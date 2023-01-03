const mongoose = require('mongoose');

const learnOutcomeSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,

		name: {
			type: String,
			required: false,
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
			},
		],
		about_file: {
			type: String,
			required: false,
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Class',
		},
		board_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Board',
			required: false,
		},
		syllabus_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Syllabus',
		},
		subject_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Subject',
		},
		chapter_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Chapter',
		},
		topic_image: {
			type: String,
			required: false,
		},
		topic_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Topic',
		},
		description: {
			type: String,
			required: false,
		},
		repository: [
			{
				repository_type: String,
				branch_name: String,
				id: String,
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

const LearnOutcome = mongoose.model('LearnOutcome', learnOutcomeSchema);

module.exports = LearnOutcome;
