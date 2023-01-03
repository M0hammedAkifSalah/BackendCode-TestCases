const mongoose = require('mongoose');

const countrySchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		country_name: {
			type: String,
			required: false,
		},
		repository: {
			type: Array,
			required: false,
		},
		file_upload: {
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

const Country = mongoose.model('Country', countrySchema);

module.exports = Country;
