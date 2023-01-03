const mongoose = require('mongoose');

const examTypeSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		name: {
			type: String,
			required: false,
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Class',
			required: false,
			default: null,
		},
		description: {
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

const ExamType = mongoose.model('ExamType', examTypeSchema);

module.exports = ExamType;
