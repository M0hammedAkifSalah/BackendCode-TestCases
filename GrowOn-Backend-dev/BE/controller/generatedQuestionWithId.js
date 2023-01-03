const mongoose = require('mongoose');
const GeneratedQuestionModel = require('../model/generatedQuestionWithId');

exports.GetAll = async (req, res, next) => {
	try {
		const questionData = await GeneratedQuestionModel.find().populate(
			'questionId'
		);
		res.status(200).json({
			result: questionData.length,
			data: questionData,
		});
	} catch (err) {
		res.status(400).json({
			Status: 'failed',
			message: err,
		});
	}
};

exports.getById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const question = await GeneratedQuestionModel.findById(id);
		if (!question) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		}
		const QuestionById = await GeneratedQuestionModel.findById(id).populate(
			'questionId'
		);
		res.status(200).json({
			result: QuestionById.length,
			data: QuestionById,
		});
	} catch (err) {
		res.status(400).json({
			Status: 'failed',
			message: err,
		});
	}
};

exports.Create = async (req, res, next) => {
	try {
		const generatedQuestion = await GeneratedQuestionModel.create({
			_id: new mongoose.Types.ObjectId(),
			QuestionTitle: req.body.QuestionTitle,
			questionId: req.body.questionId,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		res.status(201).json({
			Status: 'success',
			data: generatedQuestion,
		});
	} catch (err) {
		res.status(400).json({
			Status: 'failed',
			message: err,
		});
	}
};

exports.UpdateData = async (req, res, next) => {
	try {
		const { id } = req.params;
		const question = await GeneratedQuestionModel.findById(id);
		if (!question) {
			res.status(400).json({
				message: 'Invalid Id',
			});
		} else {
			const updatedQuestion = await GeneratedQuestionModel.findByIdAndUpdate(
				id,
				{
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
					optionsType: req.body.optionsType,
					options: req.body.options,
					answer: req.body.answer,
					totalMarks: req.body.totalMarks,
					negativeMarks: req.body.negativeMarks,
					negativeScore: req.body.negativeScore,
					duration: req.body.duration,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				}
			);

			res.status(200).json({
				status: 'success',
				data: updatedQuestion,
			});
		}
	} catch (err) {
		res.status(400).json({
			Status: 'failed',
			message: err,
		});
	}
};
