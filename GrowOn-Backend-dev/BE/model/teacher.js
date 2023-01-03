// Not in use
const mongoose = require('mongoose');
const validator = require('validator');

const teacherSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	DeviceToken: {
		type: String,
		required: false,
	},
	profile_type: {
		type: String,
		required: [true, 'Profile Type needed'],
	},
	username: {
		type: String,
		required: false,
	},
	school_id: {
		type: String,
		required: [true, 'School Id needed'],
	},
	branch_id: {
		type: String,
		required: [true, 'Branch Id needed'],
	},
	designation: {
		type: String,
		required: false,
	},
	name: {
		type: String,
		required: false,
	},
	mobile: {
		type: Number,
		unique: true,
		required: [true, 'Mobile number is required'],
	},
	password: {
		type: String,
		required: false,
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
		required: false,
		Unique: true,
		lowercase: true,
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

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;
