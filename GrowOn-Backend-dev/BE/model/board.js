const mongoose = require('mongoose');

const boardSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: {
		type: String,
		required: [true, 'Board Already Present'],
	},
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Class',
		required: false,
	},
	description: {
		type: String,
	},
	repository: {
		type: [
			{
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
					default: null,
				},
				branch_name: {
					type: String,
				},
				repository_type: {
					type: String,
				},
				mapDetails: {
					type: [
						{
							classId: {
								type: mongoose.Schema.Types.ObjectId,
								ref: 'Class',
								default: null,
							},
						},
					],
					default: [],
				},
				required: false,
			},
		],
		default: [],
	},
	createdBy: {
		type: String,
		required: false,
	},
	updatedBy: {
		type: String,
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;
