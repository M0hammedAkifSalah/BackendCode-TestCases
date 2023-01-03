// Todo: not in use
const mongoose = require('mongoose');

const quesCategorySchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question: {
		type: String,
		required: false,
	},
	descriptions: {
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

const Question_Category = mongoose.model(
	'Question_Category',
	quesCategorySchema
);

module.exports = Question_Category;
