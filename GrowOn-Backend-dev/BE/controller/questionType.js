/* eslint-disable new-cap */
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const questionTypeModel = require('../model/questionType');
const objectiveQuestionModel = require('../model/objectiveQuestion');
const APIFeatures = require('../utils/apiFeatures');
const globalObjectiveQuestionModel = require('../model/globalQuestions');

exports.create = async (req, res) => {
	try {
		const questionType = new questionTypeModel({
			_id: new mongoose.Types.ObjectId(),
			name: req.body.name,
			class_id: req.body.class_id,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		questionType
			.save()
			.then(result => {
				res.status(201).json({
					message: 'questionType created successfully',
					status: 201,
					data: result,
				});
			})
			.catch(err => {
				res.json({
					error: err,
					status: 411,
				});
			});
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.getByRepositoryId = async (req, res, next) => {
	try {
		const schooldata = await questionTypeModel.find({
			'repository.id': req.params.id,
		});
		res.status(200).json({
			data: schooldata,
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(questionTypeModel.find({}), req.query)
			.sort()
			.limitFields()
			.paginate()
			.filter();
		const activityData = await features.query;

		const questionTypeData = JSON.parse(JSON.stringify(activityData));
		res.status(200).json({
			status: 'success',
			results: questionTypeData.length,
			data: questionTypeData,
		});
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const questionTypeData = await questionTypeModel.findById(req.params.id);
		res.json({
			status: 200,
			data: {
				questionTypeData,
			},
		});
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	const { id } = req.params;
	try {
		const question = await questionTypeModel.findById(id);
		if (!question) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const updateQuestion = await questionTypeModel.findByIdAndUpdate(id, {
				name: req.body.name,
				description: req.body.description,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};

exports.delete = async (req, res) => {
	const { isGlobal } = req.body;
	const { questionCategoryId } = req.body;
	const { repositoryId } = req.body;
	let isDelete = true;
	let responseMessage = 'Question Category deleted successfully';
	let responseStatus = 200;
	try {
		if (isGlobal) {
			const globalObjectiveQuestionData =
				await globalObjectiveQuestionModel.findOne({
					$and: [
						{ questionCategory: questionCategoryId },
						{ 'repository.id': repositoryId },
					],
				});
			if (globalObjectiveQuestionData) isDelete = false;
		} else {
			const objectiveQuestionData = await objectiveQuestionModel.findOne({
				$and: [
					{ questionCategory: questionCategoryId },
					{ 'repository.id': repositoryId },
				],
			});
			if (objectiveQuestionData) isDelete = false;
		}
		if (isDelete) {
			await questionTypeModel.findByIdAndDelete(questionCategoryId);
		} else {
			responseMessage =
				'This Question Category is already mapped, pls delete the mapping first';
			responseStatus = 400;
		}
		res.status(responseStatus).json({
			status: responseStatus,
			message: responseMessage,
		});
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};
