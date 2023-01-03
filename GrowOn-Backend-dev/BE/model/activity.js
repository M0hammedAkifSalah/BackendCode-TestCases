const mongoose = require('mongoose');

const activitySchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	activity_type: {
		type: String,
		required: [true, 'activity Title Name'],
	},
	event_type: {
		type: String,
		required: false,
	},
	image: {
		type: String,
		required: false,
	},
	file: {
		type: Array,
		required: false,
	},
	forward: {
		type: String,
		default: 'false',
	},
	title: {
		type: String,
		required: false,
	},
	links: {
		type: Array,
		required: false,
	},
	publishedWith: {
		type: String,
		required: false,
	},
	description: {
		type: String,
		required: false,
	},
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	message: {
		type: String,
		required: false,
	},
	options: {
		type: [
			{
				text: {
					type: String,
					required: false,
				},
				checked: {
					type: String,
					enum: ['YES', 'NO'],
				},
			},
		],
		default: [],
	},
	selected_checkList: {
		type: [
			{
				options: [
					{
						type: String,
						required: false,
					},
				],
				selected_by: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				selected_by_parent: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
				},
				selected_by_teacher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	selected_livepool: {
		type: [
			{
				options: [
					{
						type: String,
						required: false,
					},
				],
				selected_by: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				selected_by_parent: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
				},
				selected_by_teacher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	startDate: {
		type: Date,
		required: false,
		default: Date.now,
	},
	StartTime: {
		type: Date,
		required: false,
		default: Date.now,
	},
	EndTime: {
		type: Date,
		required: false,
		default: Date.now,
	},
	EndDate: {
		type: Date,
		required: false,
		default: Date.now,
	},
	dueDate: {
		type: Date,
		required: false,
		default: Date.now,
	},
	coin: {
		type: Number,
		required: false,
	},
	total_score: {
		type: Number,
		required: false,
	},
	reward: {
		type: Number,
		required: false,
	},
	about: {
		type: String,
		required: false,
	},
	publish_date: {
		type: Date,
		required: false,
		default: Date.now,
	},
	like: {
		type: Number,
		required: false,
	},
	like_by: {
		type: Array,
		required: false,
	},
	view: {
		type: Number,
		required: false,
	},
	locations: {
		type: String,
		required: false,
	},
	archive_status: {
		type: String,
		enum: ['Yes', 'No'],
		default: 'Yes',
	},
	status: {
		type: String,
		required: false,
	},
	submited_by: {
		type: [
			{
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
					required: true,
				},
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
				parent_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
				},
				message: [
					{
						text: {
							type: String,
							required: false,
						},
						late_reason: {
							type: String,
							required: false,
						},
						is_offline: {
							type: Boolean,
							default: false,
						},
						file: {
							type: Array,
							required: false,
						},
						submitted_date: {
							type: Date,
							default: Date.now,
						},
						evaluator: {
							type: Boolean,
							default: false,
						},
					},
				],
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	assignment_started: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
		},
	],
	going: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
			},
		],
		default: [],
	},
	not_going: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
			},
		],
		default: [],
	},
	going_by_parent: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Parent',
			},
		],
		default: [],
	},
	not_going_by_parent: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Parent',
			},
		],
		default: [],
	},
	going_by_teacher: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		default: [],
	},
	not_going_by_teacher: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		default: [],
	},
	assignTo_parent: {
		type: [
			{
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
					required: true,
				},
				parent_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
					required: true,
				},
				status: {
					type: String,
					default: 'Pending',
				},
			},
		],
		default: [],
	},
	assignTo: {
		type: [
			{
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
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
					required: true,
				},
				section_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Section',
					required: true,
				},
				status: {
					type: String,
					default: 'Pending',
				},
				comment: {
					type: String,
				},
			},
		],
		default: [],
	},
	assignTo_you: {
		type: [
			{
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
				school_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'School',
					required: false,
				},
				status: {
					type: String,
					default: 'Pending',
				},
			},
		],
		default: [],
	},
	class_name: {
		type: String,
		required: false,
	},
	subject: {
		type: String,
		required: false,
	},
	learning_Outcome: {
		type: String,
		required: false,
	},
	tags: {
		type: String,
		required: false,
	},
	acknowledge_by: {
		type: [
			{
				acknowledge_by: {
					type: mongoose.Schema.Types.ObjectId,
					required: false,
				},
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	acknowledge_by_parent: {
		type: [
			{
				acknowledge_by_parent: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parent',
					required: true,
				},
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	acknowledge_by_teacher: {
		type: [
			{
				acknowledge_by_teacher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'teacher',
					required: true,
				},
				submitted_date: {
					type: Date,
					default: Date.now,
				},
			},
		],
		default: [],
	},
	acknowledge_started_by: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
				required: true,
			},
		],
		default: [],
	},
	comment: {
		type: [
			{
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				reply_teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				reply_teacher_name: {
					type: String,
				},
				student_profile: {
					type: String,
				},
				student_name: {
					type: String,
				},
				teacher_profile: {
					type: String,
				},
				teacher_name: {
					type: String,
				},
				text: {
					type: String,
				},
				comment_date: {
					type: Date,
					default: Date.now,
				},
				doubt_status: {
					type: String,
					default: 'uncleared',
				},
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
	repository: [
		{
			id: String,
			repository_type: String,
			branch: String,
			class_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Class',
				default: null,
			},
			school_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'School',
				default: null,
			},
		},
	],
	activity_status: {
		type: String,
		default: 'none',
	},
	forwarded_teacher_id: {
		type: Array, // mongoose.Schema.Types.ObjectId,
		ref: 'User',
	},
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
