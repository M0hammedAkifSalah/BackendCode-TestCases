// todo: not in use
const mongoose = require('mongoose');

const adminSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		username: {
			type: String,
			required: [true, ' User name is required'],
		},
		password: {
			type: String,
			required: [true, 'password is required'],
		},
		name: {
			type: String,
			required: false,
		},
		mobile: {
			type: Number,
			required: false,
		},
		dob: {
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
		designation: {
			type: String,
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
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
