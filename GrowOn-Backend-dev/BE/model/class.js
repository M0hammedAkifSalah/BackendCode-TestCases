const mongoose = require('mongoose');

// name, email, photo, password, passwordConfirm

const classSchema = new mongoose.Schema({
	sequence_number: {
		type: Number,
		required: false,
	},
	name: {
		type: String,
		required: [true, 'Please Enter Class Name'],
	},
	description: {
		type: String,
		required: false,
	},
	author: {
		type: String,
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
	repository: {
		type: Array,
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

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
