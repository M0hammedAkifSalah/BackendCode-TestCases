const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const ExamTypeModel = require('../model/examType');
const ClassModel = require('../model/class');
const ObjectiveQuestionModel = require('../model/objectiveQuestion');
const GlobalObjectiveQuestionModel = require('../model/globalQuestions');

exports.create = async (req, res) => {
	try {
		const features = new APIFeatures(
			ExamTypeModel.find({}),
			req.query
		).filter();
		const Data = await features.query;
		if (Data.length >= 1) {
			return res.json({
				error: 'Already Exist',
				status: 802,
			});
		}
		const examType = new ExamTypeModel({
			_id: new mongoose.Types.ObjectId(),
			name: req.body.name,
			class_id: req.body.class_id,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		examType
			.save()
			.then(result => {
				res.status(201).json({
					message: 'examType created successfully',
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

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(ExamTypeModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const examTypeData = await features.query;
		if (examTypeData) {
			const responeData1 = JSON.parse(JSON.stringify(examTypeData));
			for (const element of responeData1) {
				let className;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = await ClassModel.findById(element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
						}
					}
				}
			}
			res.json({
				status: 200,
				results: responeData1.length,
				data: responeData1,
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const examTypeData = await ExamTypeModel.findById(req.params.id);
		if (examTypeData) {
			const responeData1 = JSON.parse(JSON.stringify([examTypeData]));
			for (const element of responeData1) {
				let className;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = await ClassModel.findById(element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
						}
					}
				}
			}
			res.json({
				status: 200,
				data: responeData1,
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	const { id } = req.params;
	try {
		const exam = await ExamTypeModel.findById(id);
		if (!exam) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			await ExamTypeModel.findByIdAndUpdate(id, {
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
	const { examTypeId } = req.body;
	const { repositoryId } = req.body;
	let isDelete = true;
	let responseMessage = 'Exam Type deleted successfully';
	let responseStatus = 200;
	try {
		if (isGlobal) {
			const globalObjectiveQuestionData =
				await GlobalObjectiveQuestionModel.findOne({
					$and: [
						{ questionCategory: examTypeId },
						{ 'repository.id': repositoryId },
					],
				});
			if (globalObjectiveQuestionData) isDelete = false;
		} else {
			const objectiveQuestionData = await ObjectiveQuestionModel.findOne({
				$and: [
					{ questionCategory: examTypeId },
					{ 'repository.id': repositoryId },
				],
			});
			if (objectiveQuestionData) isDelete = false;
		}
		if (isDelete) {
			await ExamTypeModel.findByIdAndDelete(examTypeId);
		} else {
			responseMessage =
				'This Exam Type is already mapped, pls delete the mapping first';
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
