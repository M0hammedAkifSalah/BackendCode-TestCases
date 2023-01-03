/* eslint-disable new-cap */
const mongoose = require('mongoose');
const split = require('split-object');
const questionPaperModel = require('../model/actualQuestions');
const AnswerModel = require('../model/question_answer');
const APIFeatures = require('../utils/apiFeatures');
const boardModel = require('../model/board');
const classModel = require('../model/class');
const syllabuseModel = require('../model/syllabus');
const chaptersModel = require('../model/chapter');
const topicModel = require('../model/topic');
const subjectModel = require('../model/subject');
const examTypeModel = require('../model/examType');
const Section = require('../model/section');
const Student = require('../model/student');
const schoolModel = require('../model/school');
const questionTypeModel = require('../model/questionType');
const learnOutcomeModel = require('../model/learnOutcome');
const objectiveQuestionModel = require('../model/objectiveQuestion');
const Class = require('../model/class');
const User = require('../model/user');
const firebaseNoti = require('../firebase');
const catchAsync = require('../utils/catchAsync');
require('dotenv').config();
// var striptags = require('striptags');

const add = (old, newdata) => {
	const obj = {
		status: old.status,
		_id: old._id,
		student_id: old.student_id,
		class_id: old.class_id,
		section_id: old.section_id,
		answerByStudent: newdata,
	};
	return obj;
};

exports.GetAll = catchAsync(async (req, res) => {
	const features = new APIFeatures(
		questionPaperModel
			.find({})
			.populate('class_id', '_id name')
			.select('_id question_title class_id createdBy')
			.lean(),
		req.query
	)
		.filter()
		.sort()
		.paginate();
	const questions = await features.query;

	res.json({
		status: 200,
		result: questions ? questions.length : 0,
		data: questions,
	});
});

exports.getAllQuestions = async (req, res) => {
	try {
		const features = new APIFeatures(
			questionPaperModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('assignTo.student_id', '_id name profile_image')
				.populate('assignTo.class_id', '_id name')
				.populate('assignTo.section_id', '_id name')
				.populate('class_id school_id', 'name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		const responeData1 = JSON.parse(JSON.stringify(question));
		for (const element of responeData1) {
			if (element.assignTo && element.assignTo.length) {
				if (element.assignTo[0].status != 'Pending') {
					await AnswerModel.find(
						{ 'student_details.teacher_id': element.user_id },
						(err, result) => {
							if (result && result.length)
								element.assignTo[0] = {
									...element.assignTo[0],
									...{
										answerByStudent:
											result[0].answer_details[0].answerByStudent,
									},
								};
						}
					);
				}
			}
		}

		res.json({
			status: 201,
			result: responeData1 && responeData1 ? responeData1.length : 0,
			data: responeData1,
		});
	} catch (error) {
		console.log('err', error);
		res.json({
			status: 400,
			message: error.message,
		});
	}
};
exports.filter = async (req, res) => {
	try {
		const features = new APIFeatures(
			questionPaperModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('assignTo.student_id', '_id name profile_image')
				.populate('assignTo.class_id', '_id name')
				.populate('assignTo.section_id', '_id name')
				.populate('class_id school_id', 'name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		const responeData1 = JSON.parse(JSON.stringify(question));
		for (const element of responeData1) {
			if (element.assignTo && element.assignTo.length) {
				if (element.assignTo[0].status != 'Pending') {
					await AnswerModel.find(
						{ 'student_details.teacher_id': element.user_id },
						(err, result) => {
							if (result && result.length)
								element.assignTo[0] = {
									...element.assignTo[0],
									...{
										answerByStudent:
											result[0].answer_details[0].answerByStudent,
									},
								};
						}
					);
				}
			}
		}

		res.json({
			status: 201,
			result: responeData1 && responeData1 ? responeData1.length : 0,
			data: responeData1,
		});
	} catch (error) {
		console.log('err', error);
		res.json({
			status: 400,
			message: error,
		});
	}
};

const addNameAndImage = (old, newdata) => {
	const obj = {
		status: old.status,
		_id: old._id,
		student_id: old.student_id ? old.student_id._id : null,
		answerByStudent: old.answerByStudent,
	};

	if (newdata) {
		obj.name = newdata.name || '';
		obj.profile_image = newdata.profile_image || '';
	}

	return obj;
};

exports.GetAllData = async (req, res) => {
	try {
		const features = new APIFeatures(
			questionPaperModel
				.find({})
				.populate('user_id', '_id name profile_image')
				.populate('assignTo.student_id', '_id name profile_image')
				.populate('assignTo.class_id', '_id name')
				.populate('assignTo.section_id', '_id name')
				.populate('class_id school_id', 'name')
				.populate('detail_question_paper.chapters', '_id name')
				.populate('detail_question_paper.subject', '_id name')
				.populate('detail_question_paper.topic', '_id name')
				.populate('detail_question_paper.board', '_id name')
				.populate('detail_question_paper.class', '_id name')
				.populate('detail_question_paper.syllabus', '_id name')
				.populate('detail_question_paper.examType', '_id name')
				.populate('detail_question_paper.questionCategory', '_id name')
				.populate('detail_question_paper.learningOutcome', '_id name'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const question = await features.query;
		const responeData1 = JSON.parse(JSON.stringify(question));
		for (const element of responeData1) {
			if (element.assignTo && element.assignTo.length) {
				let i = 0;
				for (const ele of element.assignTo) {
					if (ele.status != 'Pending') {
						await AnswerModel.find(
							{ 'student_details.teacher_id': element.user_id },
							// eslint-disable-next-line no-loop-func
							async (err, result) => {
								if (result && result.length)
									element.assignTo[i] = {
										...element.assignTo[i],
										...{
											answerByStudent:
												result[0].answer_details[0].answerByStudent,
										},
									};
							}
						);
					}

					const sectionData = element.assignTo[i].section_id;
					const classData = element.assignTo[i].class_id;
					element.assignTo[i] = addNameAndImage(
						element.assignTo[i],
						element.assignTo[i].student_id
					);
					element.assignTo[i].section_id = sectionData
						? sectionData._id
						: 'No section';
					element.assignTo[i].sectionName = sectionData
						? sectionData.name
						: 'No section name';
					element.assignTo[i].class_id = classData ? classData._id : 'No class';
					element.assignTo[i].className = classData
						? classData.name
						: 'No class name';
					i += 1;
				}
			}

			if (element.section && element.section.length) {
				for (const sec of element.section) {
					if (sec.question_list && sec.question_list.length) {
						// eslint-disable-next-line no-shadow
						for (const question of sec.question_list) {
							if (!question.difficultyLevel) {
								const objectiveQuestionData = await objectiveQuestionModel
									.findById(question._id)
									.populate('questions');
								if (objectiveQuestionData) {
									question.difficultyLevel =
										objectiveQuestionData.difficultyLevel;
								}
							}
						}
					}
				}
			}
		}
		// console.log('responeData1', responeData1);
		res.json({
			status: 201,
			result: responeData1.length,
			data: responeData1,
		});
	} catch (error) {
		console.log(error);
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.GetAllData1 = catchAsync(async (req, res) => {
	const features = new APIFeatures(
		questionPaperModel
			.find({})
			.populate('user_id', '_id name profile_image')
			.populate('assignTo.student_id', '_id name profile_image')
			.populate('assignTo.class_id', '_id name')
			.populate('assignTo.section_id', '_id name')
			.populate('class_id school_id', 'name')
			.populate('detail_question_paper.chapters', '_id name')
			.populate('detail_question_paper.subject', '_id name')
			.populate('detail_question_paper.topic', '_id name')
			.populate('detail_question_paper.board', '_id name')
			.populate('detail_question_paper.class', '_id name')
			.populate('detail_question_paper.syllabus', '_id name')
			.populate('detail_question_paper.examType', '_id name')
			.populate('detail_question_paper.questionCategory', '_id name')
			.populate('detail_question_paper.learningOutcome', '_id name')
			.lean(),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	const questions = await features.query;

	for (const element of questions) {
		if (element.assignTo && element.assignTo.length) {
			for (let std of element.assignTo) {
				// const ele = element.assignTo[i];
				if (std.status != 'Pending') {
					await AnswerModel.findOne(
						{ 'student_details.teacher_id': element.user_id },
						(err, result) => {
							if (result)
								std = {
									...std,
									...{
										answerByStudent: result.answer_details[0].answerByStudent,
									},
								};
						}
					);
				}

				const sectionData = std.section_id;
				const classData = std.class_id;
				std = addNameAndImage(std, std.student_id);
				std.section_id = sectionData ? sectionData._id : 'No section';
				std.sectionName = sectionData ? sectionData.name : 'No section name';
				std.class_id = classData ? classData._id : 'No class';
				std.className = classData ? classData.name : 'No class name';
			}
		}
		if (element.section && element.section.length) {
			for (const sec of element.section) {
				if (sec.question_list && sec.question_list.length) {
					// eslint-disable-next-line no-shadow
					for (const question of sec.question_list) {
						if (!question.difficultyLevel) {
							const objectiveQuestionData = await objectiveQuestionModel
								.findById(question._id)
								.populate('questions');
							if (objectiveQuestionData) {
								question.difficultyLevel =
									objectiveQuestionData.difficultyLevel;
							}
						}
					}
				}
			}
		}
	}
	res.json({
		status: 201,
		result: questions.length,
		data: questions,
	});
});

exports.GetById = async (req, res) => {
	try {
		const data = await questionPaperModel
			.findById(req.params.id)
			.populate('user_id', '_id name profile_image')
			.populate('assignTo.student_id', '_id name profile_image')
			.populate('assignTo.class_id', '_id name')
			.populate('assignTo.section_id', '_id name')
			.populate('class_id school_id', 'name')
			.populate('detail_question_paper.chapters', '_id name')
			.populate('detail_question_paper.subject', '_id name')
			.populate('detail_question_paper.topic', '_id name')
			.populate('detail_question_paper.board', '_id name')
			.populate('detail_question_paper.class', '_id name')
			.populate('detail_question_paper.syllabus', '_id name')
			.populate('detail_question_paper.examType', '_id name')
			.populate('detail_question_paper.questionCategory', '_id name')
			.populate('detail_question_paper.learningOutcome', '_id name');
		if (data.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			const responeData1 = JSON.parse(JSON.stringify([data]));
			for (const element of responeData1) {
				if (element.assignTo) {
					if (element.assignTo.length) {
						if (data.assignTo[0].status != 'Pending') {
							await AnswerModel.find(
								{ 'student_details.teacher_id': data.user_id },
								(err, result) => {
									if (result && result.length)
										data.assignTo[0] = {
											...data.assignTo[0],
											...{
												answerByStudent:
													result[0].answer_details[0].answerByStudent,
											},
										};
								}
							);
						}
					}
				}
				if (!element.autoGeneratedQuestionCount)
					element.autoGeneratedQuestionCount = {};
			}
			res.status(200).json({
				status: 200,
				data: responeData1,
			});
		}
	} catch (error) {
		console.log(error);
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Create = async (req, res) => {
	try {
		questionPaperModel
			.find({
				question_title: req.body.question_title,
			})
			.exec()
			.then(question_title => {
				if (question_title.length >= 1000) {
					return res.status(802).json({
						error: 'Already Exist',
						status: 802,
					});
				}
				const questionPaper = new questionPaperModel({
					_id: new mongoose.Types.ObjectId(),
					question_title: req.body.question_title,
					class_id: req.body.class_id,
					coin: req.body.coin,
					award: req.body.award,
					dueDate: req.body.dueDate,
					duration: req.body.duration,
					startDate: req.body.startDate,
					user_id: req.body.user_id,
					question_id: req.body.question_id,
					school_id: req.body.school_id,
					AssignDate: req.body.AssignDate,
					assignTo: req.body.assignTo,
					detail_question_paper: req.body.detail_question_paper,
					section: req.body.section,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
					autoGeneratedQuestionCount: req.body.autoGeneratedQuestionCount,
					autoGeneratedQuestion: req.body.autoGeneratedQuestion,
					privateQuestionFlag: req.body.private_question_flag,
					privateQuestionTeacherId: req.body.private_question_teacher_id,
				});
				questionPaper
					.save()
					.then(async result => {
						const teacherData = await User.findById(req.body.user_id);

						const arrOfDeviceToken = [];
						if (req.body.assignTo && req.body.assignTo.length) {
							for (const ele of req.body.assignTo) {
								const studentData = await Student.findById(ele.student_id);
								if (studentData && studentData.DeviceToken) {
									arrOfDeviceToken.push(studentData.DeviceToken);
								}
							}
							let image;
							if (!teacherData.profile_image) {
								image = '';
							} else {
								const imageele = teacherData.profile_image.split('/');
								image = `${process.env.cloudFront100x100}${
									imageele[imageele.length - 1]
								}`;
							}
							const payload = {
								notification: {
									title: 'Test',
									body: req.body.title,
									image,
									click_action: 'FLUTTER_NOTIFICATION_CLICK',
									collapse_key: 'grow_on',
									icon: '@drawable/notification_icon',
									channel_id: 'messages',
								},
								data: {
									type: 'test',
								},
							};
							firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
						}

						res.status(201).json({
							message: 'created successfully',
							status: 201,
							data: result,
						});
					})
					.catch(err => {
						res.status(411).json({
							error: err.message,
							status: 411,
						});
					});
			})
			.catch(err => {
				res.status(411).json({
					error: err.message,
					status: 411,
				});
			});
	} catch (error) {
		res.status(400).json({
			error,
		});
	}
};

exports.createByIds = async (req, res) => {
	try {
		const newArr = [];
		const newArray = [];
		const obj = {};
		const { questionIdArr } = req.body;
		const isExist = questionPaperModel.find({
			question_title: req.body.question_title,
		});
		if (isExist.length) {
			return res.status(802).json({
				error: 'Already Exist',
				status: 802,
			});
		}
		for (const ele of questionIdArr) {
			const question = await objectiveQuestionModel.findOne({
				_id: mongoose.Types.ObjectId(ele),
			});
			const ques = JSON.parse(JSON.stringify(question));
			ques.questionCategory = [];
			newArr.push(ques);
		}
		obj.section_name = req.body.section[0].section_name;
		obj.information = req.body.section[0].information;
		obj.question_list = newArr;
		newArray.push(obj);
		const questionPaper = new questionPaperModel({
			_id: new mongoose.Types.ObjectId(),
			question_title: req.body.question_title,
			class_id: req.body.class_id,
			coin: req.body.coin,
			award: req.body.award,
			dueDate: req.body.dueDate,
			duration: req.body.duration,
			startDate: req.body.startDate,
			user_id: req.body.user_id,
			question_id: req.body.question_id,
			school_id: req.body.school_id,
			AssignDate: req.body.AssignDate,
			assignTo: req.body.assignTo,
			detail_question_paper: req.body.detail_question_paper,
			section: newArray,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
			autoGeneratedQuestionCount: req.body.autoGeneratedQuestionCount,
			autoGeneratedQuestion: req.body.autoGeneratedQuestion,
			privateQuestionFlag: req.body.private_question_flag,
			privateQuestionTeacherId: req.body.private_question_teacher_id,
		});
		questionPaper
			.save()
			.then(async result => {
				const teacherData = await User.findById(req.body.user_id);

				const arrOfDeviceToken = [];
				if (req.body.assignTo && req.body.assignTo.length) {
					for (const ele of req.body.assignTo) {
						const studentData = await Student.findById(ele.student_id);
						if (studentData && studentData.DeviceToken) {
							arrOfDeviceToken.push(studentData.DeviceToken);
						}
					}
					let image;
					if (!teacherData.profile_image) {
						image = '';
					} else {
						const imageele = teacherData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: 'Test',
							body: req.body.title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'test',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}

				res.status(201).json({
					message: 'created successfully',
					status: 201,
					data: result,
				});
			})
			.catch(err => {
				res.status(411).json({
					error: err.message,
					status: 411,
				});
			});
	} catch (error) {
		res.status(400).json({
			error,
		});
	}
};

exports.Update = async (req, res, next) => {
	try {
		questionPaperModel
			.findOneAndUpdate(
				{
					_id: req.params.id,
				},
				{
					question_title: req.body.question_title,
					class_id: req.body.class_id,
					coin: req.body.coin,
					award: req.body.award,
					dueDate: req.body.dueDate,
					duration: req.body.duration,
					startDate: req.body.startDate,
					user_id: req.body.user_id,
					question_id: req.body.question_id,
					school_id: req.body.school_id,
					AssignDate: req.body.AssignDate,
					assignTo: req.body.assignTo,
					detail_question_paper: req.body.detail_question_paper,
					section: req.body.section,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
					privateQuestionFlag: req.body.private_question_flag,
					privateQuestionTeacherId: req.body.private_question_teacher_id,
				}
			)
			.exec()
			.then(chapter => {
				if (chapter) {
					res.status(200).json({
						message: req.body,
					});
				}
			})
			.catch(err => {
				console.log(err);
				res.status(500).json({
					error: err,
				});
			});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.Assign = async (req, res, next) => {
	try {
		questionPaperModel
			.findOneAndUpdate(
				{
					_id: req.params.id,
				},
				{
					$set: {
						AssignDate: req.body.AssignDate,
						dueDate: req.body.dueDate,
						startDate: req.body.startDate,
						award: req.body.award,
						duration: req.body.duration,
					},
					$push: { assignTo: req.body.assignTo },
				},
				{ upsert: true }
			)
			.exec()
			.then(async result => {
				const teacherData = await User.findById(req.body.teacher_id);

				const arrOfDeviceToken = [];
				if (req.body.assignTo && req.body.assignTo.length) {
					for (const ele of req.body.assignTo) {
						const studentData = await Student.findById(ele.student_id);
						if (studentData && studentData.DeviceToken) {
							arrOfDeviceToken.push(studentData.DeviceToken);
						}
					}
					let image;
					if (!teacherData.profile_image) {
						image = '';
					} else {
						const imageele = teacherData.profile_image.split('/');
						image = `${process.env.cloudFront100x100}${
							imageele[imageele.length - 1]
						}`;
					}
					const payload = {
						notification: {
							title: 'Test',
							body: result.question_title,
							image,
							click_action: 'FLUTTER_NOTIFICATION_CLICK',
							collapse_key: 'grow_on',
							icon: '@drawable/notification_icon',
							channel_id: 'messages',
						},
						data: {
							type: 'test',
						},
					};
					firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
				}

				res.status(201).json({
					error: false,
					message: 'assign successfully',
					statusCode: 201,
				});
			})
			.catch(err => {
				res.status(400).json({
					error: err.message,
					statusCode: 400,
				});
			});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err.message,
		});
	}
};

exports.detele = async (req, res) => {
	try {
		const { questionPaperId } = req.body;
		await questionPaperModel.findByIdAndDelete(questionPaperId);
		res.json({
			status: 201,
			data: 'Question paper deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err.message,
		});
	}
};

exports.questionIdValidationAtSchoolLevel = async (req, res) => {
	try {
		const questionPaperId = req.body.questionId;
		const { schoolId } = req.body;
		let responseMessage;
		let responseStatus;
		const questionAvailble = await questionPaperModel.findOne({
			school_id: schoolId,
			question_id: questionPaperId,
		});
		if (questionAvailble) {
			responseStatus = 200;
			responseMessage = 'Question Id is already used';
		} else {
			responseStatus = 201;
			responseMessage = 'Question Id is not in use';
		}
		res.status(responseStatus).json({
			status: responseStatus,
			data: null,
			message: responseMessage,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err.message,
		});
	}
};

exports.mappingApi = async (req, res) => {
	try {
		let responseMessage;
		const response = [];
		let responseStatus;
		const classData = await classModel.find({
			'repository.repository_type': 'Global',
		});
		if (classData && classData.length) {
			for (const classObj of classData) {
				const classId = classObj.id;
				const className = classObj.name;

				const resObj = {};
				const boardsData = await boardModel.find({
					'repository.repository_type': 'Global',
					'repository.mapDetails.classId': classId,
				});
				if (boardsData && boardsData.length) {
					for (const board of boardsData) {
						const boardId = board.id;
						const boardName = board.name;

						const syllabusData = await syllabuseModel.find({
							'repository.repository_type': 'Global',
							'repository.mapDetails.classId': classId,
							'repository.mapDetails.boardId': boardId,
						});
						if (syllabusData && syllabusData.length) {
							for (const syllabus of syllabusData) {
								const syllabusId = syllabus.id;
								const syllabusName = syllabus.name;

								const subjectsData = await subjectModel.find({
									'repository.repository_type': 'Global',
									'repository.mapDetails.classId': classId,
									'repository.mapDetails.boardId': boardId,
									'repository.mapDetails.syllabuseId': syllabusId,
								});
								if (subjectsData && subjectsData.length) {
									for (const subject of subjectsData) {
										const subjectId = subject.id;
										const subjectName = subject.name;

										const chaptersData = await chaptersModel.find({
											'repository.repository_type': 'Global',
											class_id: classId,
											board_id: boardId,
											syllabus_id: syllabusId,
											subject_id: subjectId,
										});
										if (chaptersData && chaptersData.length) {
											for (const chapter of chaptersData) {
												const chapterId = chapter.id;
												const chapterName = chapter.name;
												const topicsData = await topicModel.find({
													'repository.repository_type': 'Global',
													class_id: classId,
													board_id: boardId,
													syllabus_id: syllabusId,
													subject_id: subjectId,
													chapter_id: chapterId,
												});
												if (topicsData && topicsData.length) {
													for (const topic of topicsData) {
														const topicId = topic.id;
														const topicName = topic.name;
														const learningOutcomeData =
															await learnOutcomeModel.find({
																'repository.repository_type': 'Global',
																class_id: classId,
																board_id: boardId,
																syllabus_id: syllabusId,
																subject_id: subjectId,
																chapter_id: chapterId,
																topic_id: topicId,
															});
														if (
															learningOutcomeData &&
															learningOutcomeData.length
														) {
															for (const learningOutcome1 of learningOutcomeData) {
																const learningOutcomeId = learningOutcome1.id;
																const learningOutcome = learningOutcome1.name;
																const obj = {
																	classId,
																	className,
																	boardId,
																	boardName,
																	syllabusId: syllabusId || '',
																	syllabusName: syllabusName || '',
																	subjectId: subjectId || '',
																	subjectName: subjectName || '',
																	chapterId: chapterId || '',
																	chapterName: chapterName || '',
																	topicId: topicId || '',
																	topicName: topicName || '',
																	learningOutcomeId: learningOutcomeId || '',
																	learningOutcome: learningOutcome || '',
																};
																response.push(obj);
															}
														}
													}
												} else {
													const obj = {
														classId,
														className,
														boardId,
														boardName,
														syllabusId: syllabusId || '',
														syllabusName: syllabusName || '',
														subjectId: subjectId || '',
														subjectName: subjectName || '',
														chapterId: chapterId || '',
														chapterName: chapterName || '',
														// eslint-disable-next-line no-undef
														topicId: topicId || '',
														// eslint-disable-next-line no-undef
														topicName: topicName || '',
														// eslint-disable-next-line no-undef
														learningOutcomeId: learningOutcomeId || '',
														// eslint-disable-next-line no-undef
														learningOutcome: learningOutcome || '',
													};
													response.push(obj);
												}
											}
										} else {
											const obj = {
												classId,
												className,
												boardId,
												boardName,
												syllabusId: syllabusId || '',
												syllabusName: syllabusName || '',
												subjectId: subjectId || '',
												subjectName: subjectName || '',
												// eslint-disable-next-line no-undef
												chapterId: chapterId || '',
												// eslint-disable-next-line no-undef
												chapterName: chapterName || '',
												// eslint-disable-next-line no-undef
												topicId: topicId || '',
												// eslint-disable-next-line no-undef
												topicName: topicName || '',
												// eslint-disable-next-line no-undef
												learningOutcomeId: learningOutcomeId || '',
												// eslint-disable-next-line no-undef
												learningOutcome: learningOutcome || '',
											};
											response.push(obj);
										}
									}
								} else {
									const obj = {
										classId,
										className,
										boardId,
										boardName,
										syllabusId: syllabusId || '',
										syllabusName: syllabusName || '',
										// eslint-disable-next-line no-undef
										subjectId: subjectId || '',
										// eslint-disable-next-line no-undef
										subjectName: subjectName || '',
										// eslint-disable-next-line no-undef
										chapterId: chapterId || '',
										// eslint-disable-next-line no-undef
										chapterName: chapterName || '',
										// eslint-disable-next-line no-undef
										topicId: topicId || '',
										// eslint-disable-next-line no-undef
										topicName: topicName || '',
										// eslint-disable-next-line no-undef
										learningOutcomeId: learningOutcomeId || '',
										// eslint-disable-next-line no-undef
										learningOutcome: learningOutcome || '',
									};
									response.push(obj);
								}
							}
						} else {
							const obj = {
								classId,
								className,
								boardId,
								boardName,
								// eslint-disable-next-line no-undef
								syllabusId: syllabusId || '',
								// eslint-disable-next-line no-undef
								syllabusName: syllabusName || '',
								// eslint-disable-next-line no-undef
								subjectId: subjectId || '',
								// eslint-disable-next-line no-undef
								subjectName: subjectName || '',
								// eslint-disable-next-line no-undef
								chapterId: chapterId || '',
								// eslint-disable-next-line no-undef
								chapterName: chapterName || '',
								// eslint-disable-next-line no-undef
								topicId: topicId || '',
								// eslint-disable-next-line no-undef
								topicName: topicName || '',
								// eslint-disable-next-line no-undef
								learningOutcomeId: learningOutcomeId || '',
								// eslint-disable-next-line no-undef
								learningOutcome: learningOutcome || '',
							};
							response.push(obj);
						}
					}
				} else {
					const obj = {
						classId,
						className,
						// eslint-disable-next-line no-undef
						boardId,
						// eslint-disable-next-line no-undef
						boardName,
						// eslint-disable-next-line no-undef
						syllabusId: syllabusId || '',
						// eslint-disable-next-line no-undef
						syllabusName: syllabusName || '',
						// eslint-disable-next-line no-undef
						subjectId: subjectId || '',
						// eslint-disable-next-line no-undef
						subjectName: subjectName || '',
						// eslint-disable-next-line no-undef
						chapterId: chapterId || '',
						// eslint-disable-next-line no-undef
						chapterName: chapterName || '',
						// eslint-disable-next-line no-undef
						topicId: topicId || '',
						// eslint-disable-next-line no-undef
						topicName: topicName || '',
						// eslint-disable-next-line no-undef
						learningOutcomeId: learningOutcomeId || '',
						// eslint-disable-next-line no-undef
						learningOutcome: learningOutcome || '',
					};
					response.push(obj);
				}
				responseStatus = 201;
				responseMessage = 'Question Id is not in use';
			}
		} else {
			responseStatus = 400;
			responseMessage = 'Question Id is already used';
		}
		res.status(responseStatus).json({
			status: responseStatus,
			data: { count: response.length, data: response },
			message: responseMessage,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err.message,
		});
	}
};
