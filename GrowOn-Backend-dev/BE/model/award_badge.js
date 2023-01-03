// todo: not in use
const mongoose = require('mongoose');

const awardBadgeSchema = mongoose.Schema(
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
		file_upload: {
			type: String,
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

const AwardBadge = mongoose.model('AwardBadge', awardBadgeSchema);

module.exports = AwardBadge;
