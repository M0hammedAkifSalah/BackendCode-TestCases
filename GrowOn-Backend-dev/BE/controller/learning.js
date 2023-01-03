/* eslint-disable new-cap */
const mongoose = require('mongoose');
const topicModel = require('../model/topic');
const APIFeatures = require('../utils/apiFeatures');
const subjectModel = require('../model/subject');
const chapterModel = require('../model/chapter');

exports.GetSubject = async (req, res) => {
	try {
		const features = new APIFeatures(subjectModel.find({}), req.body)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features.query;
		const responeData1 = JSON.parse(JSON.stringify(topic));
		for (const element of responeData1) {
			for (const element1 of element.repository) {
				const features1 = await chapterModel.find({
					$and: [{ 'repository.id': element1.id }, { subject_id: element._id }],
				});
				element1.chapterCount = features1.length;
			}
		}
		res.json({
			status: 200,
			result: responeData1.length,
			data: responeData1,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.GetChapter = async (req, res) => {
	try {
		const features = new APIFeatures(
			chapterModel
				.find({})
				.select(
					'-repository -updated_by -created_by -syllabus_id -board_id -createdAt -updatedAt'
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

exports.GetAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			topicModel
				.find({})
				.select(
					'-syllabus_id -repository -board_id -created_by -createdAt -updatedAt'
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

/// //////////////////////////////for teacher app learning ///////////////////
exports.GetTeacherData = async (req, res) => {
	try {
		const features = new APIFeatures(
			topicModel
				.find({})
				.select('-repository')
				.populate({ path: 'chapter_id', select: 'name files_upload' })
				.populate({ path: 'subject_id', select: 'name files_upload' }),
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
/// ///////////////////////////////////////get recent file ////////////////////////
exports.GetRecentFile = async (req, res) => {
	try {
		const features1 = new APIFeatures(
			topicModel
				.find({})
				.select('-repository')
				.populate({ path: 'chapter_id', select: 'name files_upload' }),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const topic = await features1.query;
		const features = new APIFeatures(
			chapterModel.find({}).select('-repository'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const chapter = await features.query;
		if (!topic) {
			const fileUpload = topic[0].files_upload;
			const fileUpload1 = topic[0].chapter_id.files_upload;
			const files = fileUpload.concat(fileUpload1);
			res.json({
				status: 200,
				data: fileUpload,
			});
		}
		res.json({
			status: 200,
			data: [],
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

/// //////////////////////////////////////////////////////////////////////////////
exports.Create = async (req, res) => {
	try {
		topicModel
			.find({
				name: req.body.name,
			})
			.exec()
			.then(name => {
				if (name.length >= 1000) {
					return res.json({
						error: 'User Already Exist',
						status: 802,
					});
				}
				const topic = new topicModel({
					_id: new mongoose.Types.ObjectId(),
					name: req.body.name,
					files_upload: req.body.files_upload,
					about_file: req.body.about_file,
					class_id: req.body.class_id,
					board_id: req.body.board_id,
					subject_id: req.body.subject_id,
					syllabus_id: req.body.syllabus_id,
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
							data: result,
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
		res.status(400).json({
			err: 'something went wrong',
		});
	}
};

exports.Update = async (req, res, next) => {
	const oldData = await topicModel.findById(req.params.id);
	const obj = oldData.files_upload;
	for (const ele of req.body.files_upload) {
		obj.push(ele);
	}

	topicModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				name: req.body.name,
				class_id: req.body.class_id,
				files_upload: obj,
				about_file: req.body.about_file,
				tags: req.body.tags,
				subject_id: req.body.subject_id,
				chapter_id: req.body.chapter_id,
				topic_image: req.body.topic_image,
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
					error: '',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.GetById = async (req, res) => {
	try {
		const topic = await topicModel
			.findById(req.params.id)
			.populate('syllabus_id board_id class_id subject_id chapter_id');
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
/// //////////////////////////////Update chapter /////////////////////////
exports.UpdateChapter = async (req, res, next) => {
	chapterModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				$push: { files_upload: req.body.files_upload },
			}
		)

		.exec()
		.then(chapter => {
			console.log(chapter);
			if (chapter) {
				res.status(200).json({
					message: 'successfully updated',
				});
			} else {
				res.status(500).json({
					error: 'update failed',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

/// ///////// update subject  ///////////////////////////
exports.UpdateSubject = async (req, res, next) => {
	subjectModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				$push: { files_upload: req.body.files_upload },
			}
		)

		.exec()
		.then(subject => {
			if (subject) {
				res.status(200).json({
					message: 'successfully updated',
				});
			} else {
				res.status(500).json({
					error: 'update failed',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};
