// todo : duplicate need to check
const mongoose = require('mongoose');

const QuestionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question_title: {
		type: String,
		required: [true, 'Generated Question Title Name'],
	},
	board: {
		type: String,
		required: false,
	},
	chapter: {
		type: String,
		required: false,
	},
	class: {
		type: String,
		required: false,
	},
	difficultyLevel: {
		type: String,
		required: false,
	},
	subject: {
		type: String,
		required: false,
	},
	syllabus: {
		type: String,
		required: false,
	},
	topic: {
		type: String,
		required: [true, 'Topice name is required'],
	},
	language: {
		type: String,
		required: false,
	},
	studentType: {
		type: Array,
		required: false,
	},
	examType: {
		type: Array,
		required: false,
	},
	learningOutcome: {
		type: String,
		required: [true, 'Learning Outcome is required'],
	},
	question_list: [
		{
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
		},
	],
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
	repository: {
		type: Array,
		required: false,
	},
});
const actualQuestion = mongoose.model('actualQuestion', QuestionSchema);

module.exports = actualQuestion;
