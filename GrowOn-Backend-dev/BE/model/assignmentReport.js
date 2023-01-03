const { Schema, model } = require('mongoose');

// Report will be month & section wise
const AssignmentReportSchema = new Schema(
	{
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'School Id is required'],
		},
		month: {
			type: Number,
			required: [true, 'Month is required'],
			min: 1,
			max: 12,
		},
		year: {
			type: Number,
			required: [true, 'Year is required'],
			min: 2000,
		},
		sections: {
			type: [
				{
					section_id: {
						type: Schema.Types.ObjectId,
						ref: 'Section',
						required: [false, 'Section Id is required'],
					},
					class_id: {
						type: Schema.Types.ObjectId,
						ref: 'Class',
						required: [false, 'Class Id is required'],
					},
					totalDoubts: {
						type: Number,
						required: [false, 'totalDoubts is required'],
						default: 0,
					},
					totalClearedDoubts: {
						type: Number,
						required: [false, 'totalClearedDoubts is required'],
						default: 0,
					},
					totalAssigned: {
						type: Number,
						required: [false, 'totalAssigned is required'],
						default: 0,
					},
					totalAssignment: {
						type: Number,
						required: [false, 'totalAssignment is required'],
						default: 0,
					},
					notSubmitted: {
						type: Number,
						required: [false, 'notSubmitted is required'],
						default: 0,
					},
					submitted: {
						type: Number,
						required: [false, 'submitted is required'],
						default: 0,
					},
					evaluated: {
						type: Number,
						required: [false, 'evaluated is required'],
						default: 0,
					},
					reassigned: {
						type: Number,
						required: [false, 'reassigned is required'],
						default: 0,
					},
					lateSubmitted: {
						type: Number,
						required: [false, 'lateSubmitted is required'],
						default: 0,
					},
					isAbleTo: {
						type: Number,
						required: [false, 'isAbleTo is required'],
						default: 0,
					},
					isNotAbleTo: {
						type: Number,
						required: [false, 'isNotAbleTo is required'],
						default: 0,
					},
				},
			],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

AssignmentReportSchema.index({ schoolId: 1, month: 1, year: 1 });

const AssignmentReport = model('AssignmentReport', AssignmentReportSchema);

module.exports = AssignmentReport;
