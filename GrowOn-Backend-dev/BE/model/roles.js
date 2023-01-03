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
			required: true,
		},
		privilege: {
			type: Object,
			required: true,
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
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

module.exports = mongoose.model('role', roleSchema);
