// Todo: need to confirm
const mongoose = require('mongoose');

const questionType = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: {
		type: String,
		required: false,
	},
	description: {
		type: String,
		required: false,
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

const QuestionType = mongoose.model('QuestionType', questionType);

module.exports = QuestionType;
