/* eslint-disable no-case-declarations */
module.exports = {
	async up(db) {
		const assignments = await db.collection('assignments').find({}).toArray();

		const operations = assignments.map(assignment => {
			const { assignTo, _id } = assignment;
			const report = assignTo.reduce((acc, nxt) => {
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
			return db.collection('assignments').updateOne(
				{ _id },
				{
					$set: {
						report,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down(db) {
		return Promise.all('ok');
	},
};
