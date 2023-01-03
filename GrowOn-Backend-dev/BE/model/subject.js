const mongoose = require('mongoose');

const subjectSchema = mongoose.Schema({
	name: {
		type: String,
		required: false,
	},
	description: {
		type: String,
		required: false,
	},
	s_image: {
		type: String,
		required: false,
	},
	repository: {
		type: [
			{
				id: mongoose.Schema.Types.ObjectId,
				repository_type: String,
				mapDetails: {
					type: [
						{
							syllabuseId: {
								type: mongoose.Schema.Types.ObjectId,
								ref: 'Syllabus',
								default: null,
							},
							boardId: {
								type: mongoose.Schema.Types.ObjectId,
								ref: 'Board',
								default: null,
							},
							classId: {
								type: mongoose.Schema.Types.ObjectId,
								ref: 'Class',
								default: null,
							},
						},
					],
					default: [],
				},
				required: false,
			},
		],
		default: [],
	},
	createdBy: {
		type: String,
		required: false,
	},
	updatedBy: {
		type: String,
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
