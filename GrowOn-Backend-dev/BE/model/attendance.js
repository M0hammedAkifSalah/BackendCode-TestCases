const mongoose = require('mongoose');

const generateAttendanceReport = require('../helper/generateAttendanceReport');

const attendanceSchema = mongoose.Schema(
	{
		class_teacher: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		attendance_takenBy_teacher: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		school_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'School',
		},
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Class',
		},
		section_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Section',
			required: true,
		},
		// subject:{},
		// sections: {
		//   type: [
		//     {
		//       type: mongoose.Schema.Types.ObjectId,
		//       ref: "Section",
		//     },
		//   ],
		//   default: [],
		// },
		date: {
			type: Date,
			required: true,
			default: Date.now,
		},
		attendanceDetails: {
			type: [
				{
					student_id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Student',
						required: true,
					},
					// section_id: {
					//   type: mongoose.Schema.Types.ObjectId,
					//   ref: "Section",
					// },
					status: {
						type: String,
						default: 'Present',
						enum: ['Present', 'Absent', 'Late', 'Partial_Absent'],
					},
					late_comment: {
						type: String,
					},
				},
			],
			default: [],
		},
		// activity_id:{     },
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

attendanceSchema.post('save', (doc, next) => {
	generateAttendanceReport(doc)
		.then(() => next())
		.catch(err => next());
});

attendanceSchema.post('updateOne', (doc, next) => {
	generateAttendanceReport(doc)
		.then(() => next())
		.catch(err => next());
});

attendanceSchema.post('findOneAndUpdate', (doc, next) => {
	generateAttendanceReport(doc)
		.then(() => next())
		.catch(err => next());
});

attendanceSchema.post('updateMany', (doc, next) => {
	generateAttendanceReport(doc)
		.then(() => next())
		.catch(err => next());
});

attendanceSchema.post('save', (doc, next) => {
	generateAttendanceReport(doc)
		.then(() => next())
		.catch(err => next());
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
