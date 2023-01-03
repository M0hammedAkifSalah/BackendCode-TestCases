const mongoose = require('mongoose');

const roleSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		role_name: {
			type: String,
			required: true,
		},
		display_name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: false,
		},
		level: {
			type: String,
			required: false,
		},
		type: {
			type: String,
			required: false,
		},
		privilege: {
			type: Object,
			required: true,
		},
		repository: {
			type: Array,
			required: true,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
