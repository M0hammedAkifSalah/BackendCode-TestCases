// todo: not in use
const mongoose = require('mongoose');

// name, email, photo, password, passwordConfirm

const branchSchema = new mongoose.Schema({
	//  _id: mongoose.Schema.Types.ObjectId,
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
		ref: 'School',
	},
	name: {
		type: String,
		required: [true, 'please Enter Branch'],
	},
	address: {
		type: String,
		required: false,
	},
	contact: {
		type: Number,
		required: false,
	},
	pincode: {
		type: Number,
		required: false,
	},
	email: {
		type: String,
		required: false,
		default: '',
	},
	city: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'City',
		default: null,
		required: false,
	},
	state: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'State',
		default: null,
		required: false,
	},
	country: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Country',
		default: null,
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
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
