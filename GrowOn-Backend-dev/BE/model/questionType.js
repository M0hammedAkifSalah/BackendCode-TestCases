// Todo: need to confirm is using

const mongoose = require('mongoose');

const questionTypeSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,
		name: {
			type: String,
			required: false,
		},
		class_id: {
			type: String,
			required: false,
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

const QuestionType = mongoose.model('QuestionType', questionTypeSchema);

module.exports = QuestionType;
