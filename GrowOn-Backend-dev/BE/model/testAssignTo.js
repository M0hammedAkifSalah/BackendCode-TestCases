// Not using now...
const mongoose = require('mongoose');

const testAssignSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Class',
		required: true,
	},
	assignDate: {
		type: String,
		default: Date.now,
	},
	assignTo: {
		type: [
			{
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				status: {
					type: String,
					default: 'Pending',
				},
				submitDate: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	createdBy: { type: String },
	createdDate: { type: Date, default: Date.now },
	repository: {
		school_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
		},
		branch_name: {
			type: String,
		},
	},
});
const TestAssign = mongoose.model('TestAssign', testAssignSchema);

module.exports = TestAssign;
