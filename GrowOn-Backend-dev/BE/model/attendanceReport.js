const { Schema, model } = require('mongoose');

// Report will be month & section wise
const AttendanceReportSchema = new Schema(
	{
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'School Id is required'],
		},
		classId: {
			type: Schema.Types.ObjectId,
			ref: 'Class',
			required: [true, 'Class Id is required'],
		},
		sectionId: {
			type: Schema.Types.ObjectId,
			ref: 'Section',
			required: [true, 'Section Id is required'],
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
		dailyReports: {
			_id: false,
			type: [
				{
					date: {
						type: Number,
						min: 1,
						index: true,
						max: [31, 'Date should be less than 31'],
						required: [true, 'Date is required'],
					},
					present: {
						type: Number,
						required: [true, 'Attended is required'],
						default: 0,
					},
					absent: {
						type: Number,
						required: [true, 'Absent is required'],
						default: 0,
					},
					late: {
						type: Number,
						required: [true, 'Late is required'],
						default: 0,
					},
					partial: {
						type: Number,
						required: [true, 'Partial Absent is required'],
						default: 0,
					},
				},
			],
			default: [],
			validate: [
				function (val) {
					return val.length <= 31;
				},
				'Daily Report should not be more than 31 days',
			],
		},
	},
	{
		timestamps: true,
	}
);

AttendanceReportSchema.index({ schoolId: 1, month: 1, year: 1 });

const AttendanceReport = model('AttendanceReport', AttendanceReportSchema);

module.exports = AttendanceReport;
