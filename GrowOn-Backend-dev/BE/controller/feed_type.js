const mongoose = require('mongoose');
const FeedTypeModel = require('../model/feed_type');
const APIFeatures = require('../utils/apiFeatures');

exports.create = async (req, res) => {
	try {
		const feedType = new FeedTypeModel({
			_id: new mongoose.Types.ObjectId(),
			title: req.body.title,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
		});
		feedType
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
		const features = new APIFeatures(FeedTypeModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const feedTypeData = await features.query;
		res.json({
			status: 200,
			results: feedTypeData.length,
			data: feedTypeData,
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
		const feedTypeData = await FeedTypeModel.findById(req.params.id);
		res.json({
			status: 200,
			data: feedTypeData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
