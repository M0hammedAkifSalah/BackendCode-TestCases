// Not sure
const mongoose = require('mongoose');

const stypeSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		stype: {
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
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const stype = mongoose.model('Stype', stypeSchema);

module.exports = stype;
