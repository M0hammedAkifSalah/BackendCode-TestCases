const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			required: false,
			default: '',
		},
		institute_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Institute',
			required: true,
		},
		groups: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'ContentGroup',
					required: false,
				},
			],
			default: [],
		},
		priority: {
			type: Number,
			required: true,
			default: 0,
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		updated_by: {
			type: mongoose.Schema.Types.ObjectId,
			required: false,
			ref: 'User',
		},
	},
	{ timestamps: true }
);

const Content = mongoose.model('Curriculum', curriculumSchema);
module.exports = Content;
