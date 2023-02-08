const { Schema, model } = require('mongoose');

const questionSchema = new Schema({
	_id: false,
	question: {
		type: String,
		required: [true, 'question is required'],
	},
	options: {
		type: [String],
		required: [true, 'options are required'],
		max: 4,
		min: 4,
	},
	answer: {
		type: Number,
		required: [true, 'answer is required'],
	},
	marks: Number,
});

const studentSchema = new Schema({
	_id: false,
	student: {
		type: Schema.Types.ObjectId,
		ref: 'Student',
	},
	class: {
		type: Schema.Types.ObjectId,
		ref: 'Class',
	},
	section: {
		type: Schema.Types.ObjectId,
		ref: 'Section',
	},
	marksObtained: {
		type: Number,
		default: 0,
	},
});

const MCQSchema = new Schema(
	{
		title: {
			type: String,
			required: [true, 'title is required'],
		},
		questionCount: {
			type: Number,
			required: [true, 'questionCount is required'],
		},
		totalMarks: {
			type: Number,
			required: [true, 'totalMarks is required'],
		},
		assignedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: false,
		},
		questions: [questionSchema],
		assignedTo: [studentSchema],
	},
	{ timestamps: true }
);

module.exports = model('assessment', MCQSchema);
