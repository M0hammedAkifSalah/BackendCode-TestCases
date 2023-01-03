/* eslint-disable no-param-reassign */
const { ObjectId } = require('mongoose').Types;

module.exports = assignment => {
	if (!assignment) {
		return new Error('Assignment is required');
	}

	// Initialistions
	const { section_id, class_id } = assignment._id;
	const {
		totalAssignments,
		totalAssignedTo,
		notSubmitted,
		Submitted,
		totalEvaluated,
		reassigned,
		lateSubmitted,
		isAbleTo,
		doubts = [],
	} = assignment;

	// filter for doubts count
	let totalDoubts = 0;
	let totalClearedDoubts = 0;
	doubts.forEach(obj => {
		totalDoubts += obj.total;
		totalClearedDoubts += obj.cleared;
	});
	// Section object
	const sectionReport = {
		section_id: ObjectId(section_id),
		class_id,
		totalAssignment: totalAssignments.length,
		totalAssigned: totalAssignedTo,
		evaluated: totalEvaluated,
		notSubmitted,
		lateSubmitted,
		submitted: Submitted,
		reassigned,
		isAbleTo,
		totalDoubts,
		totalClearedDoubts,
	};
	return { sectionReport };
};
