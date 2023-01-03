const mongoose = require('mongoose');

const syllabusSchema = mongoose.Schema({
	name: {
		type: String,
		required: false,
	},
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
		ref: 'Class',
	},
	description: {
		type: String,
		required: false,
	},
	image: {
		type: String,
		required: false,
	},
	repository: {
		type: [
			{
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
					default: null,
				},
				branch_name: {
					type: String,
				},
				repository_type: {
					type: String,
				},
				mapDetails: [
					{
						classId: {
							type: mongoose.Schema.Types.ObjectId,
							ref: 'Class',
							default: null,
						},
						boardId: {
							type: mongoose.Schema.Types.ObjectId,
							ref: 'Board',
							default: null,
						},
					},
				],
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

const Syllabus = mongoose.model('Syllabus', syllabusSchema);
module.exports = Syllabus;
