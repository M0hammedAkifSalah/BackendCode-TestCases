const mongoose = require('mongoose');

const SchematestAnswer = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	question_title: {
		type: String,
		required: false,
	},
	question_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'actualQuestion',
		required: true,
	},
	status: {
		type: String,
		default: 'Under Review',
	},
	attempt_question: {
		type: Number,
		required: false,
	},
	student_details: {
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Class',
			required: true,
		},
		teacher_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		school_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
	},
	answer_details: {
		type: [
			{
				question: {
					type: String,
					required: true,
				},
				answer: {
					type: Array,
					required: false,
				},
				answers: {
					type: Array,
					required: false,
				},
				answerByStudent: {
					type: Array,
					required: false,
				},
				correctOrNot: {
					type: String,
					required: false,
				},
				timetaken: {
					type: String,
					required: true,
				},
				obtainedMarks: {
					type: Number,
					required: true,
					default: 0,
				},
				questionId: {
					type: String,
					required: true,
				},
				marks: {
					type: Number,
					required: true,
					default: 0,
				},
				negative_mark: {
					type: Number,
					required: true,
					default: 0,
				},
				questionType: {
					type: String,
					required: false,
				},
				status: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
	feedback: {
		questions: [
			{
				type: String,
				required: false,
			},
		],
		types: [
			{
				type: String,
				required: false,
			},
		],
		comment: {
			type: String,
			required: false,
		},
	},
	totalTimeTaken: {
		type: String,
		required: false,
	},
	totalMarks: {
		type: Number,
		required: false,
	},
	coin: {
		type: Number,
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
	teacher_feedback: {
		teacher_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		feedback_type: {
			type: String,
		},
		comment: {
			type: String,
		},
	},
});

const answerSheet = mongoose.model('answerSheet', SchematestAnswer);

module.exports = answerSheet;
