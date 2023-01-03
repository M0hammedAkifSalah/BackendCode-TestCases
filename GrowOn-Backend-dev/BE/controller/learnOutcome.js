/* eslint-disable new-cap */
const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const learnOutcomeModel = require('../model/learnOutcome');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const objectiveQuestionModel = require('../model/objectiveQuestion');

exports.GetAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			learnOutcomeModel
				.find({})
				.populate(
					'syllabus_id board_id class_id subject_id chapter_id topic_id'
				),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const learnOutcome = await features.query;
		res.json({
			status: 201,
			result: learnOutcome.length,
			data: learnOutcome,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.GetAllData = async (req, res) => {
	try {
		checkLimitAndPage(req);
		const features = new APIFeatures(
			learnOutcomeModel
				.find({})
				.populate(
					'syllabus_id board_id class_id subject_id chapter_id topic_id'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const learnOutcome = await features.query;
		res.json({
			status: 201,
			result: learnOutcome.length,
			data: learnOutcome,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};
exports.GetAllCount = async (req, res) => {
	try {
		const features = new APIFeatures(
			learnOutcomeModel
				.find({})
				.populate(
					'syllabus_id board_id class_id subject_id chapter_id topic_id'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		const learnOutcome = await features.query;
		res.json({
			status: 201,
			result: learnOutcome.length,
			// data: learnOutcome
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};
exports.filter = async (req, res) => {
	try {
		const features = new APIFeatures(
			learnOutcomeModel
				.find({})
				.populate(
					'syllabus_id board_id class_id subject_id chapter_id topic_id'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const learnOutcome = await features.query;
		res.json({
			status: 201,
			result: learnOutcome.length,
			data: learnOutcome,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Get = async (req, res) => {
	try {
		const chap = [];
		const chapters = req.body.chapter_id;
		if (chapters && chapters.length) {
			chapters.forEach(ele => {
				if (ele) chap.push(ele);
			});
			req.body.chapter_id = chap;
		}
		const topicsArray = [];
		const topics = req.body.topic_id;
		if (topics && topics.length) {
			topics.forEach(ele => {
				if (ele) topicsArray.push(ele);
			});
			req.body.topic_id = topicsArray;
		}

		const features = new APIFeatures(learnOutcomeModel.find({}), req.body)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const learnOutcome = await features.query;
		res.json({
			status: 201,
			result: learnOutcome.length,
			data: learnOutcome,
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
		const learnOutcome = await learnOutcomeModel
			.findById(req.params.id)
			.populate('syllabus_id board_id class_id subject_id chapter_id topic_id');
		if (learnOutcome.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			res.json({
				status: 201,
				data: {
					learnOutcome,
				},
			});
		}
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Create = async (req, res) => {
	try {
		const features = new APIFeatures(
			learnOutcomeModel.find({}),
			req.query
		).filter();
		const Data = await features.query;
		if (Data.length >= 1) {
			return res.json({
				error: 'Already Exist',
				status: 802,
			});
		}
		const learnOutcome = new learnOutcomeModel({
			_id: new mongoose.Types.ObjectId(),
			name: req.body.name,
			files_upload: req.body.files_upload,
			about_file: req.body.about_file,
			class_id: req.body.class_id,
			board_id: req.body.board_id,
			subject_id: req.body.subject_id,
			syllabus_id: req.body.syllabus_id,
			chapter_id: req.body.chapter_id,
			topic_id: req.body.topic_id,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		learnOutcome
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
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
	} catch (error) {
		res.status(400).json({
			error: 'something went wrong',
		});
	}
};

exports.Update = async (req, res, next) => {
	learnOutcomeModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				name: req.body.name,
				class_id: req.body.class_id,
				files_upload: req.body.files_upload,
				about_file: req.body.about_file,
				board_id: req.body.board_id,
				subject_id: req.body.subject_id,
				syllabus_id: req.body.syllabus_id,
				chapter_id: req.body.chapter_id,
				topic_id: req.body.topic_id,
				description: req.body.description,
				repository: req.body.repository,
				created_by: req.body.created_by,
			}
		)
		.exec()
		.then(learnOutcome => {
			console.log(learnOutcome);
			if (learnOutcome) {
				res.json({
					status: 201,
					data: req.body,
				});
			} else {
				res.status(500).json({
					error: 'update error',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.deleteLearningOutcome = async (req, res) => {
	try {
		const { learningOutcomeId } = req.body;
		const { repositoryId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const objectiveQuestionData = await objectiveQuestionModel.find({
			$and: [
				{ 'repository.id': repositoryId },
				{ learningOutcome: learningOutcomeId },
			],
		});
		if (objectiveQuestionData && objectiveQuestionData.length) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message =
				'This learningOutcome is already mapped, pls delete the mapping first';
		} else {
			message = 'learningOutcome deleted Successfully';
			await learnOutcomeModel.deleteOne({ _id: learningOutcomeId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		console.log(err);
		res.status(404).json({
			status: 'fail',
			message: err.message,
		});
	}
};
