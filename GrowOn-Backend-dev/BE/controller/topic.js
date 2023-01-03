const mongoose = require('mongoose');
const TopicModel = require('../model/topic');
const APIFeatures = require('../utils/apiFeatures');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const ObjectiveQuestionModel = require('../model/objectiveQuestion');
const LearnOutcomeModel = require('../model/learnOutcome');

exports.GetAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			TopicModel.find({}).populate(
				'syllabus_id board_id class_id subject_id chapter_id'
			),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features.query;
		res.json({
			status: 200,
			result: topic.length,
			data: topic,
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
			TopicModel.find({}).populate(
				'syllabus_id board_id class_id subject_id chapter_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		const topic = await features.query;
		res.json({
			status: 200,
			result: topic.length,
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
			TopicModel.find({}).populate(
				'syllabus_id board_id class_id subject_id chapter_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features.query;
		res.json({
			status: 200,
			result: topic.length,
			data: topic,
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
			TopicModel.find({}).populate(
				'syllabus_id board_id class_id subject_id chapter_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features.query;
		res.json({
			status: 200,
			result: topic.length,
			data: topic,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.filtermedia = async (req, res) => {
	try {
		const features = new APIFeatures(
			TopicModel.find({}).select(
				'-tags -chapter_id -topic_image -class_id -board_id -about_file -repository -_id -name -subject_id -syllabus_id -chapter_image -description -created_by -updated_by -updatedAt'
			),
			req.body
		)
			.filter()
			.limitFields();

		const chapter = await features.query;
		const list = [];
		for (const ele of chapter) {
			for (const ele2 of ele.files_upload) {
				list.push(ele2);
			}
		}
		res.json({
			status: 201,
			result: list.length,
			data: list,
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
		chapters.forEach(ele => {
			if (ele) chap.push(ele);
		});
		req.body.chapter_id = chap;
		const features = new APIFeatures(
			TopicModel.find({}).populate(
				'subject_id chapter_id syllabus_id board_id class_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features.query;
		res.json({
			status: 200,
			result: topic.length,
			data: topic,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.GetById = async (req, res) => {
	try {
		const topic = await TopicModel.findById(req.params.id).populate(
			'syllabus_id board_id class_id subject_id chapter_id'
		);
		if (topic.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			res.json({
				status: 201,
				data: {
					topic,
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
		await TopicModel.find({
			name: req.body.name,
		})
			.exec()
			.then(async name => {
				if (name.length >= 1000) {
					return res.json({
						error: 'User Already Exist',
						status: 802,
					});
				}
				let board = [];
				let syllabus = [];

				// board = req.body.board_id.filter(f => f);
				if (typeof req.body.board_id === 'string') {
					board = [req.body.board_id];
				} else {
					board = req.body.board_id ? req.body.board_id.filter(f => f) : null;
				}
				// syllabus = req.body.syllabus_id.filter(f => f);
				if (typeof req.body.syllabus_id === 'string') {
					syllabus = [req.body.syllabus_id];
				} else {
					syllabus = req.body.syllabus_id
						? req.body.syllabus_id.filter(f => f)
						: null;
				}
				let topic = null;
				if (board && syllabus) {
					for (const i of board) {
						for (const j of syllabus) {
							topic = new TopicModel({
								_id: new mongoose.Types.ObjectId(),
								name: req.body.name,
								files_upload: req.body.files_upload,
								about_file: req.body.about_file,
								class_id: req.body.class_id,
								board_id: i,
								subject_id: req.body.subject_id,
								syllabus_id: j,
								chapter_id: req.body.chapter_id,
								topic_image: req.body.topic_image,
								description: req.body.description,
								repository: req.body.repository,
								created_by: req.body.created_by,
								updated_by: req.body.updated_by,
							});
							await topic
								.save()
								.then(result => {})
								.catch(err =>
									res.json({
										error: err,
										status: 411,
									})
								);
						}
					}
					return res.status(201).json({
						message: 'created successfully',
						status: 201,
						data: topic,
					});
				}
				topic = new TopicModel({
					_id: new mongoose.Types.ObjectId(),
					name: req.body.name,
					files_upload: req.body.files_upload,
					about_file: req.body.about_file,
					class_id: req.body.class_id,
					subject_id: req.body.subject_id,
					chapter_id: req.body.chapter_id,
					topic_image: req.body.topic_image,
					description: req.body.description,
					repository: req.body.repository,
					created_by: req.body.created_by,
					updated_by: req.body.updated_by,
				});
				topic
					.save()
					.then(result => {
						res.status(201).json({
							message: 'created successfully',
							status: 201,
						});
					})
					.catch(err => {
						res.json({
							error: err,
							status: 411,
						});
					});
			})
			.catch(err => {
				res.json({
					error: err,
					status: 411,
				});
			});
	} catch (error) {
		res.json({
			error,
			message: error.message,
		});
	}
};

exports.Update = async (req, res, next) => {
	const oldData = await TopicModel.findById(req.params.id);
	let obj = oldData.files_upload;
	if (!req.body.files_upload.length) {
		obj = [];
	} else {
		for (const ele of req.body.files_upload) {
			obj.push(ele);
		}
	}
	TopicModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			name: req.body.name,
			class_id: req.body.class_id,
			files_upload: obj,
			about_file: req.body.about_file,
			board_id: req.body.board_id,
			subject_id: req.body.subject_id,
			syllabus_id: req.body.syllabus_id,
			chapter_id: req.body.chapter_id,
			topic_image: req.body.topic_image,
			description: req.body.description,
			repository: req.body.repository,
			created_by: req.body.created_by,
		}
	)
		.exec()
		.then(topic => {
			console.log(topic);
			if (topic) {
				res.status(200).json({
					message: req.body,
				});
			} else {
				res.status(500).json({
					error: 'error updating',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.deleteTopic = async (req, res) => {
	try {
		const { topicId } = req.body;
		const { repositoryId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const objectiveQuestionData = await ObjectiveQuestionModel.find({
			$and: [{ 'repository.id': repositoryId }, { topic_id: topicId }],
		});
		const learningOutcomeData = await LearnOutcomeModel.find({
			$and: [
				{ 'repository.id': repositoryId },
				{ topic_id: mongoose.Types.ObjectId(topicId) },
			],
		});
		if (
			(objectiveQuestionData && objectiveQuestionData.length) ||
			(learningOutcomeData && learningOutcomeData.length)
		) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This topic is already mapped, pls delete the mapping first';
		} else {
			message = 'Topic deleted Successfully';
			await TopicModel.deleteOne({ _id: topicId });
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

exports.deleteContent = async (req, res) => {
	try {
		const { topicId } = req.body;
		const { fileUploadId } = req.body;
		await TopicModel.findByIdAndUpdate(topicId, {
			$pull: { files_upload: { _id: mongoose.Types.ObjectId(fileUploadId) } },
		});
		res.status(200).json({
			status: 200,
			message: 'Content deleted successfully',
		});
	} catch (err) {
		console.log(err);
		res.status(404).json({
			status: 404,
			message: err.message,
		});
	}
};
