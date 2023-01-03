// Todo: not in use
const mongoose = require('mongoose');

const QuestionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	QuestionTitle: {
		type: String,
		required: [true, 'Generated Question Title Name'],
	},
	questionId: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ObjectiveQuestion',
			required: true,
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
const generatedQuestionId = mongoose.model(
	'generatedQuestionId',
	QuestionSchema
);

module.exports = generatedQuestionId;
