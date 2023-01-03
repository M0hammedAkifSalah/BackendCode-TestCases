const mongoose = require('mongoose');

const groupSchema = mongoose.Schema({
	group_name: {
		type: String,
	},
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	students: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
	],
	users: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	],
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
