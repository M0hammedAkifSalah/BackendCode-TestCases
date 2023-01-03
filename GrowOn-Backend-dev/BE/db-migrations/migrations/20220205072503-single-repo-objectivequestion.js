const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const objectiveQuestions = await db
			.collection('objectivequestions')
			.find({})
			.toArray();

		const operations = objectiveQuestions.map(qu => {
			const classId =
				qu.class && qu.class.length > 2 ? ToObjectId(qu.class) : null;

			// board
			const board = [];
			if (Array.isArray(qu.board) && qu.board !== null && qu.board.length > 0) {
				qu.board.forEach(id => {
					if (id.length > 2) {
						board.push(ToObjectId(id));
					}
				});
			}

			// syllabus
			const syllabus = [];
			if (
				Array.isArray(qu.syllabus) &&
				qu.syllabus !== null &&
				qu.syllabus.length > 0
			) {
				qu.syllabus.forEach(id => {
					if (id.length > 2) {
						syllabus.push(ToObjectId(id));
					}
				});
			}

			const subject =
				qu.subject && qu.subject.length > 2 ? ToObjectId(qu.subject) : null;

			// chapter
			const chapter = [];
			if (qu.chapter && qu.chapter !== null && qu.chapter.length > 2) {
				chapter.push(ToObjectId(qu.chapter));
			}

			// topic
			const topic = [];
			if (qu.topic && qu.topic !== null && qu.topic.length > 2) {
				topic.push(ToObjectId(qu.topic));
			}

			// learningOutcome
			const learningOutcome = [];
			if (
				qu.learningOutcome &&
				qu.learningOutcome !== null &&
				qu.learningOutcome.length > 2
			) {
				learningOutcome.push(ToObjectId(qu.learningOutcome));
			}

			// questionCategory
			const questionCategory = [];
			if (
				qu.questionCategory &&
				qu.questionCategory !== null &&
				qu.questionCategory.length > 2
			) {
				questionCategory.push(ToObjectId(qu.questionCategory));
			}

			// examType
			const examType = [];
			if (
				Array.isArray(qu.examType) &&
				qu.examType !== null &&
				qu.examType.length > 0
			) {
				qu.examType.forEach(id => {
					if (id.length > 2) {
						examType.push(ToObjectId(id));
					}
				});
			}

			return db.collection('objectivequestions').updateOne(
				{ _id: qu._id },
				{
					$set: {
						class: classId,
						board,
						syllabus,
						subject,
						chapter,
						topic,
						learningOutcome,
						questionCategory,
						examType,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
