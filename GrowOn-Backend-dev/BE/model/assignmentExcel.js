const { Schema, model } = require('mongoose');

// Excel Report will be month & section wise
const AssignmentExcelReport = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: [true, 'student Id is required'],
		},
		sectionId: {
			type: Schema.Types.ObjectId,
			ref: 'Section',
			required: [false, 'section Id is required'],
		},
		classId: {
			type: Schema.Types.ObjectId,
			ref: 'Class',
			required: [false, 'class Id is required'],
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [false, 'school Id is required'],
		},
		totalAssignments: {
			type: Number,
			required: false,
		},
		coins: {
			type: Number,
			required: false,
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
		AssignmentReport: {
			type: [
				{
					date: {
						type: Number,
						required: [true, 'Date is required'],
					},
					assignmentCount: {
						type: Number,
						required: [false, 'assignmentCount is required'],
						default: 0,
					},
					submitted: {
						type: Number,
						required: [true, 'submitted is required'],
						default: 0,
					},
					evaluated: {
						type: Number,
						required: [true, 'evaluated is required'],
						default: 0,
					},
					notSubmitted: {
						type: Number,
						required: [true, 'notSubmitted is required'],
						default: 0,
					},
					lateSubmitted: {
						type: Number,
						required: [true, 'lateSubmitted is required'],
						default: 0,
					},
					reassigned: {
						type: Number,
						required: [true, 'reassigned is required'],
						default: 0,
					},
					isAbleTo: {
						type: Number,
						required: [true, 'reassigned is required'],
						default: 0,
					},
					outcomes: {
						type: Number,
						required: [true, 'outcomes is required'],
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

AssignmentExcelReport.index({ sectionId: 1, month: 1, year: 1 });
AssignmentExcelReport.index({ schoolId: 1, classId: 1, month: 1, year: 1 });
AssignmentExcelReport.index({ schoolId: 1, month: 1, year: 1 });
AssignmentExcelReport.index({ studentId: 1, month: 1, year: 1 });

const AssignmentReport = model('AssignmentExcelReport', AssignmentExcelReport);

module.exports = AssignmentReport;
