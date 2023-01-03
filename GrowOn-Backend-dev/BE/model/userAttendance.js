const { Schema, model } = require('mongoose');

const statusesEnum = ['PRESENT', 'ABSENT', 'LATE', 'PARTIAL'];

const UserAttendanceSchema = new Schema(
	{
		teacherId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'teacher id is required'],
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'School id is required'],
		},
		status: {
			type: String,
			enum: statusesEnum,
			required: true,
		},
		date: {
			type: Date,
			default: Date.now,
		},
		workingHours: {
			type: Number,
			default: 0,
		},
		isApproved: {
			type: Boolean,
			default: false,
		},
		lastWeek: {
			type: [String],
			enum: [...statusesEnum, 'NOT_MARKED'],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

UserAttendanceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = model('userAttendance', UserAttendanceSchema);
