const { ObjectId } = require('mongoose').Types;

const activityProjection = function (userId) {
	return {
		__v: 1,
		file: 1,
		forward: 1,
		like_by: 1,
		archive_status: 1,
		assignment_started: 1,
		acknowledge_started_by: 1,
		createdAt: 1,
		updatedAt: 1,
		repository: 1,
		activity_type: 1,
		dueDate: 1,
		status: 1,
		teacher_id: 1,
		title: 1,
		view: 1,
		like: 1,
		description: 1,
		publish_date: 1,
		learning_Outcome: 1,
		coin: 1,
		options: 1,
		subject: 1,
		StartTime: 1,
		EndTime: 1,
		startDate: 1,
		EndDate: 1,
		assignTo: {
			$filter: {
				input: '$assignTo',
				as: 'item',
				cond: { $eq: ['$$item.student_id', userId] },
			},
		},
		assignTo_you: {
			$filter: {
				input: '$assignTo_you',
				as: 'item',
				cond: { $eq: ['$$item.teacher_id', userId] },
			},
		},
		assignTo_parent: {
			$filter: {
				input: '$assignTo_parent',
				as: 'item',
				cond: { $eq: ['$$item.parent_id', userId] },
			},
		},
		going: {
			$filter: {
				input: '$going',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		not_going: {
			$filter: {
				input: '$not_going',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		going_by_parent: {
			$filter: {
				input: '$going_by_parent',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		not_going_by_parent: {
			$filter: {
				input: '$not_going_by_parent',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		going_by_teacher: {
			$filter: {
				input: '$going_by_teacher',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		not_going_by_teacher: {
			$filter: {
				input: '$not_going_by_teacher',
				as: 'item',
				cond: { $eq: ['$$item', userId] },
			},
		},
		acknowledge_by: {
			$filter: {
				input: '$acknowledge_by',
				as: 'item',
				cond: { $eq: ['$$item.acknowledge_by', userId] },
			},
		},
		acknowledge_by_parent: {
			$filter: {
				input: '$acknowledge_by_parent',
				as: 'item',
				cond: { $eq: ['$$item.acknowledge_by_parent', userId] },
			},
		},
		acknowledge_by_teacher: {
			$filter: {
				input: '$acknowledge_by_teacher',
				as: 'item',
				cond: { $eq: ['$$item.acknowledge_by_teacher', userId] },
			},
		},
		selected_checkList: {
			$filter: {
				input: '$selected_checkList',
				as: 'item',
				cond: { $eq: ['$$item.selected_by', userId] },
			},
		},
		selected_livepool: {
			$filter: {
				input: '$selected_livepool',
				as: 'item',
				cond: { $eq: ['$$item.selected_by', userId] },
			},
		},
		submited_by: {
			$filter: {
				input: '$submited_by',
				as: 'item',
				cond: { $eq: ['$$item.student_id', userId] },
			},
		},
		comment: {
			$filter: {
				input: '$comment',
				as: 'item',
				cond: {
					$or: [
						{ $eq: ['$$item.student_id', userId] },
						{ $ifNull: ['$$item.student_id', true] },
					],
				},
			},
		},
	};
};
const assignmentProjection = function (studId) {
	return {
		_id: 1,
		title: 1,
		file: 1,
		description: 1,
		isOffline: 1,
		teacher_id: 1,
		isGroup: 1,
		subject: 1,
		school_id: 1,
		class_id: 1,
		group_id: 1,
		status: 1,
		startDate: 1,
		EndDate: 1,
		coin: 1,
		learning_Outcome: 1,
		assignTo: {
			$filter: {
				input: '$assignTo',
				as: 'item',
				cond: { $eq: ['$$item.student_id', ObjectId(studId)] },
			},
		},
		updatedAt: 1,
		createdAt: 1,
	};
};

module.exports = {
	activityProjection,
	assignmentProjection,
};
