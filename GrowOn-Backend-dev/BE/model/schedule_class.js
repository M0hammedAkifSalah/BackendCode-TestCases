const mongoose = require('mongoose');

const schedule_class_Schema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	class_start_Date: {
		type: Date,
		required: true,
	},
	class_end_Date: {
		type: Date,
		required: true,
	},
	class_start_time: {
		type: Date,
		required: true,
	},
	class_end_time: {
		type: Date,
		required: true,
	},
	subject_name: {
		type: String,
		required: true,
	},
	chapter_name: {
		type: String,
		required: true,
	},
	does_class_repeat: {
		type: String,
		required: false,
	},
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	meeting_link: {
		type: String,
		required: false,
	},
	student_join_class: {
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
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
			},
		],
		default: [],
	},
	teacher_join_class: {
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
			},
		],
		default: [],
	},
	attendance_manually: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
			},
		],
		default: [],
	},
	teacher_attendance_manually: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		default: [],
	},
	assign_To: {
		type: [
			{
				class_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Class',
				},
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				section_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Section',
				},
				class: {
					// Todo: need to confirm from front-end
					id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Class',
					},
					name: {
						type: String,
						required: false,
					},
				},
				student: {
					// Todo: need to confirm from front-end
					id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Student',
					},
					name: {
						type: String,
						required: false,
					},
				},
				section: {
					// Todo: need to confirm from front-end
					id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Section',
					},
					name: {
						type: String,
						required: false,
					},
				},
			},
		],
		default: [],
	},
	assign_To_you: {
		type: [
			{
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
			},
		],
		default: [],
	},
	description: {
		type: String,
		required: false,
	},
	files: {
		type: [
			{
				type: String,
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
	linked_id: {
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
	repository: {
		type: [
			{
				school_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
				},
				branch: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
});
const schedule_class = mongoose.model('schedule_class', schedule_class_Schema);

module.exports = schedule_class;
