const { Schema, model } = require('mongoose');

const UserAttendanceReportSchema = new Schema(
	{
		teacherId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		month: {
			type: Number,
			required: true,
		},
		year: {
			type: Number,
			required: true,
		},
		present: Number,
		absent: Number,
		late: Number,
		excused: Number,
		workingHours: Number,
		days: {
			type: [
				{
					_id: false,
					day: {
						type: Number,
						required: true,
					},
					status: {
						type: String,
						enum: ['PRESENT', 'ABSENT', 'LATE', 'PARTIAL', 'EXCUSED'],
						required: true,
					},
					workingHours: Number,
				},
			],
			default: [],
		},
	},
	{ timestamps: true }
);

function calcTotal(days) {
	const result = {
		present: 0,
		absent: 0,
		late: 0,
		excused: 0,
		workingHours: 0,
	};

	days.forEach(({ status, workingHours }) => {
		result[status.toLowerCase()] += 1;
		result[workingHours] += workingHours;
	});

	return result;
}

UserAttendanceReportSchema.pre('save', function (next) {
	const { present, absent, late, excused, workingHours } = calcTotal(
		this.days || []
	);

	this.present = present;
	this.absent = absent;
	this.late = late;
	this.excused = excused;
	this.workingHours = workingHours;

	next();
});

module.exports = model('userAttendanceReport', UserAttendanceReportSchema);
