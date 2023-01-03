const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Feature name is required'],
		},
		description: {
			type: String,
			required: false,
		},
		application: {
			type: [
				{
					type: String,
					required: [true, 'Application is required'],
					enum: ['TEACHER_APP', 'STUDENT_APP', 'WEB_CONSOLE', 'WEB_V2'],
				},
			],
		},
		flag: {
			type: Boolean,
			required: [true, 'Flag is required'],
			default: false,
		},
	},
	{ timestamps: true }
);

const Feature = mongoose.model('Feature', featureSchema);

module.exports = Feature;
