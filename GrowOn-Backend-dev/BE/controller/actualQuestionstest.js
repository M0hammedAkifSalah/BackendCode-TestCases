const mongoose = require('mongoose');
const ChapterModel = require('../model/actualQuestions');

exports.GetAll = async (req, res) => {
	try {
		const question = await ChapterModel.find();
		res.json({
			status: 201,
			result: question.length,
			data: {
				question,
			},
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
		const chapter = await ChapterModel.findById(req.params.id);
		if (chapter.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			res.status(200).json({
				status: 200,
				data: {
					chapter,
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
		ChapterModel.find({
			question_title: req.body.question_title,
		})
			.exec()
			.then(question_title => {
				if (question_title.length >= 1) {
					return res.status(802).json({
						error: 'Already Exist',
						status: 802,
					});
				}
				const chapter = new ChapterModel({
					_id: new mongoose.Types.ObjectId(),
					question_title: req.body.question_title,
					board: req.body.board,
					chapter: req.body.chapter,
					class: req.body.class,
					difficultyLevel: req.body.difficultyLevel,
					subject: req.body.subject,
					syllabus: req.body.syllabus,
					topic: req.body.topic,
					language: req.body.language,
					studentType: req.body.studentType,
					examType: req.body.examType,
					learingOutcome: req.body.learingOutcome,
					question_list: req.body.question_list,
					repository: req.body.repository,
					created_by: req.body.createdBy,
					updated_by: req.body.updatedBy,
				});
				chapter
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
			status: 411,
		});
	}
};

exports.Update = async (req, res, next) => {
	ChapterModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			question_title: req.body.question_title,
			question_list: req.body.question_list,
			repository: req.body.repository,
			created_by: req.body.created_by,
			updated_by: req.body.updated_by,
		}
	)
		.exec()
		.then(chapter => {
			console.log(chapter);
			if (chapter) {
				res.status(200).json({
					message: req.body,
				});
			} else {
				res.status(500).json({
					error: 'chapter not found',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};
