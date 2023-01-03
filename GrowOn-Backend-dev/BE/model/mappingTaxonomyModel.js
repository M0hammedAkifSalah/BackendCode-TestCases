// Todo: not in use
const mongoose = require('mongoose');

const mappingtaxonomySchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Class',
		required: false,
	},
	board_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Board',
		required: false,
	},
	syllabus_id: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Syllabus',
			required: false,
		},
	],
	subject_id: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Subject',
			required: false,
		},
	],
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

const mappingtaxonomy = mongoose.model(
	'mappingtaxonomy',
	mappingtaxonomySchema
);

module.exports = mappingtaxonomy;
