const { Schema, model } = require('mongoose');

function clearedCount(doubts) {
	let count = 0;
	doubts.forEach(e => {
		if (e.isCleared == true) {
			count += 1;
		}
	});
	return count;
}

const messageSchema = new Schema(
	{
		_id: Schema.Types.ObjectId,
		type: {
			type: String,
			enum: ['text', 'image', 'video', 'audio', 'file'],
		},
		text: {
			body: String,
		},
		image: {
			link: String,
			caption: String,
			fileName: String,
		},
		video: {
			link: String,
			caption: String,
			thumbnail: String,
			fileName: String,
		},
		audio: {
			link: String,
			isRecording: Boolean,
			fileName: String,
		},
		file: {
			link: String,
			extension: String,
			fileName: String,
		},
		student_id: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
		},
		teacher_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{ timestamps: true }
);

const doubtSchema = new Schema(
	{
		_id: Schema.Types.ObjectId,
		isCleared: { type: Boolean, required: false, default: false },
		student_id: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
		},
		messages: [messageSchema],
	},
	{
		timestamps: true,
	}
);

const assignmentDoubtSchema = new Schema({
	assignment_id: {
		type: Schema.Types.ObjectId,
		ref: 'Assignment',
		index: true,
		required: [true, 'Assignment id is required'],
	},
	doubts: [doubtSchema],
	commonDoubts: {
		messages: {
			type: [messageSchema],
			default: [],
		},
	},
	total: {
		type: Number,
		default: 0,
	},
	cleared: {
		type: Number,
		default: 0,
	},
});

// calculate total and cleared doubt counts before saving
assignmentDoubtSchema.pre('save', async function (next) {
	const { doubts } = this;
	if (doubts.length) {
		this.total = doubts.length;
		this.cleared = clearedCount(doubts);
	}

	next();
});

const AssignmentDoubtModel = model('AssignmentDoubt', assignmentDoubtSchema);

module.exports = AssignmentDoubtModel;
