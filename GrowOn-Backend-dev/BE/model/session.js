const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,

	session_start_Date: {
		type: Date,
		required: true,
	},
	start_Date: {
		type: Date,
	},
	session_end_Date: {
		type: Date,
		default: Date.now,
		required: false,
	},
	session_start_time: {
		type: Date,
		required: true,
	},
	session_end_time: {
		type: Date,
		required: true,
	},
	// status: {
	// 	type: String,
	// 	default: 'Pending',
	// 	enum: ['Assigned', 'Going', 'Not-going', 'Pending'],
	// },
	subject_name: {
		type: String,
		required: true,
	},
	does_session_repeat: {
		type: String,
		required: false,
	},
	isDaily: {
		type: String,
		required: false,
		default: 'no',
	},
	institute_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Institute',
	},
	meeting_link: {
		type: String,
		required: false,
	},
	parent_join_session: {
		type: [
			{
				join_date: {
					type: Date,
					default: Date.now,
				},
				parent_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
				},
			},
		],
		default: [],
	},
	isForStudent: {
		type: Boolean,
		default: true,
	},
	student_join_session: {
		type: [
			{
				join_date: {
					type: Date,
					default: Date.now,
				},
				class_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Class',
				},
				school_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
				},
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
			},
		],
		default: [],
	},
	teacher_join_session: {
		type: [
			{
				join_date: {
					type: Date,
					default: Date.now,
				},
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				school_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
				},
			},
		],
		default: [],
	},
	// attendance_manually: [
	// 	{
	// 		type: mongoose.Schema.Types.ObjectId,
	// 		ref: 'Student',
	// 	},
	// ],
	// teacher_attendance_manually: [
	// 	{
	// 		type: mongoose.Schema.Types.ObjectId,
	// 		ref: 'User',
	// 	},
	// ],
	description: {
		type: String,
		required: false,
	},
	files: [
		{
			type: String,
			required: false,
		},
	],
	schools: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			index: true,
		},
	],
	// assign_To_you: {
	// 	type: [
	// 		{
	// 			teacher_id: {
	// 				type: mongoose.Schema.Types.ObjectId,
	// 				ref: 'User',
	// 			},
	// 		},
	// 	],
	// 	default: [],
	// },
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	updatedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
	},
	linked_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Session',
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
	// repository: [
	// 	{
	// 		school_id: {
	// 			type: mongoose.Schema.Types.ObjectId,
	// 			ref: 'School',
	// 		},
	// 		branch: {
	// 			type: String,
	// 			required: false,
	// 		},
	// 	},
	// ],
});
const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
