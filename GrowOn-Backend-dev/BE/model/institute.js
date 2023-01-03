const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(mongoose);
const instituteSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Institute name required'],
		},
		institute_code: {
			type: Number,
			default: 0,
		},
		profile_image: {
			type: String,
			required: false,
			default: '',
		},
		address: {
			type: String,
			required: false,
		},
		city: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'City',
			required: true,
		},
		state: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'State',
			required: true,
		},
		country: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Country',
			required: true,
		},
		email: {
			type: String,
			required: false,
		},
		webSite: {
			type: String,
			required: false,
		},
		contact_number: {
			type: Number,
			required: [true, 'enter Contact number'],
		},
		pincode: {
			type: Number,
			required: [false, 'enter PinCode'],
		},
		curriculum: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Curriculum',
					required: false,
				},
			],
			default: [],
		},
		schoolList: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
					required: false,
				},
			],
			default: [],
		},
		activeStatus: {
			type: Boolean,
			required: false,
			default: true,
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
instituteSchema.plugin(autoIncrement.plugin, {
	model: 'Institute',
	field: 'institute_code',
	startAt: 1000,
});

const Institute = mongoose.model('Institute', instituteSchema);

module.exports = Institute;
