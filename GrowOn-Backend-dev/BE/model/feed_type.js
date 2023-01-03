// todo: not in use
const mongoose = require('mongoose');

const feedTypeSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		title: {
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

const feedType = mongoose.model('feedType', feedTypeSchema);

module.exports = feedType;
