const mongoose = require('mongoose');
const xlsx = require('node-xlsx');
const MMLToSVG = require('mml-to-svg/MMLToSVG');
const DomParser = require('dom-parser');

const domParser = new DomParser();

const questionModel = require('../model/objectiveQuestion');
const globalQuestionModel = require('../model/globalQuestions');
const filterModel = require('../model/filter');
const APIFeatures = require('../utils/apiFeatures');
// var striptags = require('striptags');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const actualQuestionsModel = require('../model/actualQuestions');
const catchAsync = require('../utils/catchAsync');

const convertMMLToSVG = str => {
	const questionInDom = domParser.parseFromString(str);
	const tags = [];
	const svgs = [];
	if (!str) return str;
	questionInDom.getElementsByTagName('math').forEach(e => {
		const svgConverted = MMLToSVG(e.outerHTML);

		tags.push(e.outerHTML);
		svgs.push(svgConverted);
	});
	let formattedStr = str;

	// eslint-disable-next-line guard-for-in
	for (const el in tags) {
		const tag = tags[el];
		formattedStr = formattedStr.replace(tag, svgs[el]);
	}

	return formattedStr;
};

exports.Create = catchAsync(async (req, res, next) => {
	const globalid = req.body.globalId;
	const questions = [];
	const mainQuestionId = new mongoose.Types.ObjectId();

	if (req.body.questions) {
		for (const i of req.body.questions) {
			const question1 = await questionModel.create({
				_id: new mongoose.Types.ObjectId(),
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
				chapter: req.body.chapter,
				topic: req.body.topic ? req.body.topic : [],
				language: req.body.language,
				learningOutcome: req.body.learningOutcome,
				questionCategory: req.body.questionCategory,
				examType: req.body.examType ? req.body.examType : [],
				questionType: i.questionType,
				practiceAndTestQuestion: i.practiceAndTestQuestion
					? i.practiceAndTestQuestion
					: ['practiceTest'],
				studentType: req.body.studentType,
				difficultyLevel: i.difficultyLevel ? i.difficultyLevel : 'intermediate',
				questionTitle: i.questionTitle,
				question: i.question,
				questionSvg: convertMMLToSVG(i.question),
				optionsType: i.optionsType,
				linked: mainQuestionId,
				options:
					i.questionType === 'trueOrFalse'
						? i.options
						: i.options.map(option => ({
								...option,
								valueSvg: convertMMLToSVG(option.value),
						  })),
				matchOptions: i.matchOptions,
				answer:
					i.questionType === 'trueOrFalse'
						? i.answer[0]
						: i.answer.map(ans => ({
								...ans,
								valueSvg: convertMMLToSVG(ans.value),
						  })),
				reason: i.reason,
				totalMarks:
					i.questionType === '3colOptionLevelScoring' ? 4 : i.totalMarks,
				negativeMarks: i.negativeMarks,
				negativeScore: req.body.negativeScore,
				duration: req.body.duration,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			questions.push(question1._id);
			await globalQuestionModel.findByIdAndUpdate(globalid, {
				$push: { importedBySchool: req.body.repository[0].id },
			});
		}
	}
	const question = await questionModel.create({
		_id: mainQuestionId,
		class: req.body.class,
		board: req.body.board,
		syllabus: req.body.syllabus,
		subject: req.body.subject,
		chapter: req.body.chapter,
		topic: req.body.topic ? req.body.topic : [],
		language: req.body.language,
		learningOutcome: req.body.learningOutcome,
		questionCategory: req.body.questionCategory,
		examType: req.body.examType ? req.body.examType : [],
		questionType: req.body.questionType,
		practiceAndTestQuestion: req.body.practiceAndTestQuestion
			? req.body.practiceAndTestQuestion
			: ['practiceTest'],
		studentType: req.body.studentType,
		difficultyLevel: req.body.difficultyLevel
			? req.body.difficultyLevel
			: 'intermediate',
		questionTitle: req.body.questionTitle,
		question: req.body.question,
		questionSvg: convertMMLToSVG(req.body.question),
		questions,
		optionsType: req.body.optionsType,
		options:
			req.body.questionType === 'trueOrFalse'
				? req.body.options
				: req.body.options.map(option => ({
						...option,
						valueSvg: convertMMLToSVG(option.value),
				  })),
		matchOptions: req.body.matchOptions,
		answer:
			req.body.questionType === 'trueOrFalse'
				? req.body.answer[0]
				: req.body.answer.map(ans => ({
						...ans,
						valueSvg: convertMMLToSVG(ans.value),
				  })),
		reason: req.body.reason,
		totalMarks:
			req.body.questionType === '3colOptionLevelScoring'
				? 4
				: req.body.totalMarks,
		negativeMarks: req.body.negativeMarks,
		negativeScore: req.body.negativeScore,
		duration: req.body.duration,
		repository: req.body.repository,
		createdBy: req.body.createdBy,
		updatedBy: req.body.updatedBy,
	});
	await globalQuestionModel.findByIdAndUpdate(globalid, {
		$push: { importedBySchool: req.body.repository[0].id },
	});

	res.status(201).json({
		status: 201,
		message: 'success',
		result: question.length,
		data: question,
	});
});

exports.bulkUpload = async (req, res, next) => {
	try {
		const obj = xlsx.parse(req.file.buffer);
		const temp = [];
		const headers = obj[0].data[0];
		obj[0].data.forEach((item, idx) => {
			if (idx != 0 && headers.length == item.length) {
				const ob = {};
				headers.forEach((element, i) => {
					// console.log(element);
					ob[element] = item[i];
				});
				temp.push(ob);
			}
		});
		for (const ele of temp) {
			let options = ele.Options;
			if (
				ele.QuestionType !== 'trueOrFalse' &&
				ele.Options &&
				ele.Options.length
			) {
				options = ele.Options.map(option => ({
					...option,
					valueSvg: convertMMLToSVG(option.value || option.Value),
				}));
			}

			const question = await questionModel.create({
				_id: new mongoose.Types.ObjectId(),
				class: ele.Class,
				board: ele.Board,
				syllabus: ele.Syllabus,
				subject: ele.Subject,
				chapter: ele.Chapter,
				topic: ele.Topic ? ele.Topic : [],
				language: ele.Language,
				learningOutcome: ele.LearningOutcome,
				questionCategory: ele.QuestionCategory,
				examType: ele.ExamType ? ele.ExamType : [],
				questionType: ele.QuestionType,
				PracticeAndTestQuestion: ele.PracticeAndTestQuestion
					? ele.PracticeAndTestQuestion
					: ['practiceTest'],
				studentType: ele.StudentType,
				difficultyLevel: ele.DifficultyLevel
					? ele.DifficultyLevel
					: 'intermediate',
				questionTitle: ele.QuestionTitle,
				question: ele.Question,
				questionSvg: convertMMLToSVG(ele.Question),
				optionsType: ele.OptionsType,
				options,
				matchOptions: ele.MatchOptions,
				answer: ele.Answer,
				reason: ele.Reason,
				totalMarks: ele.TotalMarks,
				negativeMarks: ele.NegativeMarks,
				negativeScore: ele.NegativeScore,
				duration: ele.Duration,
				repository: ele.Repository,
				createdBy: ele.CreatedBy,
				updatedBy: ele.CpdatedBy,
			});
		}

		res.status(201).json({
			status: 201,
			message: 'successfully uploaded questions',
		});
	} catch (err) {
		res.status(404).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.createGlobalQuestions = async (req, res, next) => {
	try {
		const chap = [];
		const chapters = req.body.chapter;
		chapters.forEach(ele => {
			if (ele) chap.push(ele);
		});
		req.body.chapter = chap;

		const topicsArray = [];
		const topics = req.body.topic;
		if (topics && topics.length) {
			topics.forEach(ele => {
				if (ele) topicsArray.push(ele);
			});
			req.body.topic = topicsArray;
		}

		const learningOutcomeArray = [];
		const learing = req.body.learningOutcome;
		if (learing && learing.length) {
			learing.forEach(ele => {
				if (ele) learningOutcomeArray.push(ele);
			});
			req.body.learningOutcome = learningOutcomeArray;
		}
		console.log('---------------------------------------');
		const questions = [];
		const mainQuestionId = new mongoose.Types.ObjectId();

		if (req.body.questions) {
			for (const i of req.body.questions) {
				const question1 = await globalQuestionModel.create({
					_id: new mongoose.Types.ObjectId(),
					class: req.body.class,
					board: req.body.board,
					syllabus: req.body.syllabus,
					subject: req.body.subject,
					chapter: req.body.chapter,
					topic: req.body.topic ? req.body.topic : [],
					language: req.body.language,
					learningOutcome: req.body.learningOutcome,
					questionCategory: req.body.questionCategory,
					examType: req.body.examType ? req.body.examType : [],
					questionType: i.questionType,
					linked: mainQuestionId,
					questionName: i.questionName,
					practiceAndTestQuestion: i.practiceAndTestQuestion
						? i.practiceAndTestQuestion
						: ['practiceTest'],
					studentType: req.body.studentType,
					difficultyLevel: i.difficultyLevel
						? i.difficultyLevel
						: 'intermediate',
					questionTitle: i.questionTitle,
					question: i.question,
					optionsType: i.optionsType,
					options: i.options,
					matchOptions: i.matchOptions,
					answer: i.answer,
					reason: i.reason,
					totalMarks: i.totalMarks,
					negativeMarks: i.negativeMarks,
					negativeScore: req.body.negativeScore,
					duration: req.body.duration,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				questions.push(question1._id);
			}
		}

		const question = await globalQuestionModel.create({
			_id: mainQuestionId,
			class: req.body.class,
			board: req.body.board,
			syllabus: req.body.syllabus,
			subject: req.body.subject,
			chapter: req.body.chapter,
			topic: req.body.topic ? req.body.topic : [],
			language: req.body.language,
			learningOutcome: req.body.learningOutcome,
			questionCategory: req.body.questionCategory,
			examType: req.body.examType ? req.body.examType : [],
			questionType: req.body.questionType,
			questionName: req.body.questionName,
			practiceAndTestQuestion: req.body.practiceAndTestQuestion
				? req.body.practiceAndTestQuestion
				: ['practiceTest'],
			studentType: req.body.studentType,
			difficultyLevel: req.body.difficultyLevel
				? req.body.difficultyLevel
				: 'intermediate',
			questionTitle: req.body.questionTitle,
			story: req.body.story,
			question: req.body.question,
			questions,
			optionsType: req.body.optionsType,
			options: req.body.options,
			matchOptions: req.body.matchOptions,
			answer: req.body.answer ? req.body.answer : '<p></p>',
			reason: req.body.reason,
			totalMarks: req.body.totalMarks,
			negativeMarks: req.body.negativeMarks,
			negativeScore: req.body.negativeScore,
			duration: req.body.duration,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		res.status(201).json({
			status: 201,
			message: 'success',
			result: question.length,
			data: question,
		});
		// }
	} catch (err) {
		res.status(404).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.CountWithData = async (req, res, next) => {
	try {
		const payload = {
			'repository.id': req.body['repository.id'],
			class: mongoose.Types.ObjectId(req.body.class),
		};
		if (req.body.subject) {
			const newArray = [];
			const { subject } = req.body;
			subject.forEach(ele => {
				newArray.push(mongoose.Types.ObjectId(ele));
			});
			payload.subject = { $in: newArray };
		}
		if (req.body.chapter) {
			const newArray = [];
			const { chapter } = req.body;
			chapter.forEach(ele => {
				newArray.push(mongoose.Types.ObjectId(ele));
			});
			payload.chapter = { $in: newArray };
		}
		if (req.body.topic) {
			const newArray = [];
			const { topic } = req.body;
			topic.forEach(ele => {
				const newArr = mongoose.Types.ObjectId(ele);
				newArray.push(newArr);
			});
			payload.topic = { $in: newArray };
		}
		const features = await questionModel.aggregate([
			{
				$match: {
					$and: [payload],
				},
			},
			{
				$project: {
					_id: 1,
					questionType: {
						$arrayElemAt: ['$questionType', 0],
					},
					totalMarks: 1,
				},
			},
		]);
		res.status(200).json({
			message: 'success',
			result: features,
		});
	} catch (err) {
		res.status(404).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.Get = async (req, res, next) => {
	try {
		const list = [];
		const features = new APIFeatures(
			questionModel
				.find()
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		if (questionData && questionData.length) {
			res.status(200).json({
				status: 'success',
				result: questionData.length,
				data: questionData,
			});
		} else {
			res.status(200).json({
				status: 'success',
				result: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GetCount = async (req, res, next) => {
	try {
		let payload = {};
		if (req.body.chapter) {
			if (req.body.topic) {
				if (req.body.practiceAndTestQuestion) {
					if (req.body.difficultyLevel) {
						payload = {
							'repository.id': req.body['repository.id'],
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: { $in: req.body.chapter },
							topic: { $in: req.body.topic },
							practiceAndTestQuestion: req.body.practiceAndTestQuestion,
							difficultyLevel: req.body.difficultyLevel,
							page: req.body.page,
							limit: req.body.limit,
						};
					} else {
						payload = {
							'repository.id': req.body['repository.id'],
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: { $in: req.body.chapter },
							topic: { $in: req.body.topic },
							practiceAndTestQuestion: req.body.practiceAndTestQuestion,
							page: req.body.page,
							limit: req.body.limit,
						};
					}
				} else {
					payload = {
						'repository.id': req.body['repository.id'],
						class: req.body.class,
						board: req.body.board,
						syllabus: req.body.syllabus,
						subject: req.body.subject,
						chapter: { $in: req.body.chapter },
						topic: { $in: req.body.topic },
						page: req.body.page,
						limit: req.body.limit,
					};
				}
			} else {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: req.body.board,
					syllabus: req.body.syllabus,
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
					page: req.body.page,
					limit: req.body.limit,
				};
			}
		} else {
			payload = {
				'repository.id': req.body['repository.id'],
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
				page: req.body.page,
				limit: req.body.limit,
			};
		}
		if (req.body.questionType) {
			const features = new APIFeatures(
				questionModel
					.find({
						linked: { $exists: false },
						questionType: { $in: req.body.questionType },
					})
					.populate('questions')
					.populate(
						'board syllabus class subject chapter topic examType questionCategory learningOutcome',
						'_id name'
					),
				payload
			)
				.filter()
				.sort()
				.limitFields();
			const questionData = await features.query;
			if (questionData && questionData.length) {
				res.status(200).json({
					status: 200,
					message: 'success',
					recordCount: 0,
				});
			} else {
				res.status(200).json({
					status: 200,
					message: 'No records found',
					result: 0,
					data: [],
				});
			}
			// }
		} else {
			const features = new APIFeatures(
				questionModel.find({
					linked: { $exists: false },
				}),
				payload
			)
				.filter()
				.sort()
				.limitFields();
			const questionData = await features.query;
			if (questionData) {
				res.status(200).json({
					status: 200,
					message: 'success',
					result: questionData.length,
				});
			} else {
				res.status(200).json({
					status: 200,
					message: 'success',
					result: 0,
					data: [],
				});
			}
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GetAllData = catchAsync(async (req, res, next) => {
	checkLimitAndPage(req);

	const queryPayload = {
		'repository.id': req.query['repository.id'],
		class: req.body.class,
		board: req.body.board,
		syllabus: req.body.syllabus,
		subject: req.body.subject,
		page: req.body.page,
		limit: req.body.limit,
		searchValue: req.body.searchValue,
		filterKeysArray: req.body.filterKeysArray,
	};

	if (req.body.chapter) {
		if (req.body.topic) {
			if (req.body.practiceAndTestQuestion) {
				if (req.body.difficultyLevel) {
					queryPayload.difficultyLevel = req.body.difficultyLevel;
				}
				queryPayload.practiceAndTestQuestion = req.body.practiceAndTestQuestion;
			}
			queryPayload.topic = { $in: req.body.topic };
		}
		queryPayload.chapter = { $in: req.body.chapter };
	}

	const findObj = {
		linked: { $exists: false },
	};

	if (req.body.questionType) {
		findObj.questionType = { $in: req.body.questionType };
	}

	const questionsQuery = new APIFeatures(
		questionModel
			.find(findObj)
			.populate('questions')
			.populate(
				'board syllabus class subject chapter topic examType questionCategory learningOutcome',
				'_id name'
			),
		queryPayload
	)
		.filter()
		.sortbyCount()
		.limitFields()
		.paginate();

	const foundQuestions = await questionsQuery.query;
	let totalRecords = foundQuestions.length;

	if (totalRecords > 0) {
		const questionsCountQuery = new APIFeatures(
			questionModel.find({ linked: { $exists: false } }),
			queryPayload
		)
			.filter()
			.count();

		totalRecords = await questionsCountQuery.query;
	}

	return res.status(200).json({
		status: 'success',
		recordCount: totalRecords,
		result: foundQuestions.length,
		data: foundQuestions,
	});
});

exports.getGlobalQuestions = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			globalQuestionModel
				.find({ linked: { $exists: false } })
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		if (questionData) {
			res.status(200).json({
				statusCode: 200,
				result: questionData.length,
				data: questionData,
			});
		} else {
			res.status(200).json({
				statusCode: 200,
				message: 'No records found',
				result: questionData.length,
				data: questionData,
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.getGlobalQuestionsCount = async (req, res, next) => {
	try {
		checkLimitAndPage(req);
		let payload = {};
		if (req.body.chapter) {
			if (req.body.topic) {
				if (req.body.practiceAndTestQuestion) {
					if (req.body.difficultyLevel) {
						payload = {
							'repository.id': req.body['repository.id'],
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: { $in: req.body.chapter },
							topic: { $in: req.body.topic },
							practiceAndTestQuestion: req.body.practiceAndTestQuestion,
							difficultyLevel: req.body.difficultyLevel,
							page: req.body.page,
							limit: req.body.limit,
						};
					} else {
						payload = {
							'repository.id': req.body['repository.id'],
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: { $in: req.body.chapter },
							topic: { $in: req.body.topic },
							practiceAndTestQuestion: req.body.practiceAndTestQuestion,
							page: req.body.page,
							limit: req.body.limit,
						};
					}
				} else {
					payload = {
						'repository.id': req.body['repository.id'],
						class: req.body.class,
						board: req.body.board,
						syllabus: req.body.syllabus,
						subject: req.body.subject,
						chapter: { $in: req.body.chapter },
						topic: { $in: req.body.topic },
						page: req.body.page,
						limit: req.body.limit,
					};
				}
			} else {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: req.body.board,
					syllabus: req.body.syllabus,
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
					page: req.body.page,
					limit: req.body.limit,
				};
			}
		} else {
			payload = {
				'repository.id': req.body['repository.id'],
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
				page: req.body.page,
				limit: req.body.limit,
			};
		}
		if (req.body.questionType) {
			const features = new APIFeatures(
				globalQuestionModel.find({ linked: { $exists: false } }),
				payload
			)
				.filter()
				.sort()
				.limitFields();
			// .paginate();
			const questionData = await features.query;
			if (questionData) {
				res.status(200).json({
					status: 'success',
					result: questionData.length,
				});
			} else {
				res.status(200).json({
					status: 'success',
					result: 0,
					data: [],
				});
			}
		} else {
			const features = new APIFeatures(
				globalQuestionModel.find({ linked: { $exists: false } }),
				payload
			)
				.filter()
				.sort()
				.limitFields();
			// .paginate();
			const questionData = await features.query;
			if (questionData) {
				res.status(200).json({
					status: 'success',
					result: questionData.length,
				});
			} else {
				res.status(200).json({
					status: 'success',
					result: 0,
					data: [],
				});
			}
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.GetByType = async (req, res, next) => {
	try {
		let features;
		const limit = req.body.limit ? parseInt(req.body.limit) : 10;
		const skip = req.body.page ? parseInt(req.body.page) * limit : 0;
		const payload = {
			'repository.id': req.body['repository.id'],
			class: mongoose.Types.ObjectId(req.body.class),
		};
		if (req.body.subject) {
			const newArray = [];
			const { subject } = req.body;
			subject.forEach(ele => {
				newArray.push(mongoose.Types.ObjectId(ele));
			});
			payload.subject = { $in: newArray };
		}
		if (req.body.chapter) {
			const newArray = [];
			const { chapter } = req.body;
			chapter.forEach(ele => {
				newArray.push(mongoose.Types.ObjectId(ele));
			});
			payload.chapter = { $in: newArray };
		}
		if (req.body.topic) {
			const newArray = [];
			const { topic } = req.body;
			topic.forEach(ele => {
				const newArr = mongoose.Types.ObjectId(ele);
				newArray.push(newArr);
			});
			payload.topic = { $in: newArray };
		}
		if (req.body.questionType) {
			const newArray = [];
			const question_type = req.body.questionType;
			question_type.forEach(ele => {
				newArray.push(ele);
			});
			payload.questionType = { $in: newArray };
		}
		if (req.body.questionId) {
			const newPayload = {};
			const newArray = [];
			const { questionId } = req.body;
			questionId.forEach(ele => {
				newArray.push(mongoose.Types.ObjectId(ele));
			});
			newPayload._id = { $in: newArray };
			features = await questionModel.aggregate([
				{
					$match: newPayload,
				},
				{
					$lookup: {
						from: 'objectivequestions',
						localField: 'questions',
						foreignField: '_id',
						as: 'questions',
					},
				},
				{ $skip: skip },
				{ $limit: limit },
			]);
		} else {
			features = await questionModel.aggregate([
				{
					$match: {
						$and: [payload],
					},
				},
				{
					$lookup: {
						from: 'objectivequestions',
						localField: 'questions',
						foreignField: '_id',
						as: 'questions',
					},
				},

				{ $skip: skip },
				{ $limit: limit },
			]);
		}
		if (features) {
			res.status(200).json({
				status: 'success',
				result: features.length,
				data: features,
			});
		} else {
			res.status(404).json({
				message: 'No records found',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.getGlobalQuestionsAllData = catchAsync(async (req, res, next) => {
	checkLimitAndPage(req);

	const queryPayload = {
		'repository.id': req.body['repository.id'],
		class: req.body.class,
		board: req.body.board,
		syllabus: req.body.syllabus,
		subject: req.body.subject,
		page: req.body.page,
		limit: req.body.limit,
		searchValue: req.body.searchValue,
		filterKeysArray: req.body.filterKeysArray,
	};

	if (req.body.chapter) {
		if (req.body.topic) {
			if (req.body.practiceAndTestQuestion) {
				if (req.body.difficultyLevel) {
					queryPayload.difficultyLevel = req.body.difficultyLevel;
				}
				queryPayload.practiceAndTestQuestion = req.body.practiceAndTestQuestion;
			}
			queryPayload.topic = { $in: req.body.topic };
		}
		queryPayload.chapter = { $in: req.body.chapter };
	}

	const findObj = {
		linked: { $exists: false },
	};

	if (req.body.questionType) {
		findObj.questionType = { $in: req.body.questionType };
	}

	const questionsQuery = new APIFeatures(
		globalQuestionModel
			.find(findObj)
			.populate('questions')
			.populate(
				'board syllabus class subject chapter topic examType questionCategory learningOutcome',
				'_id name'
			),
		queryPayload
	)
		.filter()
		.sortbyCount()
		.limitFields()
		.paginate();

	const foundQuestions = await questionsQuery.query;
	let totalRecords = foundQuestions.length;

	if (totalRecords > 0) {
		const questionsCountQuery = new APIFeatures(
			globalQuestionModel.find({ linked: { $exists: false } }),
			queryPayload
		)
			.filter()
			.count();

		totalRecords = await questionsCountQuery.query;
	}

	return res.status(200).json({
		status: 'success',
		recordCount: totalRecords,
		result: foundQuestions.length,
		data: foundQuestions,
	});
});

exports.GetQuesCount = async (req, res, next) => {
	try {
		const finaldata = [];
		let payload = {};
		if (req.body.chapter) {
			if (req.body.topic) {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: req.body.board,
					syllabus: req.body.syllabus,
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
					topic: { $in: req.body.topic },
				};
			} else {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: req.body.board,
					syllabus: req.body.syllabus,
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
					topic: req.body.topic,
				};
			}
		} else {
			payload = {
				'repository.id': req.body['repository.id'],
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
			};
		}

		const features = new APIFeatures(
			questionModel
				.find({ linked: { $exists: false } })
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			payload
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		if (questionData && questionData.length) {
			const responeData = questionData;
			for (const x of responeData) {
				const element = JSON.parse(JSON.stringify(x));

				finaldata.push(element);
			}
			const list = {};
			for (const ele of responeData) {
				if (Object.keys(list).includes(ele.questionType[0])) {
					list[ele.questionType[0]] += 1;
				} else {
					list[ele.questionType[0]] = 1;
				}
			}

			res.status(200).json({
				status: 'success',
				length: finaldata.length,
				data: finaldata,
				count: list,
			});
		} else {
			res.status(200).json({
				status: 'success',
				result: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GlobalGetQuesAttemptCount = async (req, res, next) => {
	try {
		const finalData = {};
		let hardCount;
		let hardCount1 = 0;
		let veryEasyCount;
		let veryEasyCount1 = 0;
		let practiceCount;
		let practiceCount1 = 0;
		let testCount;
		let testCount1 = 0;
		let practiceAndTestCount;
		let practiceAndTestCount1 = 0;
		let veryHardCount;
		let veryHardCount1 = 0;
		let easyCount;
		let easyCount1 = 0;
		let intermediateCount = 0;
		let intermediateCount1 = 0;
		let subject = [];
		if (req.body.subject) {
			subject = req.body.subject.map(x => mongoose.Types.ObjectId(x));
		}
		if (req.body.globalLogin == true) {
			let board = [];
			let syllabus = [];
			if (req.body.board) {
				board = req.body.board.map(x => mongoose.Types.ObjectId(x));
			}
			if (req.body.syllabus) {
				syllabus = req.body.syllabus.map(x => mongoose.Types.ObjectId(x));
			}

			intermediateCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'intermediate' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						intermediateCount: { $sum: 1 },
					},
				},
			]);
			if (intermediateCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in intermediateCount) {
					intermediateCount1 += intermediateCount[j].intermediateCount;
				}
			} else {
				intermediateCount1 += 0;
			}

			easyCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'easy' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						easyCount: { $sum: 1 },
					},
				},
			]);
			if (easyCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in easyCount) {
					easyCount1 += easyCount[j].easyCount;
				}
			} else {
				easyCount1 += 0;
			}

			hardCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'hard' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						hardCount: { $sum: 1 },
					},
				},
			]);
			if (hardCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in hardCount) {
					hardCount1 += hardCount[j].hardCount;
				}
			} else {
				hardCount1 += 0;
			}

			veryHardCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'veryHard' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						veryHardCount: { $sum: 1 },
					},
				},
			]);
			if (veryHardCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in veryHardCount) {
					veryHardCount1 += veryHardCount[j].veryHardCount;
				}
			} else {
				veryHardCount1 += 0;
			}

			veryEasyCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'veryEasy' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						veryEasyCount: { $sum: 1 },
					},
				},
			]);
			if (veryEasyCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in veryEasyCount) {
					veryEasyCount1 += veryEasyCount[j].veryEasyCount;
				}
			} else {
				veryEasyCount1 += 0;
			}

			practiceCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'practice' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						practiceCount: { $sum: 1 },
					},
				},
			]);
			if (practiceCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in practiceCount) {
					practiceCount1 += practiceCount[j].practiceCount;
				}
			} else {
				practiceCount1 += 0;
			}

			testCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'test' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						testCount: { $sum: 1 },
					},
				},
			]);
			if (testCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in testCount) {
					testCount1 += testCount[j].testCount;
				}
			} else {
				testCount1 += 0;
			}

			practiceAndTestCount = await globalQuestionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'practiceTest' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: { $in: board } },
							{ syllabus: { $in: syllabus } },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						practiceAndTestCount: { $sum: 1 },
					},
				},
			]);
			if (practiceAndTestCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in practiceAndTestCount) {
					practiceAndTestCount1 += practiceAndTestCount[j].practiceAndTestCount;
				}
			} else {
				practiceAndTestCount1 += 0;
			}
			// }
		} else {
			intermediateCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'intermediate' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						intermediateCount: { $sum: 1 },
					},
				},
			]);
			if (intermediateCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in intermediateCount) {
					intermediateCount1 += intermediateCount[j].intermediateCount;
				}
			} else {
				intermediateCount1 += 0;
			}

			easyCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'easy' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						easyCount: { $sum: 1 },
					},
				},
			]);
			if (easyCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in easyCount) {
					easyCount1 += easyCount[j].easyCount;
				}
			} else {
				easyCount1 += 0;
			}

			hardCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'hard' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						hardCount: { $sum: 1 },
					},
				},
			]);
			if (hardCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in hardCount) {
					hardCount1 += hardCount[j].hardCount;
				}
			} else {
				hardCount1 += 0;
			}

			veryHardCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'veryHard' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						veryHardCount: { $sum: 1 },
					},
				},
			]);
			if (veryHardCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in veryHardCount) {
					veryHardCount1 += veryHardCount[j].veryHardCount;
				}
			} else {
				veryHardCount1 += 0;
			}

			veryEasyCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ difficultyLevel: 'veryEasy' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$difficultyLevel',
						veryEasyCount: { $sum: 1 },
					},
				},
			]);
			if (veryEasyCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in veryEasyCount) {
					veryEasyCount1 += veryEasyCount[j].veryEasyCount;
				}
			} else {
				veryEasyCount1 += 0;
			}

			practiceCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'practice' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						practiceCount: { $sum: 1 },
					},
				},
			]);
			if (practiceCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in practiceCount) {
					practiceCount1 += practiceCount[j].practiceCount;
				}
			} else {
				practiceCount1 += 0;
			}

			testCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'test' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						testCount: { $sum: 1 },
					},
				},
			]);
			if (testCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in testCount) {
					testCount1 += testCount[j].testCount;
				}
			} else {
				testCount1 += 0;
			}

			practiceAndTestCount = await questionModel.aggregate([
				{
					$match: {
						$and: [
							{ practiceAndTestQuestion: 'practiceTest' },
							{ linked: { $exists: false } },
							{ class: mongoose.Types.ObjectId(req.body.class) },
							{ board: mongoose.Types.ObjectId(req.body.board) },
							{ syllabus: mongoose.Types.ObjectId(req.body.syllabus[0]) },
							{ subject: { $in: subject } },
						],
					},
				},
				{
					$group: {
						_id: '$practiceAndTestQuestion',
						practiceAndTestCount: { $sum: 1 },
					},
				},
			]);
			if (practiceAndTestCount.length) {
				// eslint-disable-next-line guard-for-in
				for (const j in practiceAndTestCount) {
					practiceAndTestCount1 += practiceAndTestCount[j].practiceAndTestCount;
				}
			} else {
				practiceAndTestCount1 += 0;
			}
			// }
		}

		console.log(finalData);
		finalData.intermediateCount = intermediateCount1;
		finalData.easyCount = easyCount1;
		finalData.hardCount = hardCount1;
		finalData.veryHardCount = veryHardCount1;
		finalData.veryEasyCount = veryEasyCount1;
		finalData.practiceCount = practiceCount1;
		finalData.testCount = testCount1;
		finalData.practiceAndTestCount = practiceAndTestCount1;
		res.status(200).json({
			error: false,
			status: 200,
			message: 'success',
			data: finalData,
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.GlobalGetQuesCount = async (req, res, next) => {
	try {
		const finaldata = [];
		let payload = {};
		if (req.body.chapter) {
			if (req.body.topic) {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: { $in: req.body.board },
					syllabus: { $in: req.body.syllabus },
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
					topic: { $in: req.body.topic },
				};
			} else {
				payload = {
					'repository.id': req.body['repository.id'],
					class: req.body.class,
					board: { $in: req.body.board },
					syllabus: { $in: req.body.syllabus },
					subject: req.body.subject,
					chapter: { $in: req.body.chapter },
				};
			}
		} else {
			payload = {
				'repository.id': req.body['repository.id'],
				class: req.body.class,
				board: { $in: req.body.board },
				syllabus: { $in: req.body.syllabus },
				subject: req.body.subject,
			};
		}
		const features = new APIFeatures(
			globalQuestionModel
				.find({ linked: { $exists: false } })
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			payload
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		if (questionData && questionData.length) {
			const responeData = questionData;
			for (const x of responeData) {
				const element = JSON.parse(JSON.stringify(x));
				finaldata.push(element);
			}
			const list = {};
			for (const ele of responeData) {
				if (Object.keys(list).includes(ele.questionType[0])) {
					list[ele.questionType[0]] += 1;
				} else {
					list[ele.questionType[0]] = 1;
				}
			}

			res.status(200).json({
				statusCode: 200,
				message: 'success',
				length: finaldata.length,
				data: finaldata,
				count: list,
			});
		} else {
			res.status(200).json({
				statusCode: 200,
				message: 'No records Found',
				result: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

// global to school
exports.GlobalQuesImport = async (req, res, next) => {
	try {
		const finaldata = [];
		const list = {};
		const schoolId = req.body.school_id;
		delete req.body.school_id;
		const features = new APIFeatures(
			globalQuestionModel
				.find({})
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		if (questionData && questionData.length) {
			const responeData = questionData;
			for (const x of responeData) {
				if (!x.importedBySchool.includes(schoolId)) {
					const element = JSON.parse(JSON.stringify(x));
					finaldata.push(element);

					for (const ele of finaldata) {
						if (Object.keys(list).includes(ele.questionType[0])) {
							list[ele.questionType[0]] += 1;
						} else {
							list[ele.questionType[0]] = 1;
						}
					}
				}
			}
			res.status(200).json({
				status: 'success',
				length: finaldata.length,
				data: finaldata,
				count: list,
			});
		} else {
			res.status(200).json({
				status: 'success',
				result: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getGlobalQuestion = async (req, res, next) => {
	try {
		const questionData = await globalQuestionModel
			.find({ _id: req.params.id })
			.populate('questions')
			.populate(
				'board syllabus class subject chapter topic examType questionCategory learningOutcome',
				'_id name'
			);
		const responseData = [];
		if (questionData && questionData.length) {
			res.status(200).json({
				statusCode: 200,
				message: 'success',
				result: questionData.length,
				data: questionData,
			});
		} else {
			res.status(200).json({
				statusCode: 200,
				message: 'No records found',
				result: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};
exports.filterData = async (req, res, next) => {
	try {
		const features = new APIFeatures(filterModel.find(), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const questionData = await features.query;
		res.status(200).json({
			status: 'success',
			data: questionData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GetById = async (req, res, next) => {
	try {
		const { id } = req.params;
		console.log('id', id);
		const question = await questionModel
			.findById(id)
			.populate('questions')
			.populate(
				'board syllabus class subject chapter topic examType questionCategory learningOutcome',
				'_id name'
			);
		if (!question) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		} else {
			const getQuestionData = await questionModel
				.findById(id)
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				);
			res.status(200).json({
				status: 'success',
				data: getQuestionData,
			});
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.Update = async (req, res, next) => {
	try {
		const { id } = req.params;
		const question = await questionModel.findById(id);
		if (!question) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		} else {
			const addedQuestions = [];
			if (req.body.questionType == 'comprehension') {
				const mainQuestion = await questionModel.findById(id);
				const removedQuestions = mainQuestion.questions.map(x => x.toString());
				for (const i of req.body.questions) {
					const nestedId = i._id;
					if (nestedId) {
						const index = removedQuestions.findIndex(item => item == nestedId);
						if (index != -1) {
							removedQuestions.splice(index, 1);
						}
						delete i._id;
						await questionModel.findByIdAndUpdate(nestedId, i);
						addedQuestions.push(nestedId);
					} else {
						const question1 = new questionModel({
							_id: new mongoose.Types.ObjectId(),
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: req.body.chapter,
							topic: req.body.topic,
							language: req.body.language,
							learningOutcome: req.body.learningOutcome,
							questionCategory: req.body.questionCategory,
							examType: req.body.examType,
							questionType: i.questionType,
							practiceAndTestQuestion: i.practiceAndTestQuestion,
							studentType: req.body.studentType,
							difficultyLevel: i.difficultyLevel,
							questionTitle: i.questionTitle,
							question: i.question,
							questionSvg: convertMMLToSVG(i.question),
							optionsType: i.optionsType,
							linked: mainQuestion._id,
							options:
								i.questionType === 'trueOrFalse'
									? i.options
									: i.options.map(option => ({
											...option,
											valueSvg: convertMMLToSVG(option.value),
									  })),
							matchOptions: i.matchOptions,
							answer:
								i.questionType === 'trueOrFalse'
									? i.answer[0]
									: i.answer.map(ans => ({
											...ans,
											valueSvg: convertMMLToSVG(ans.value),
									  })),
							reason: i.reason,
							totalMarks:
								i.questionType === '3colOptionLevelScoring' ? 4 : i.totalMarks,
							negativeMarks: i.negativeMarks,
							negativeScore: req.body.negativeScore,
							duration: req.body.duration,
							repository: req.body.repository,
							createdBy: req.body.createdBy,
							updatedBy: req.body.updatedBy,
						});
						const savedQuestion = await question1.save();
						addedQuestions.push(savedQuestion._id);
					}
				}
				for (const i of removedQuestions) {
					await questionModel.findByIdAndDelete(i);
				}
			}
			const payload = {
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
				chapter: req.body.chapter,
				topic: req.body.topic,
				language: req.body.language,
				learningOutcome: req.body.learningOutcome,
				questionCategory: req.body.questionCategory,
				examType: req.body.examType,
				questionType: req.body.questionType,
				practiceAndTestQuestion: req.body.practiceAndTestQuestion,
				studentType: req.body.studentType,
				difficultyLevel: req.body.difficultyLevel,
				questionTitle: req.body.questionTitle,
				question: req.body.question,
				questionSvg: convertMMLToSVG(req.body.question),
				matchOptions: req.body.matchOptions,
				optionsType: req.body.optionsType,
				options:
					req.body.questionType === 'trueOrFalse'
						? req.body.options
						: req.body.options.map(option => ({
								...option,
								valueSvg: convertMMLToSVG(option.value),
						  })),
				answer:
					req.body.questionType === 'trueOrFalse'
						? req.body.answer[0]
						: req.body.answer.map(ans => ({
								...ans,
								valueSvg: convertMMLToSVG(ans.value),
						  })),
				reason: req.body.reason,
				totalMarks:
					req.body.questionType === '3colOptionLevelScoring'
						? 4
						: req.body.totalMarks,
				negativeMarks: req.body.negativeMarks,
				negativeScore: req.body.negativeScore,
				duration: req.body.duration,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			};
			if (addedQuestions) {
				payload.questions = addedQuestions;
			}
			const updatedquestion = await questionModel.findByIdAndUpdate(
				id,
				payload
			);

			res.status(201).json({
				status: 'success',
				data: updatedquestion,
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.UpdateGlobalQuestions = async (req, res, next) => {
	try {
		const { id } = req.params;
		const question = await globalQuestionModel.findById(id);
		if (!question) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		} else {
			const addedQuestions = [];
			if (req.body.questionType == 'comprehension') {
				const mainQuestion = await globalQuestionModel.findById(id);
				const removedQuestions = mainQuestion.questions.map(x => x.toString());
				for (const i of req.body.questions) {
					const nestedId = i._id;
					if (nestedId) {
						const index = removedQuestions.findIndex(item => item == nestedId);
						if (index != -1) {
							removedQuestions.splice(index, 1);
						}
						delete i._id;
						await globalQuestionModel.findByIdAndUpdate(nestedId, i);
						addedQuestions.push(nestedId);
					} else {
						const question1 = await globalQuestionModel.create({
							_id: new mongoose.Types.ObjectId(),
							class: req.body.class,
							board: req.body.board,
							syllabus: req.body.syllabus,
							subject: req.body.subject,
							chapter: req.body.chapter,
							topic: req.body.topic,
							language: req.body.language,
							learningOutcome: req.body.learningOutcome,
							questionCategory: req.body.questionCategory,
							examType: req.body.examType,
							questionType: i.questionType,
							practiceAndTestQuestion: i.practiceAndTestQuestion,
							studentType: req.body.studentType,
							difficultyLevel: i.difficultyLevel,
							questionTitle: i.questionTitle,
							question: i.question,
							optionsType: i.optionsType,
							linked: mainQuestion._id,
							options: i.options,
							matchOptions: i.matchOptions,
							answer: i.answer,
							reason: i.reason,
							totalMarks: i.totalMarks,
							negativeMarks: i.negativeMarks,
							negativeScore: req.body.negativeScore,
							duration: req.body.duration,
							repository: req.body.repository,
							createdBy: req.body.createdBy,
							updatedBy: req.body.updatedBy,
						});
						const savedQuestion = await question1.save();
						addedQuestions.push(savedQuestion._id);
					}
				}
				for (const i of removedQuestions) {
					await globalQuestionModel.findByIdAndDelete(i);
				}
			}

			const payload = {
				class: req.body.class,
				board: req.body.board,
				syllabus: req.body.syllabus,
				subject: req.body.subject,
				chapter: req.body.chapter,
				topic: req.body.topic,
				language: req.body.language,
				learningOutcome: req.body.learningOutcome,
				questionCategory: req.body.questionCategory,
				examType: req.body.examType,
				questionType: req.body.questionType,
				practiceAndTestQuestion: req.body.practiceAndTestQuestion,
				studentType: req.body.studentType,
				difficultyLevel: req.body.difficultyLevel,
				questionTitle: req.body.questionTitle,
				question: req.body.question,
				matchOptions: req.body.matchOptions,
				optionsType: req.body.optionsType,
				options: req.body.options,
				answer: req.body.answer,
				reason: req.body.reason,
				totalMarks: req.body.totalMarks,
				negativeMarks: req.body.negativeMarks,
				negativeScore: req.body.negativeScore,
				duration: req.body.duration,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			};
			if (addedQuestions) {
				payload.questions = addedQuestions;
			}

			const updatedquestion = await globalQuestionModel.findByIdAndUpdate(
				id,
				payload
			);

			res.status(201).json({
				status: 'success',
				data: updatedquestion,
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};
exports.CompleteData = async (req, res, next) => {
	try {
		const questionData = await questionModel
			.find({ linked: { $exists: false } })
			.populate('questions')
			.populate(
				'board syllabus class subject chapter topic examType questionCategory learningOutcome',
				'_id name'
			);
		res.status(200).json({
			status: 'success',
			data: questionData,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.GetNumber = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			questionModel
				.find({})
				.populate('questions')
				.populate(
					'board syllabus class subject chapter topic examType questionCategory learningOutcome',
					'_id name'
				),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();

		const questionData = await features.query;
		let mcq = 0;
		let twoColMtf = 0;
		let objectives = 0;
		let fillInTheBlanks = 0;
		let threeColMtf = 0;
		let sequencingQuestion = 0;
		let sentenceSequencing = 0;
		let trueOrFalse = 0;
		let sorting = 0;
		let freeText = 0;
		let NumericalRange = 0;

		for (let i = 0; i < questionData.length; i++) {
			if (questionData[i].questionType[0] == 'twoColMtf') {
				twoColMtf = questionData.filter(
					hero => hero.questionType == 'twoColMtf'
				);
			}
			if (questionData[i].questionType[0] == 'threeColMtf') {
				threeColMtf = questionData.filter(
					hero => hero.questionType == 'threeColMtf'
				);
			}
			if (questionData[i].questionType[0] == 'mcq') {
				mcq = questionData.filter(hero => hero.questionType == 'mcq');
			}
			if (questionData[i].questionType[0] == 'objectives') {
				objectives = questionData.filter(
					hero => hero.questionType == 'objectives'
				);
			}
			if (questionData[i].questionType[0] == 'fillInTheBlanks') {
				fillInTheBlanks = questionData.filter(
					hero => hero.questionType == 'fillInTheBlanks'
				);
			}
			if (questionData[i].questionType[0] == 'sequencingQuestion') {
				sequencingQuestion = questionData.filter(
					hero => hero.questionType == 'sequencingQuestion'
				);
			}
			if (questionData[i].questionType[0] == 'sentenceSequencing') {
				sentenceSequencing = questionData.filter(
					hero => hero.questionType == 'sentenceSequencing'
				);
			}
			if (questionData[i].questionType[0] == 'trueOrFalse') {
				trueOrFalse = questionData.filter(
					hero => hero.questionType == 'trueOrFalse'
				);
			}
			if (questionData[i].questionType[0] == 'sorting') {
				sorting = questionData.filter(hero => hero.questionType == 'sorting');
			}
			if (questionData[i].questionType[0] == 'freeText') {
				freeText = questionData.filter(hero => hero.questionType == 'freeText');
			}
			if (questionData[i].questionType[0] == 'NumericalRange') {
				NumericalRange = questionData.filter(
					hero => hero.questionType == 'NumericalRange'
				);
			}
		}

		res.status(200).json({
			Total: questionData.length,
			question: [
				{
					key: 'twoColMtf',
					value: twoColMtf.length,
				},
				{
					key: 'fillInTheBlanks',
					value: fillInTheBlanks.length,
				},
				{
					key: 'mcq',
					value: mcq.length,
				},
				{
					key: 'freeText',
					value: freeText.length,
				},
				{
					key: 'sorting',
					value: sorting.length,
				},
				{
					key: 'sentenceSequencing',
					value: sentenceSequencing.length,
				},
				{
					key: 'threeColMtf',
					value: threeColMtf.length,
				},
				{
					key: 'trueOrFalse',
					value: trueOrFalse.length,
				},
				{
					key: 'sequencingQuestion',
					value: sequencingQuestion.length,
				},
				{
					key: 'objectives',
					value: objectives.length,
				},
				{
					key: 'NumericalRange',
					value: NumericalRange.length,
				},
			],
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.deleteQuestions = async (req, res) => {
	try {
		const questionsId = req.body.questionId;
		const { repositoryId } = req.body;
		const { isGlobal } = req.body;
		let isQuestionRole = false;
		let responeStatus = 200;
		let message;
		const actualQuestionsData = await actualQuestionsModel.find({
			$and: [
				{ 'section.question_list._id': mongoose.Types.ObjectId(questionsId) },
				{ 'repository.id': repositoryId },
			],
		});

		if (actualQuestionsData && actualQuestionsData.length)
			isQuestionRole = true;
		if (isQuestionRole) {
			responeStatus = 400;
			message = 'This question is already mapped, pls delete the mapping first';
		} else {
			message = 'Question deleted Successfully';
			if (isGlobal) await globalQuestionModel.deleteOne({ _id: questionsId });
			else await questionModel.deleteOne({ _id: questionsId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
