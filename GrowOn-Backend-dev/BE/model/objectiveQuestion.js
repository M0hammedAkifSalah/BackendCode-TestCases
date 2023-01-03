const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(mongoose);

const objectiveQuestionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question_id: {
		type: String,
		required: false,
		default: null,
	},
	question_count: {
		type: Number,
		default: 0,
	},
	class: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'Class is required'],
		ref: 'Class',
	},
	board: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				required: [true, 'Board is required'],
				ref: 'Board',
			},
		],
		default: [],
	},
	syllabus: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				required: [true, 'Syllabus is required'],
				ref: 'Syllabus',
			},
		],
		default: [],
	},
	subject: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'Subject is required'],
		ref: 'Subject',
	},
	chapter: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				required: [true, 'Chapter is required'],
				ref: 'Chapter',
			},
		],
		default: [],
	},
	topic: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				required: false,
				ref: 'Topic',
			},
		],
		default: [],
	},
	learningOutcome: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'LearnOutcome',
				required: false,
			},
		],
		default: [],
	},
	questionCategory: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'QuestionType',
				required: [false, 'Question Category Outcome is required'],
			},
		],
		default: [],
	},
	examType: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'ExamType',
				required: false,
			},
		],
		default: [],
	},
	questionType: {
		type: Array,
		required: [true, 'Question Type  is required'],
	},
	language: {
		type: String,
		required: false,
	},
	practiceAndTestQuestion: {
		type: [
			{
				type: String,
				required: [false, 'Select Practices or Test'],
				default: 'practiceTest',
				enum: ['practiceTest', 'practice', 'test'],
			},
		],
	},
	studentType: {
		type: Array,
		required: false,
	},
	difficultyLevel: {
		type: String,
		required: false,
		default: 'intermediate',
	},
	questionTitle: {
		type: String,
		required: false,
	},
	question: {
		type: Array,
		required: [true, 'Question is required'],
	},
	questionSvg: {
		type: String,
		required: true,
	},
	questions: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'ObjectiveQuestion',
			},
		],
		default: [],
	},
	linked: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'ObjectiveQuestion',
	},
	optionsType: {
		type: String,
		required: false,
	},
	options: {
		type: Array,
		required: [true, 'Options is required'],
	},
	matchOptions: {
		type: Object,
		required: false,
	},
	answer: {
		type: Array,
		required: [true, 'Answer is required'],
	},
	reason: {
		type: String,
		required: false,
	},
	totalMarks: {
		type: Number,
		required: [true, 'Total Marks is required'],
		default: 0,
	},
	negativeMarks: {
		type: Number,
		default: 0,
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
	repository: {
		type: Array,
		required: false,
	},
	attempt_date: {
		type: Date,
		required: false,
	},
	attempt_count: {
		type: Number,
		required: false,
		default: 0,
	},
	correct_count: {
		type: Number,
		required: false,
	},
	wrong_count: {
		type: Number,
		required: false,
		default: 0,
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
objectiveQuestionSchema.plugin(autoIncrement.plugin, {
	model: 'ObjectiveQuestion',
	field: 'question_count',
	startAt: 1000,
});

const ObjectiveQuestion = mongoose.model(
	'ObjectiveQuestion',
	objectiveQuestionSchema
);

module.exports = ObjectiveQuestion;
