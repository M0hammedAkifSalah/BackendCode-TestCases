/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
const mongoose = require('mongoose');
const split = require('split-object');
const striptags = require('striptags');
const actualQuestionModel = require('../model/actualQuestions');
const chaptersModel = require('../model/chapter');

const APIFeatures = require('../utils/apiFeatures');
const rewardModel = require('../model/reward');
const userModel = require('../model/user');
const topicModel = require('../model/topic');
const subjectModel = require('../model/subject');
const classModel = require('../model/class');
const schoolModel = require('../model/school');
const questionTypeModel = require('../model/questionType');
const examTypeModel = require('../model/examType');
const boardModel = require('../model/board');
const syllabuseModel = require('../model/syllabus');
const AnswerModel = require('../model/question_answer');

const learnOutcomeModel = require('../model/learnOutcome');

const studentDetailsFunction = async (parameters, stripQuestions) => {
	const features = new APIFeatures(
		actualQuestionModel
			.find({})
			.populate('user_id', '_id name profile_image')
			.populate('detail_question_paper.subject', '_id name')
			.populate('detail_question_paper.board', '_id name')
			.populate('detail_question_paper.chapters', '_id name')
			.populate('detail_question_paper.topic', '_id name')
			.populate('detail_question_paper.syllabus', '_id name')
			.populate('detail_question_paper.class', '_id name')
			.populate('detail_question_paper.examType', '_id name')
			.populate('detail_question_paper.learningOutcome', '_id name')
			.populate('detail_question_paper.questionCategory', '_id name')
			.select(' -createdAt -updatedAt -__v'),
		parameters
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const question = await features.query;
	const resposeArray = [];
	const responeData = JSON.parse(JSON.stringify(question));
	for (const element of responeData) {
		if (element.class_id) {
			let className;
			if (element.class_id.length == 24) {
				className = await classModel
					.findById(element.class_id)
					.select('-repository -state_id');
				if (className) {
					element.className = className.name;
				}
			}
		}
		if (element.school_id) {
			let schoolName;
			if (element.school_id.length == 24) {
				schoolName = await schoolModel
					.findById(element.school_id)
					.select('-repository -state_id');
				if (schoolName) {
					element.schoolName = schoolName.schoolName;
				}
			}
		}
		if (element.user_id) {
			let obj = [];
			const userData = await userModel.findById(element.user_id);
			obj = {
				teacherId: userData._id,
				name: userData.name,
				profileImage: userData.profile_image,
			};
			element.user_id = obj;
		}
	}

	if (stripQuestions) {
		responeData.forEach(element => {
			element = element.section.forEach(element => {
				element = element.question_list.forEach(element => {
					// element.question[0] = striptags(element.question[0]);
					if (element.answer[0]) {
						if (element.answer[0].value == null) {
							element.answer[0].value = '';
						}
						// element.answer[0].value = striptags(element.answer[0].value);
					}
					// if (element.reason) {
					// 	// element.reason = striptags(element.reason);
					// }
					// element = element.options.forEach(element => {
					// 	element.value = striptags(element.value);
					// });
				});
			});
		});
	}
	return responeData;
};

const studentDetailsFunctionId = async (req, stripQuestions) => {
	const features = new APIFeatures(
		actualQuestionModel
			.find({})
			.populate('user_id', '_id name profile_image')
			.populate('detail_question_paper.subject', '_id name')
			.populate('detail_question_paper.board', '_id name')
			.populate('detail_question_paper.chapters', '_id name')
			.populate('detail_question_paper.topic', '_id name')
			.populate('detail_question_paper.syllabus', '_id name')
			.populate('detail_question_paper.class', '_id name')
			.populate('detail_question_paper.examType', '_id name')
			.populate('detail_question_paper.learningOutcome', '_id name')
			.populate('detail_question_paper.questionCategory', '_id name')
			.select(' -createdAt -updatedAt -__v'),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const question = await features.query;
	const resposeArray = [];
	const responeData = JSON.parse(JSON.stringify(question));
	for (const element of responeData) {
		resposeArray.push(element);
	}

	responeData.forEach(element => {
		element = element.section.forEach(element => {
			element = element.question_list.forEach(element => {
				element.question[0] = striptags(element.question[0]);
				// console.log(element.question[0]);
				if (element.answer[0] && !element.answer[0].value) {
					element.answer[0] = { value: element.answer[0] };
				}
				if (element.answer[0]) {
					// console.log(element.answer[0]);
					if (element.answer[0].value.value == null) {
						element.answer[0].value.value = '';
					}
					element.answer[0].value = striptags(element.answer[0].value.value);
				}
				if (element.reason) {
					element.reason = striptags(element.reason);
				}
				element = element.options.forEach(element => {
					if (element) element.value = striptags(element.value);
				});
			});
		});
	});
	return resposeArray;
};

exports.GetAllMObile = async (req, res) => {
	try {
		const features = new APIFeatures(
			actualQuestionModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		res.json({
			status: 201,
			result: question.length,
			data: question,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.pendingCount = async (req, res, next) => {
	try {
		let pendingcount = 0;
		let completecount = 0;

		const features = new APIFeatures(
			actualQuestionModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.select(' -createdAt -updatedAt -__v'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		for (const ele of question) {
			for (const ele2 of ele.assignTo) {
				if (ele2.student_id == req.body['assignTo.student_id']) {
					if (ele2.status == 'Pending') {
						pendingcount += 1;
					} else {
						completecount += 1;
					}
				}
			}
		}
		const total = completecount + pendingcount;

		res.json({
			Test: {
				completed: completecount,
				total,
				average: total == 0 ? 0 : (completecount / total) * 100,
				pending: pendingcount,
			},
		});
	} catch (error) {
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};
exports.getRank = async (req, res, next) => {
	try {
		const answerSheet = await AnswerModel.find({
			question_id: req.body.question_id,
		});
		const responseData = {};
		if (answerSheet) {
			const totalMarks = answerSheet.reduce((a, b) => a + b.totalMarks, 0);
			responseData.avarage = totalMarks / answerSheet.length;
			const sorted = answerSheet
				.slice()
				.sort((a, b) => b.totalMarks - a.totalMarks);
			const indexOfStudent = answerSheet.findIndex(
				item => item.student_details.student_id == req.body.student_id
			);
			responseData.rank = sorted.indexOf(answerSheet[indexOfStudent]) + 1;
			responseData.topper_marks = sorted[0].totalMarks;
			responseData.total_student = answerSheet.length;
		}

		res.json({
			status: 200,
			detail: responseData,
		});
	} catch (error) {
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};
exports.TestAvailableSubject = async (req, res, next) => {
	try {
		const responeData = await studentDetailsFunctionId(req);

		res.json({
			status: 200,
			detail: responeData,
		});
	} catch (error) {
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};

exports.TestAvailable = async (req, res, next) => {
	try {
		const responeData = await studentDetailsFunction(req.body, true);

		res.json({
			status: 200,
			detail: responeData,
		});
	} catch (error) {
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};

exports.getTestSubject = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			actualQuestionModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.select(' -createdAt -updatedAt -__v'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		let subjects = question.map(x => x.detail_question_paper.subject);
		// eslint-disable-next-line prefer-spread
		if (subjects) subjects = [].concat.apply([], subjects);
		// subjects = subjects.flat(1);
		const result = subjects.reduce((unique, o) => {
			if (!unique.some(obj => obj._id == o._id)) unique.push(o);
			return unique;
		}, []);
		res.json({
			status: 200,
			detail: result,
		});
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 400,
			message: error.message,
		});
	}
};

exports.BeginTest = async (req, res) => {
	try {
		const features = new APIFeatures(
			actualQuestionModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.select(
					'-repository  -detail_question_paper -createdAt -updatedAt -award'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		question.forEach(element => {
			element = element.section.forEach(element => {
				element = element.question_list.forEach(element => {
					if (element.answer[0]) {
						if (element.answer[0].value == null) {
							element.answer[0].value = '';
						}
						// element.answer[0].value = striptags(element.answer[0].value);
					}
					// if (element.reason) {
					// 	element.reason = striptags(element.reason);
					// }
					// element = element.options.forEach(element => {
					// 	element.value = striptags(element.value);
					// });
				});
			});
		});
		res.json({
			status: 201,
			detail: question,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.TestDetails = async (req, res) => {
	try {
		const responeData = await studentDetailsFunction(req.body, true);
		res.json({
			status: 201,
			detail: responeData,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.GetById = async (req, res) => {
	try {
		const data = await actualQuestionModel
			.findById(req.params.id)
			.populate('user_id', '_id name profile_image')
			.populate('detail_question_paper.subject', '_id name')
			.populate('detail_question_paper.board', '_id name')
			.populate('detail_question_paper.chapters', '_id name')
			.populate('detail_question_paper.topic', '_id name')
			.populate('detail_question_paper.syllabus', '_id name')
			.populate('detail_question_paper.class', '_id name')
			.populate('detail_question_paper.examType', '_id name')
			.populate('detail_question_paper.learningOutcome', '_id name')
			.populate('detail_question_paper.questionCategory', '_id name');
		if (data.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			res.status(200).json({
				status: 200,
				data,
			});
		}
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};
