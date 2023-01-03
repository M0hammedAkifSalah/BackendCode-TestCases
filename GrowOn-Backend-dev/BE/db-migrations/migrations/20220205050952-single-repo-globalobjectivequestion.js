const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const globalObjectiveQuestions = await db
			.collection('globalobjectivequestions')
			.find({})
			.toArray();

		const operations = globalObjectiveQuestions.map(qu => {
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
			if (
				Array.isArray(qu.chapter) &&
				qu.chapter !== null &&
				qu.chapter.length > 0
			) {
				qu.chapter.forEach(id => {
					if (id.length > 2) {
						chapter.push(ToObjectId(id));
					}
				});
			}

			// topic
			const topic = [];
			if (Array.isArray(qu.topic) && qu.topic !== null && qu.topic.length > 0) {
				qu.topic.forEach(id => {
					if (id.length > 2) {
						topic.push(ToObjectId(id));
					}
				});
			}

			// learningOutcome
			const learningOutcome = [];
			if (
				Array.isArray(qu.learningOutcome) &&
				qu.learningOutcome !== null &&
				qu.learningOutcome.length > 0
			) {
				qu.learningOutcome.forEach(id => {
					if (id.length > 2) {
						learningOutcome.push(ToObjectId(id));
					}
				});
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

			return db.collection('globalobjectivequestions').updateOne(
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
