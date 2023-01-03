const mongoose = require('mongoose');

const sectionSchema = mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Section is required'],
	},
	description: {
		type: String,
		required: false,
	},
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: false,
	},
	board: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Board',
		required: false,
	},
	syllabus: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Syallabus',
		required: false,
	},
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Class',
		required: true,
	},
	subjectList: {
		type: [
			{
				subject_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Subject',
					required: false,
				},
				name: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
	repository: {
		type: Array,
		required: false,
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
const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
