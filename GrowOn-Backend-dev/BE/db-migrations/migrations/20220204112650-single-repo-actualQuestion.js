const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const actualQuestions = await db
			.collection('actualquestions')
			.find({})
			.toArray();
		const classes = await db.collection('classes').find({}).toArray();

		const operations = actualQuestions.map(async aq => {
			const { detail_question_paper: dqp } = aq;

			const chapters = [];
			if (
				dqp.chapters &&
				Array.isArray(dqp.chapters) &&
				dqp.chapters.length > 0
			) {
				dqp.chapters.forEach(({ chapter }) => {
					if (typeof chapter === 'string' && chapter.length > 2) {
						chapters.push(...chapter.split(' '));
					}
				});
			}
			chapters.forEach(id => {
				if (id.length > 2) {
					chapters.push(ToObjectId(id));
				}
			});

			let classId = dqp.class;
			classes.forEach(cl => {
				if (cl.name === dqp.class) {
					classId = cl._id;
				}
			});

			const subject = [];
			if (dqp.subject && Array.isArray(dqp.subject) && dqp.subject.length > 0) {
				dqp.subject.forEach(id => {
					if (id.length > 2) {
						subject.push(ToObjectId(id));
					}
				});
			}

			const syllabus = [];
			if (
				dqp.syllabus &&
				Array.isArray(dqp.syllabus) &&
				dqp.syllabus.length > 0
			) {
				dqp.syllabus.forEach(id => {
					if (id.length > 2) {
						syllabus.push(ToObjectId(id));
					}
				});
			}

			let topic = [];
			if (
				dqp.chapters &&
				Array.isArray(dqp.chapters) &&
				dqp.chapters.length > 0
			) {
				dqp.chapters.forEach(({ topics }) => {
					if (Array.isArray(topics) && topics.length > 0) {
						topics.forEach(id => {
							if (id.length > 2) {
								topic.push(id);
							}
						});
					}
				});
			}
			if (dqp.topic && Array.isArray(dqp.topic) && dqp.topic.length > 0) {
				dqp.topic.forEach(id => {
					if (id > 2) {
						topic.push(id);
					}
				});
			}
			topic = topic.map(id => ToObjectId(id));

			const examType = [];
			if (
				dqp.examType &&
				Array.isArray(dqp.examType) &&
				dqp.examType.length > 0
			) {
				dqp.examType.forEach(id => {
					if (id.length > 2) {
						examType.push(ToObjectId(id));
					}
				});
			}

			const learningOutcome = [];
			if (
				dqp.learningOutcome &&
				Array.isArray(dqp.learningOutcome) &&
				dqp.learningOutcome.length > 0
			) {
				dqp.learningOutcome.forEach(id => {
					if (id.length > 2) {
						learningOutcome.push(ToObjectId(id));
					}
				});
			}

			const questionCategory = [];
			if (
				dqp.questionCategory &&
				Array.isArray(dqp.questionCategory) &&
				dqp.questionCategory.length > 0
			) {
				dqp.questionCategory.forEach(id => {
					if (id.length > 2) {
						questionCategory.push(ToObjectId(id));
					}
				});
			}

			return db.collection('actualquestions').updateOne(
				{ _id: aq._id },
				{
					$set: {
						AssignDate: new Date(aq.AssignDate),
						dueDate: new Date(aq.dueDate),
						startDate: new Date(aq.startDate),
						'detail_question_paper.board': [],
						'detail_question_paper.chapters': chapters,
						'detail_question_paper.class': classId,
						'detail_question_paper.subject': subject,
						'detail_question_paper.syllabus': syllabus,
						'detail_question_paper.topic': topic,
						'detail_question_paper.examType': examType,
						'detail_question_paper.learningOutcome': learningOutcome,
						'detail_question_paper.questionCategory': questionCategory,
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
