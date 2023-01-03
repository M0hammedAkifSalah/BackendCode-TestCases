// Todo: not in use
const mongoose = require('mongoose');

const QuestionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question_title: {
		type: String,
		required: [true, 'Generated Question Title Name'],
	},
	topic: {
		type: String,
		required: [true, 'Topice name is required'],
	},
	learningOutcome: {
		type: String,
		required: [true, 'Learning Outcome is required'],
	},
	quesionTitle: {
		type: String,
		required: [true, 'Question Title is required'],
	},
	question: {
		type: Array,
		required: [true, 'Question is required'],
	},
	optionsType: {
		type: String,
	},
	options: {
		type: Array,
		required: [true, 'Options is required'],
	},
	answer: {
		type: Array,
		required: [true, 'Answer is required'],
	},
	totalMarks: {
		type: String,
		required: [true, 'Total Marks is required'],
	},
	negativeMarks: {
		type: String,
	},
	negativeScore: {
		type: String,
		required: [true, 'Answer is required'],
		enum: ['YES', 'NO'],
	},
	duration: {
		type: String,
		required: [true, 'Answer is required'],
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
const generatedQuestion = mongoose.model('generatedQuestion', QuestionSchema);

module.exports = generatedQuestion;
