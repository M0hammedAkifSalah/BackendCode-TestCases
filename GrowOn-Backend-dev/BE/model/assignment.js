/* eslint-disable no-case-declarations */
const { model, Schema } = require('mongoose');

function getReportData(assignTo) {
	let totalEvaluated = 0;
	const totalAssignedTo = assignTo.length;

	const reportObj = assignTo.reduce((acc, nxt) => {
		if (!nxt.section_id) {
			return acc;
		}

		const { status, isAbleTo: ableTo, attachments, section_id } = nxt;

		if (!acc[section_id]) {
			acc[section_id] = {
				totalAssignedTo: 0,
				evaluated: 0,
				isAbleTo: 0,
				isNotAbleTo: 0,
				lateSubmitted: 0,
				reassigned: 0,
				submitted: 0,
				notSubmitted: 0,
			};
		}

		switch (status) {
			case 'LATE_SUBMITTED':
				acc[section_id].lateSubmitted += 1;
				acc[section_id].totalAssignedTo += 1;
				break;
			case 'NOT_SUBMITTED':
				acc[section_id].notSubmitted += 1;
				acc[section_id].totalAssignedTo += 1;
				break;
			case 'SUBMITTED':
				acc[section_id].submitted += 1;
				acc[section_id].totalAssignedTo += 1;
				break;
			case 'REASSIGNED':
				acc[section_id].reassigned += 1;
				acc[section_id].totalAssignedTo += 1;
				break;
			case 'EVALUATED':
				acc[section_id].totalAssignedTo += 1;
				totalEvaluated += 1;
				const Index = attachments.length - 1;
				const { submissionStatus } = attachments[Index];
				if (submissionStatus) {
					switch (submissionStatus) {
						case 'LATE_SUBMITTED':
							acc[section_id].evaluated += 1;
							acc[section_id].lateSubmitted += 1;
							break;
						case 'NOT_SUBMITTED':
							acc[section_id].notSubmitted += 1;
							break;
						case 'SUBMITTED':
							acc[section_id].evaluated += 1;
							acc[section_id].submitted += 1;
							break;
						default:
							break;
					}
				}
				if (ableTo == true) {
					acc[section_id].isAbleTo += 1;
				} else {
					acc[section_id].isNotAbleTo += 1;
				}
				break;
			default:
				break;
		}

		return acc;
	}, {});

	return {
		reportObj,
		totalEvaluated,
		totalAssignedTo,
	};
}

const assignToSchema = new Schema({
	attachments: {
		type: [
			{
				file: {
					type: Array,
					required: false,
				},
				isStudent: {
					type: Boolean,
					required: false,
					default: false,
				},
				status: {
					type: String,
					required: false,
					enum: ['SUBMITTED', 'LATE_SUBMITTED', 'REASSIGNED', 'EVALUATED'],
				},
				submissionStatus: {
					type: String,
					required: false,
					enum: ['SUBMITTED', 'LATE_SUBMITTED', 'NOT_SUBMITTED'],
				},
				uploadedAt: {
					type: Date,
					required: false,
					default: Date.now(),
				},
				text: {
					type: String,
					required: false,
				},
				lateReason: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
	coins: {
		type: Number,
		required: false,
	},
	status: {
		type: String,
		required: false,
		default: 'NOT_SUBMITTED',
		enum: [
			'EVALUATED',
			'NOT_SUBMITTED',
			'SUBMITTED',
			'REASSIGNED',
			'LATE_SUBMITTED',
		],
	},
	isAbleTo: {
		type: Boolean,
		required: false,
		default: false,
	},
	student_id: {
		type: Schema.Types.ObjectId,
		ref: 'Student',
	},
	section_id: {
		type: Schema.Types.ObjectId,
		ref: 'Section',
	},
	viewed: {
		type: Boolean,
		required: false,
		default: false,
	},
	comment: {
		type: String,
		required: false,
	},
	isOffline: {
		type: Boolean,
		required: false,
		default: true,
	},
});

const assignmentSchema = new Schema(
	{
		_id: Schema.Types.ObjectId,
		title: {
			type: String,
			required: [true, 'Assigement Title Required'],
		},
		sub_title: {
			type: String,
			required: false,
		},
		subject: {
			type: String,
			required: false,
		},
		file: {
			type: Array,
			required: false,
		},
		learning_Outcome: {
			type: String,
			required: false,
		},
		coin: {
			type: Number,
			required: true,
		},
		image: {
			type: String,
			required: false,
		},
		startDate: {
			type: Date,
			default: Date.now,
			required: false,
		},
		EndDate: {
			type: Date,
			required: true,
		},
		teacher_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		description: {
			type: String,
			required: false,
		},
		status: {
			type: String,
			required: false,
			default: 'PENDING',
			enum: ['EVALUATED', 'PENDING'],
		},
		school_id: {
			type: Schema.Types.ObjectId,
			ref: 'School',
		},
		class_id: {
			type: Schema.Types.ObjectId,
			ref: 'Class',
		},
		group_id: {
			type: Schema.Types.ObjectId,
			ref: 'Group',
		},
		isGroup: {
			type: Boolean,
			required: false,
			default: false,
		},

		assignTo: [assignToSchema],
		doubts_id: {
			type: Schema.Types.ObjectId,
			ref: 'AssignmentDoubt',
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		report: {
			type: Object,
			required: false,
			default: {},
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

// calculate reports & comments
assignmentSchema.pre('save', async function (next) {
	const { assignTo = [] } = this;
	if (assignTo.length) {
		const { totalAssignedTo, totalEvaluated, reportObj } =
			getReportData(assignTo);
		this.status = totalAssignedTo === totalEvaluated ? 'EVALUATED' : 'PENDING';
		this.report = reportObj;
	}

	next();
});

assignmentSchema.index({
	title: 'text',
	sub_title: 'text',
	subject: 'text',
	description: 'text',
});

const Assignment = model('Assignment', assignmentSchema);

module.exports = Assignment;
