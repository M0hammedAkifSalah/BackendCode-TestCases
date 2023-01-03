/* eslint-disable new-cap */
const mongoose = require('mongoose');
const taxonomyMappingModel = require('../model/mappingTaxonomyModel');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllClass = async (req, res) => {
	try {
		console.log('0--------------------------------------------');
		const features = new APIFeatures(taxonomyMappingModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const classData = await features.query;
		res.json({
			status: 200,
			results: classData.length,
			data: classData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err,
		});
	}
};
exports.getTour = async (req, res) => {
	try {
		const getClass = await taxonomyMappingModel.findById(req.params.id);
		res.json({
			status: 200,
			data: {
				getClass,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.createMapping = async (req, res) => {
	try {
		const features = new APIFeatures(
			taxonomyMappingModel.find({}),
			req.query
		).filter();
		const classData = await features.query;
		console.log('----------------------------', classData);
		if (classData.length >= 1) {
			res.json({
				error: 'Already Exist',
				status: 802,
			});
		} else {
			const classData1 = new taxonomyMappingModel({
				_id: new mongoose.Types.ObjectId(),
				class_id: req.body.class_id,
				board_id: req.body.board_id,
				syllabus_id: req.body.syllabus_id,
				subject_id: req.body.subject_id,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
			});
			classData1
				.save()
				.then(result => {
					res.status(201).json({
						message: 'created successfully',
						status: 201,
						data: result,
					});
				})
				.catch(err => {
					res.status(400).json({
						error: err.message,
						status: 411,
					});
				});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.updateTour = async (req, res) => {
	try {
		const classUpdate = await taxonomyMappingModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({
			status: 201,
			data: 'update successfully',
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.deleteTour = async (req, res) => {
	try {
		await taxonomyMappingModel.findByIdAndDelete(req.params.id);
		res.json({
			status: 201,
			data: null,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};
