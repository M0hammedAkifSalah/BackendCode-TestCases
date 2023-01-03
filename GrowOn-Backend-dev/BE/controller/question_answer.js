const mongoose = require('mongoose');
const striptags = require('striptags');
const AnswerModel = require('../model/question_answer');
const APIFeatures = require('../utils/apiFeatures');
const User = require('../model/user');
const Student = require('../model/student');
const firebaseNoti = require('../firebase');
const questionPaperModel = require('../model/actualQuestions');
const SuccessResponse = require('../utils/successResponse');
require('dotenv').config();

exports.Create = async (req, res, next) => {
	try {
		const studentId = req.body.student_details.student_id;
		console.log('studentId', studentId);
		const exist = await AnswerModel.find({
			$and: [
				{ question_id: req.body.question_id },
				{ 'student_details.student_id': studentId },
			],
		});
		if (exist && exist.length) {
			res.status(201).json({
				message: 'Already submitted the test',
			});
		} else {
			const result = await AnswerModel.create({
				_id: new mongoose.Types.ObjectId(),
				question_title: req.body.question_title,
				status: req.body.status,
				question_id: req.body.question_id,
				attempt_question: req.body.attempt_question,
				student_details: req.body.student_details,
				answer_details: req.body.answer_details,
				feedback: req.body.feedback,
				totalTimeTaken: req.body.totalTimeTaken,
				totalMarks: req.body.totalMarks,
				coin: req.body.coin,
				createdBy: req.body.createdBy,
			});
			//
			questionPaperModel.find({ _id: req.body.question_id }, (err, result) => {
				if (result && result.length) {
					const assignToList = [];
					for (const element of result) {
						console.log('element', element);
						for (const ele of element.assignTo) {
							if (ele.student_id == studentId) {
								ele.status = req.body.status;
								assignToList.push(ele);
							} else {
								assignToList.push(ele);
							}
						}
					}
					questionPaperModel
						.updateOne({ _id: req.body.question_id }, result[0], {
							multi: true,
						})
						.exec((err, result1) => {
							if (err) {
								console.log('err', err);
							} else {
								console.log('result', result1);
							}
						});
				}
			});
			const studentData = await Student.findById(studentId);
			const quespaper = await questionPaperModel.find({
				_id: req.body.question_id,
			});
			if (quespaper.length) {
				const arrOfDeviceToken = [];
				const teacherData = await User.findById(quespaper[0].user_id);
				if (teacherData && teacherData.DeviceToken) {
					arrOfDeviceToken.push(teacherData.DeviceToken);
				}
				let image;
				if (!studentData.profile_image) {
					image = '';
				} else {
					const imageele = studentData.profile_image.split('/');
					image = `${process.env.cloudFront100x100}${
						imageele[imageele.length - 1]
					}`;
				}
				const payload = {
					notification: {
						title: 'Test Submitted',
						body: quespaper[0].question_title,
						image,
						click_action: 'FLUTTER_NOTIFICATION_CLICK',
						collapse_key: 'grow_on',
						icon: '@drawable/notification_icon',
						channel_id: 'messages',
					},
					data: {
						type: 'Test',
					},
				};
				firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
			}
			//
			res.status(201).json({
				message: 'created Successfully',
				data: result,
			});
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};
exports.result = async (req, res, next) => {
	try {
		const allData = [];
		if (req.body.subject) {
			const features1 = new APIFeatures(
				questionPaperModel.find({
					'detail_question_paper.subject': req.body.subject,
				})
			);
			const question = await features1.query;
			const responeData1 = JSON.parse(JSON.stringify(question));
			for (const ele of responeData1) {
				const features = new APIFeatures(
					AnswerModel.find({
						$and: [
							{ question_id: ele._id },
							{ 'student_details.class_id': req.body.class_id },
							{ 'student_details.school_id': req.body.school_id },
						],
					})
				);
				let testData = await features.query;
				testData = JSON.parse(JSON.stringify(testData));
				const correctCount = [];
				const wrongCount = [];
				const unIdentified = [];
				for (const element of testData) {
					if (element) {
						let marksObtained = 0;
						element.answer_details.forEach(element1 => {
							element1.question = striptags(element1.question);
							// eslint-disable-next-line no-shadow
							element1.answer = element1.answer.map(ele => striptags(ele));
							marksObtained +=
								// eslint-disable-next-line no-nested-ternary
								element1.correctOrNot == 'no' && element1.negative_mark != 0
									? -element1.negative_mark
									: element1.obtainedMarks != undefined
									? element1.obtainedMarks
									: element1.marks;
							if (element1.correctOrNot == 'yes') {
								correctCount.push(element1);
							} else if (element1.correctOrNot == 'no') {
								wrongCount.push(element1);
							} else {
								unIdentified.push(element1);
							}
						});
						element.correct = correctCount.length;
						element.wrong = wrongCount.length;
						element.unAttempted = unIdentified.length;
						element.marksObtained = marksObtained;

						let answerSheet = await AnswerModel.find({
							question_id: element.question_id,
						});
						if (answerSheet) {
							answerSheet = JSON.parse(JSON.stringify(answerSheet));
							for (const answer of answerSheet) {
								let studentMarksObtained = 0;
								answer.answer_details.forEach(element2 => {
									studentMarksObtained +=
										// eslint-disable-next-line no-nested-ternary
										element2.correctOrNot == 'no' && element2.negative_mark != 0
											? -element2.negative_mark
											: !element2.obtainedMarks
											? element2.obtainedMarks
											: element2.marks;
								});
								answer.marksObtained = studentMarksObtained;
							}
							const totalMarks = answerSheet.reduce(
								(a, b) => a + b.marksObtained,
								0
							);
							element.average = Math.round(totalMarks / answerSheet.length);
							const sorted = answerSheet
								.slice()
								.sort((a, b) => b.marksObtained - a.marksObtained);
							const indexOfStudent = answerSheet.findIndex(
								item =>
									item.student_details.student_id ==
									element.student_details.student_id
							);
							element.rank = sorted.indexOf(answerSheet[indexOfStudent]) + 1;
							element.topper_marks = sorted[0].marksObtained;
							element.total_student = answerSheet.length;
						}
						allData.push(element);
					}
				}
			}
			res.status(200).json({
				status: 200,
				message: 'Success',
				records: allData.length,
				data: allData,
			});
		} else {
			let features = null;
			features = new APIFeatures(AnswerModel.find({}), req.body)
				.filter()
				.sort()
				.limitFields()
				.paginate();
			let testData = await features.query;
			testData = JSON.parse(JSON.stringify(testData));
			const correctCount = [];
			const wrongCount = [];
			const unIdentified = [];
			let marksObtained;
			for (const element of testData) {
				// eslint-disable-next-line no-loop-func
				element.answer_details.forEach(element1 => {
					element1.question = striptags(element1.question);
					element1.answer = element1.answer.map(ele => striptags(ele));

					marksObtained +=
						// eslint-disable-next-line no-nested-ternary
						element1.correctOrNot == 'no' && element1.negative_mark != 0
							? -element1.negative_mark
							: element1.obtainedMarks != undefined
							? element1.obtainedMarks
							: element1.marks;
					if (element1.correctOrNot == 'yes') {
						correctCount.push(element1);
					} else if (element1.correctOrNot == 'no') {
						wrongCount.push(element1);
					} else {
						unIdentified.push(element1);
					}
				});
				element.correct = correctCount.length;
				element.wrong = wrongCount.length;
				element.unAttempted = unIdentified.length;
				element.marksObtained = marksObtained;
				if (testData) {
					for (const answer of testData) {
						let studentMarksObtained = 0;
						answer.answer_details.forEach(element2 => {
							studentMarksObtained +=
								// eslint-disable-next-line no-nested-ternary
								element2.correctOrNot == 'no' && element2.negative_mark != 0
									? -element2.negative_mark
									: !element2.obtainedMarks
									? element2.obtainedMarks
									: element2.marks;
						});
						answer.marksObtained = studentMarksObtained;
					}
					const totalMarks = testData.reduce((a, b) => a + b.marksObtained, 0);
					element.average = Math.round(totalMarks / testData.length);
					const sorted = testData
						.slice()
						.sort((a, b) => b.marksObtained - a.marksObtained);
					const indexOfStudent = testData.findIndex(
						item =>
							item.student_details.student_id ==
							element.student_details.student_id
					);
					element.rank = sorted.indexOf(testData[indexOfStudent]) + 1;
					element.topper_marks = sorted[0].marksObtained;
					element.total_student = testData.length;
				}
			}

			return res.status(200).json(SuccessResponse(testData, testData.length));
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};
exports.GetAll = async (req, res, next) => {
	try {
		let features = null;
		if (req.body.teacher_id && req.body.question_id) {
			const userId = req.body.teacher_id;
			const quesId = req.body.question_id;
			const limit = req.query.limit ? parseInt(req.query.limit) : 10;
			const skip = req.query.page ? parseInt(req.query.page) * limit : 0;
			features = await AnswerModel.aggregate([
				{
					$match: {
						'student_details.teacher_id': mongoose.Types.ObjectId(userId),
						question_id: mongoose.Types.ObjectId(quesId),
					},
				},
				{
					$project: {
						status: 1,
						question_title: 1,
						question_id: 1,
						attempt_question: 1,
						student_details: 1,
						answer_details: 1,
						totalMarks: 1,
						coin: 1,
						createdBy: 1,
						createdAt: 1,
						updatedAt: 1,
						marksObtained: {
							$sum: {
								$cond: {
									if: {
										$and: [
											{
												$eq: ['$answer_details.correctOrNot', 'no'],
											},
											{
												$ne: ['$answer_details.negative_mark', 0],
											},
										],
									},
									then: {
										$convert: {
											input: {
												$concat: [
													'-',
													{
														$toString: '$answer_details.negative_mark',
													},
												],
											},
											to: 'int',
										},
									},
									else: {
										$cond: {
											if: {
												$ifNull: ['$answer_details.obtainedMarks', false],
											},
											then: '$answer_details.obtainedMarks',
											else: '$answer_details.marks',
										},
									},
								},
							},
						},
					},
				},
				{
					$lookup: {
						from: 'answersheets',
						let: {
							question_id: '$question_id',
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ['$question_id', '$$question_id'],
									},
								},
							},
							{
								$addFields: {
									marksObtained: {
										$sum: {
											$cond: {
												if: {
													$and: [
														{
															$eq: ['$answer_details.correctOrNot', 'no'],
														},
														{
															$ne: ['$answer_details.negative_mark', 0],
														},
													],
												},
												then: {
													$convert: {
														input: {
															$concat: [
																'-',
																{
																	$toString: '$answer_details.negative_mark',
																},
															],
														},
														to: 'int',
													},
												},
												else: {
													$cond: {
														if: {
															$ifNull: ['$answer_details.obtainedMarks', false],
														},
														then: '$answer_details.obtainedMarks',
														else: '$answer_details.marks',
													},
												},
											},
										},
									},
								},
							},
							{
								$project: {
									marksObtained: 1,
									student_details: 1,
								},
							},
							{
								$sort: {
									marksObtained: -1,
								},
							},
						],
						as: 'answers_sheets',
					},
				},
				{
					$addFields: {
						average: {
							$multiply: [
								{
									$divide: ['$marksObtained', '$totalMarks'],
								},
								100,
							],
						},
						rank: {
							$add: [
								{
									$indexOfArray: [
										'$answers_sheets.student_details.student_id',
										'$student_details.student_id',
									],
								},
								1,
							],
						},
						topper_marks: {
							$first: '$answers_sheets.marksObtained',
						},
						total_student: {
							$size: '$answers_sheets',
						},
					},
				},
				{
					$sort: {
						rank: 1,
					},
				},
				{
					$unset: 'answers_sheets',
				},
				{ $skip: skip },
				{ $limit: limit },
			]);
			return res.status(200).json({
				status: 'success',
				records: features.length,
				data: features,
			});
		}
		if (req.body.student_id && req.body.question_id) {
			features = new APIFeatures(
				AnswerModel.find({
					$and: [
						{ 'student_details.student_id': req.body.student_id },
						{ question_id: req.body.question_id },
					],
				})
			);
		} else {
			features = new APIFeatures(AnswerModel.find({}), req.body)
				.filter()
				.sort()
				// .limitFields()
				.paginate();
		}
		let testData = await features.query;
		testData = JSON.parse(JSON.stringify(testData));
		for (const element of testData) {
			let marksObtained = 0;
			element.answer_details.forEach(element1 => {
				element1.question = striptags(element1.question);
				element1.answer = element1.answer.map(ele => striptags(ele));
				marksObtained +=
					// eslint-disable-next-line no-nested-ternary
					element1.correctOrNot == 'no' && element1.negative_mark != 0
						? -element1.negative_mark
						: element1.obtainedMarks != undefined
						? element1.obtainedMarks
						: element1.marks;
			});
			element.marksObtained = marksObtained;
			let answerSheet = await AnswerModel.find({
				question_id: element.question_id,
			});
			if (answerSheet) {
				let studentMarksObtained = 0;
				answerSheet = JSON.parse(JSON.stringify(answerSheet));
				for (const answer of answerSheet) {
					// eslint-disable-next-line no-loop-func
					answer.answer_details.forEach(element2 => {
						studentMarksObtained +=
							// eslint-disable-next-line no-nested-ternary
							element2.correctOrNot == 'no' && element2.negative_mark != 0
								? -element2.negative_mark
								: element2.obtainedMarks != undefined
								? element2.obtainedMarks
								: element2.marks;
						answer.marksObtained = studentMarksObtained;
					});
				}
				element.average = (studentMarksObtained / element.totalMarks) * 100;
				const sorted = answerSheet
					.slice()
					.sort((a, b) => b.marksObtained - a.marksObtained);
				const indexOfStudent = answerSheet.findIndex(
					item =>
						item.student_details.student_id ==
						element.student_details.student_id
				);
				element.rank = sorted.indexOf(answerSheet[indexOfStudent]) + 1;
				element.topper_marks = sorted[0].marksObtained;
				element.total_student = answerSheet.length;
			}
		}
		res.status(200).json({
			testData: testData.length,
			data: testData,
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: err,
		});
	}
};

exports.Single = async (req, res, next) => {
	try {
		const innovationsData = await AnswerModel.findById(req.params.id);
		if (innovationsData.length == 0) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		}
		res.status(200).json({
			message: 'success',
			data: innovationsData,
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};
exports.Update = async (req, res, next) => {
	try {
		const { id } = req.params;
		const innovationsData = await AnswerModel.findByIdAndUpdate(id, {
			student_details: req.body.student_details,
			answer_details: req.body.answer_details,
			totalTimeTaken: req.body.totalTimeTaken,
			totalMarks: req.body.totalMarks,
			coin: req.body.coin,
		});
		res.status(201).json({
			message: 'updated Successfully',
		});
	} catch (err) {
		res.status(404).json({
			message: err,
		});
	}
};
exports.freeTextUpdate = async (req, res, next) => {
	try {
		for (const answer of req.body.answer_details) {
			if (answer.answers && answer.answers.length) {
				for (const ans of answer.answers) {
					await AnswerModel.updateOne(
						{
							$and: [
								{ 'answer_details.answers.questionId': ans.question_id },
								{ 'student_details.student_id': req.body.student_id },
								{ 'answer_details._id': answer._id },
							],
						},
						{
							$set: {
								'answer_details.$[outerQuestionIndex].answers.$[innerQuestionIndex].obtainedMarks':
									ans.obtainedMarks,
								'answer_details.$[outerQuestionIndex].answers.$[innerQuestionIndex].correctOrNot':
									ans.correctOrNot,
							},
						},
						{
							arrayFilters: [
								{ 'outerQuestionIndex.questionId': answer.question_id },
								{ 'innerQuestionIndex.questionId': ans.question_id },
							],
						}
					);
				}
			}
			await AnswerModel.updateOne(
				{
					$and: [
						{ 'answer_details.questionId': answer.question_id },
						{ 'student_details.student_id': req.body.student_id },
						{ 'answer_details._id': answer._id },
					],
				},
				{
					$set: {
						'answer_details.$.obtainedMarks': answer.obtainedMarks,
						'answer_details.$.correctOrNot': answer.correctOrNot,
						'answer_details.$.status': 'Evaluated',
					},
				}
			);
		}
		if (req.body.isEvaluated) {
			await AnswerModel.updateOne(
				{
					$and: [
						{ question_id: req.body.question_id },
						{ 'student_details.student_id': req.body.student_id },
					],
				},
				{
					$set: {
						status: 'Evaluated',
					},
				}
			);

			const quetionPaper = await questionPaperModel
				.findOneAndUpdate(
					{
						$and: [
							{ _id: req.body.question_id },
							{ 'assignTo.student_id': req.body.student_id },
						],
					},
					{
						$set: {
							'assignTo.$.status': 'Evaluated',
						},
					}
				)
				.populate('user_id', 'id name profile_image');

			let image;
			if (!quetionPaper.user_id.profile_image) {
				image = '';
			} else {
				const imageele = quetionPaper.user_id.profile_image.split('/');
				image = `${process.env.cloudFront100x100}${
					imageele[imageele.length - 1]
				}`;
			}
			const payload = {
				notification: {
					title: 'Test Evaluated',
					body: quetionPaper.question_title,
					image,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					collapse_key: 'grow_on',
					icon: '@drawable/notification_icon',
					channel_id: 'messages',
				},
				data: {
					type: 'Test',
				},
			};
			const studentData = await Student.findById(req.body.student_id);
			const arrOfDeviceToken = [];
			if (studentData.DeviceToken && studentData.DeviceToken.length) {
				arrOfDeviceToken.push(studentData.DeviceToken);
			}
			firebaseNoti.sendToDeviceFirebase(payload, arrOfDeviceToken);
		}
		res.status(201).json({
			status: 201,
			message: 'updated Successfully',
		});
	} catch (err) {
		console.log(err);
		res.status(404).json({
			message: err.message,
		});
	}
};
exports.teacherFeedback = async (req, res, next) => {
	try {
		const paramsId = req.params.id;
		await AnswerModel.findByIdAndUpdate(paramsId, {
			teacher_feedback: {
				teacher_id: req.body.teacher_id,
				feedback_type: req.body.feedback_type,
				comment: req.body.comment,
			},
		});
		res.status(201).json({
			message: 'feedback updated Successfully',
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};
