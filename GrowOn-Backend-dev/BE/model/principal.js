// Todo: not in use
const mongoose = require('mongoose');
const validator = require('validator');

const principalSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,

	name: {
		type: String,
		required: false,
	},
	mobile: {
		type: Number,
		required: [true, 'Mobile number is required'],
	},
	password: {
		type: String,
		required: [true, ' Password is required'],
	},
	gender: {
		type: String,
		required: false,
	},
	qualification: {
		type: String,
		required: false,
	},
	dob: {
		type: String,
		required: false,
	},
	email: {
		type: String,
		required: true,
		Unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'please provide a password'],
	},
	address: {
		type: String,
		required: false,
	},
	aadhar_card: {
		type: Number,
		required: false,
	},
	blood_gr: {
		type: String,
		required: false,
	},
	religion: {
		type: String,
		required: false,
	},
	caste: {
		type: String,
		required: false,
	},
	mother_tounge: {
		type: String,
		required: false,
	},
	marital_status: {
		type: String,
		required: false,
	},
	experience: {
		type: String,
		required: false,
	},
	level: {
		type: String,
		required: false,
	},
	leaderShip_Exp: {
		type: String,
		required: false,
	},
	cv: {
		type: String,
		required: false,
	},
	ten_details: {
		type: Object,
		required: false,
	},
	twelve_details: {
		type: Object,
		required: false,
	},
	graduation_details: {
		type: Object,
	},
	masters_details: {
		type: Object,
	},
	other_degrees: {
		type: Array,
		required: false,
	},
	certifications: {
		type: Array,
		required: false,
	},
	extra_achievement: {
		type: Array,
		required: false,
	},
	repository: {
		type: Array,
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

const Principal = mongoose.model('Principal', principalSchema);
module.exports = Principal;
