// todo: not in use
const mongoose = require('mongoose');
const { stringify } = require('uuid');

const filterSchema = mongoose.Schema({
	id: mongoose.Schema.Types.ObjectId,
	class: {
		type: String,
	},
	board: {
		type: String,
	},
	syllabus: {
		type: String,
	},
	subject: {
		type: String,
	},
	chapter: {
		type: String,
	},
	topic: {
		type: String,
	},
	learningOutcome: {
		type: String,
	},
	questionCategory: {
		type: String,
	},
	examType: {
		type: String,
	},
	questionType: {
		type: String,
	},
	language: {
		type: String,
	},
	practiceAndTestQuestion: {
		type: String,
	},
	studentType: {
		type: String,
	},
	difficultyLevel: {
		type: String,
	},
	questionTitle: {
		type: String,
	},
	question: {
		type: Array,
	},
	optionsType: {
		type: String,
	},
	options: {
		type: Array,
	},
	answer: {
		type: Array,
	},
	totalMarks: {
		type: String,
	},
	negativeMarks: {
		type: String,
	},
	negativeScore: {
		type: String,
	},
	duration: {
		type: String,
	},
	repository: {
		type: Array,
		required: false,
	},
});

const filter = mongoose.model('filter', filterSchema);

module.exports = filter;
