const mongoose = require('mongoose');
const QuestionModel = require('../model/generateQuestion');

exports.GetAll = async (req, res, next) => {
	try {
		const getAllData = await QuestionModel.find();
		res.status(200).json({
			Status: 'success',
			result: getAllData.length,
			data: getAllData,
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
		if (!id) {
			res.status(404).json({
				status: 'failed',
				message: 'Invaild Id',
			});
		}
		const Data = await QuestionModel.findById(id);
		res.status(200).json({
			Status: 'success',
			data: Data,
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
		const createData = await QuestionModel.create({
			_id: new mongoose.Types.ObjectId(),
			generatedQuestion: req.body.generatedQuestion,
			topic: req.body.topic,
			learningOutcome: req.body.learningOutcome,
			questionType: req.body.questionType,
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
		});
		res.status(201).json({
			status: 'success',
			result: createData.length,
			data: createData,
		});
	} catch (err) {
		res.status(404).json({
			Status: 'failed',
			message: err,
		});
	}
};

exports.Update = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({
				Status: 'failed',
				message: 'Inalid id',
			});
		}

		const updatedData = await QuestionModel.findByIdAndUpdate(id, {
			generatedQuestion: req.body.generatedQuestion,
			topic: req.body.topic,
			learningOutcome: req.body.learningOutcome,
			questionType: req.body.questionType,
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
		});
		res.status(200).json({
			status: 'success',
			data: updatedData,
		});
	} catch (err) {
		res.status(404).json({
			Status: 'failed',
			message: err,
		});
	}
};
