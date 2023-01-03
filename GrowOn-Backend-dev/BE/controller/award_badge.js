const mongoose = require('mongoose');
const AwardBadgeModel = require('../model/award_badge');
const APIFeatures = require('../utils/apiFeatures');

exports.create = async (req, res) => {
	try {
		const award_badge = new AwardBadgeModel({
			_id: new mongoose.Types.ObjectId(),
			title: req.body.title,
			repository: req.body.repository,
			file_upload: req.body.file_upload,
			createdBy: req.body.createdBy,
		});
		award_badge
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
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(
			AwardBadgeModel.find({}).populate({
				path: 'teacher_id',
				select: 'name profile_image',
			}),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const award_badgeData = await features.query;
		res.json({
			status: 200,
			results: award_badgeData.length,
			data: award_badgeData,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const award_badgeData = await AwardBadgeModel.findById(req.params.id);
		res.json({
			status: 200,
			data: award_badgeData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
