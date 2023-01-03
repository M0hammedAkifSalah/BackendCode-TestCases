const mongoose = require('mongoose');

const innovationSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	submitted_by: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Student',
	},
	title: {
		type: String,
		required: false,
	},
	about: {
		type: String,
		required: false,
	},
	tags: {
		type: Array,
		required: false,
	},
	files: {
		type: [
			{
				type: String,
				required: false,
			},
		],
		default: [],
	},
	coin: {
		type: Number,
		required: false,
	},
	repository: {
		type: Array,
		required: false,
	},
	like: {
		type: Number,
		required: false,
	},
	like_by: {
		type: Array,
		required: false,
	},
	view: {
		type: Number,
		required: false,
		default: 0,
	},
	view_by: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
				required: false,
			},
		],
		default: [],
	},
	category: {
		type: Array,
		required: false,
	},
	teacher_note: {
		type: String,
		required: false,
	},
	teacher_id: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'user',
				required: true,
			},
		],
		default: [],
	},
	published: {
		type: String,
		required: false,
		default: 'no',
	},
	published_with: {
		type: String,
		required: false,
	},
	created_by: {
		type: Date,
		default: Date.now,
	},
});

const Innovation = mongoose.model('Innovation', innovationSchema);

module.exports = Innovation;
