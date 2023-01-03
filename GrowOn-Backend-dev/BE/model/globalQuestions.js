const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(mongoose);

const globalObjectiveQuestionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question_id: {
		type: String,
		required: false,
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
	board: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: [true, 'Board is required'],
			ref: 'Board',
		},
	],
	syllabus: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: [true, 'Syllabus is required'],
			ref: 'Syllabus',
		},
	],
	subject: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'Subject is required'],
		ref: 'Subject',
	},
	chapter: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: [true, 'Chapter is required'],
			ref: 'Chapter',
		},
	],
	topic: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'Topic',
		},
	],
	learningOutcome: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'LearnOutcome',
			required: false,
			default: [],
		},
	],
	questionCategory: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'QuestionType',
			required: [false, 'Question Category Outcome is required'],
			default: [],
		},
	],
	examType: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ExamType',
			required: [false, 'Exam Type Outcome is required'],
			default: [],
		},
	],
	questionType: {
		type: Array,
		required: [true, 'Question Type  is required'],
	},
	language: {
		type: String,
		required: [false, 'Language Type  is required'],
	},
	practiceAndTestQuestion: {
		type: [
			{
				type: String,
				required: [false, 'Select Practices or Test'],
				default: 'practiceTest',
				enum: ['practiceTest', 'test', 'practice'],
			},
		],
	},
	studentType: {
		type: Array,
		required: false,
	},
	difficultyLevel: {
		type: String,
		required: [false, 'Difficulty Level is required'],
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
	questions: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'globalObjectiveQuestion',
				required: true,
			},
		],
		default: [],
	},
	linked: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'globalObjectiveQuestion',
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
	repository: [
		{
			id: String,
			repository_type: String,
		},
	],
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
	importedBySchool: {
		type: Array,
		required: false,
	},
	// fromSchool_id:{
	//     type:String,
	//     required:false

	// },
	// fromQuestion_id:{
	//     type:String,
	//     required:false

	// },
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
globalObjectiveQuestionSchema.plugin(autoIncrement.plugin, {
	model: 'globalObjectiveQuestion',
	field: 'question_count',
	startAt: 1000,
});

const globalObjectiveQuestion = mongoose.model(
	'globalObjectiveQuestion',
	globalObjectiveQuestionSchema
);

module.exports = globalObjectiveQuestion;
