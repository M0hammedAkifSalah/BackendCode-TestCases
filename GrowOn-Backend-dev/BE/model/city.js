const mongoose = require('mongoose');

const CitySchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		state_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'State',
		},
		city_name: {
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

const City = mongoose.model('City', CitySchema);

module.exports = City;
