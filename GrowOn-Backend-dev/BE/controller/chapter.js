const mongoose = require('mongoose');
const ChapterModel = require('../model/chapter');
const APIFeatures = require('../utils/apiFeatures');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const ObjectiveQuestionModel = require('../model/objectiveQuestion');
const TopicsModel = require('../model/topic');

exports.GetAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			ChapterModel.find({}).populate(
				'syllabus_id board_id class_id subject_id'
			),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const chapter = await features.query;
		res.json({
			status: 201,
			result: chapter.length,
			data: chapter,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.GetAllCount = async (req, res) => {
	try {
		const features = new APIFeatures(
			ChapterModel.find({}).populate(
				'syllabus_id board_id class_id subject_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		const chapter = await features.query;
		res.json({
			status: 201,
			result: chapter.length,
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
			ChapterModel.find({}).populate(
				'syllabus_id board_id class_id subject_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const chapter = await features.query;
		res.json({
			status: 201,
			result: chapter.length,
			data: chapter,
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
		let features = new APIFeatures(
			ChapterModel.find({}).populate(
				'syllabus_id board_id class_id subject_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		features = await features.query;
		let count = new APIFeatures(
			ChapterModel.find({}).populate(
				'syllabus_id board_id class_id subject_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.count();
		count = await count.query;
		res.json({
			status: 201,
			result: count,
			data: features,
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
			ChapterModel.find({}).select(
				'-class_id -board_id -about_file -repository -_id -name -subject_id -syllabus_id -chapter_image -description -created_by -createdAt -updated_by -updatedAt'
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
		const features = new APIFeatures(
			ChapterModel.find({}).populate(
				'subject_id class_id board_id syllabus_id'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const chapter = await features.query;
		res.json({
			status: 201,
			result: chapter.length,
			data: chapter,
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
		const chapter = await ChapterModel.findById(req.params.id).populate(
			'syllabus_id board_id class_id subject_id'
		);
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
		const features = new APIFeatures(ChapterModel.find({}), req.query).filter();
		const Data = await features.query;
		if (Data.length >= 1) {
			return res.json({
				error: 'Already Exist',
				status: 802,
			});
		}
		let board = [];
		let syllabus = [];
		if (typeof req.body.board_id === 'string') {
			board = [req.body.board_id];
		} else {
			board = req.body.board_id ? req.body.board_id.filter(f => f) : null;
		}
		if (typeof req.body.syllabus_id === 'string') {
			syllabus = [req.body.syllabus_id];
		} else {
			syllabus = req.body.syllabus_id
				? req.body.syllabus_id.filter(f => f)
				: null;
		}
		let chapter = [];
		if (board && syllabus) {
			for (const i of board) {
				for (const j of syllabus) {
					chapter = new ChapterModel({
						_id: new mongoose.Types.ObjectId(),
						name: req.body.name,
						about_file: req.body.about_file,
						files_upload: req.body.files_upload,
						class_id: req.body.class_id,
						board_id: i,
						subject_id: req.body.subject_id,
						syllabus_id: j,
						chapter_image: req.body.chapter_image,
						description: req.body.description,
						repository: req.body.repository,
						created_by: req.body.created_by,
						updated_by: req.body.updated_by,
					});
					chapter
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
				data: chapter,
			});
		}
		chapter = new ChapterModel({
			_id: new mongoose.Types.ObjectId(),
			name: req.body.name,
			about_file: req.body.about_file,
			files_upload: req.body.files_upload,
			class_id: req.body.class_id,
			subject_id: req.body.subject_id,
			chapter_image: req.body.chapter_image,
			description: req.body.description,
			repository: req.body.repository,
			created_by: req.body.created_by,
			updated_by: req.body.updated_by,
		});
		chapter
			.save()
			.then(result =>
				res.status(201).json({
					message: 'created successfully',
					status: 201,
					data: chapter,
				})
			)
			.catch(err => {
				res.json({
					error: err,
					status: 411,
				});
			});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.Update = async (req, res, next) => {
	/* const oldData = await ChapterModel.findById(req.params.id);
	let obj = oldData.files_upload;
	if (!req.body.files_upload.length) {
		obj = [];
	} else {
		for (const ele of req.body.files_upload) {
			obj.push(ele);
		}
	} */
	await ChapterModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			name: req.body.name,
			files_upload: req.body.files_upload,
			about_file: req.body.about_file,
			class_id: req.body.class_id,
			board_id: req.body.board_id,
			subject_id: req.body.subject_id,
			syllabus_id: req.body.syllabus_id,
			chapter_image: req.body.chapter_image,
			description: req.body.description,
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
					data: chapter,
				});
			} else {
				res.status(500).json({
					error: 'something went wrong',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.deleteChapter = async (req, res) => {
	try {
		const { chapterId } = req.body;
		const { repositoryId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const objectiveQuestionData = await ObjectiveQuestionModel.find({
			$and: [{ 'repository.id': repositoryId }, { chapter: chapterId }],
		});
		const topicsData = await TopicsModel.find({
			$and: [
				{ 'repository.id': repositoryId },
				{ chapter_id: mongoose.Types.ObjectId(chapterId) },
			],
		});
		if (
			(objectiveQuestionData && objectiveQuestionData.length) ||
			(topicsData && topicsData.length)
		) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This chapter is already mapped, pls delete the mapping first';
		} else {
			message = 'Chapter deleted Successfully';
			await ChapterModel.deleteOne({ _id: chapterId });
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
		const { chapterId } = req.body;
		const { fileUploadId } = req.body;

		await ChapterModel.findByIdAndUpdate(chapterId, {
			$pull: { files_upload: [{ _id: mongoose.Types.ObjectId(fileUploadId) }] },
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
