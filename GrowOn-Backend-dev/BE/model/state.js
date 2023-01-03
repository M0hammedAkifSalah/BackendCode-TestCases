const mongoose = require('mongoose');

const stateSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		country_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Country',
			required: true,
		},
		state_name: {
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
		updatedBy: {
			type: String,
			required: false,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const State = mongoose.model('State', stateSchema);

module.exports = State;
