const mongoose = require('mongoose');
const STypeModel = require('../model/stype');
const APIFeatures = require('../utils/apiFeatures');

exports.Create = (req, res, next) => {
	try {
		STypeModel.find({
			stype: req.body.stype,
		})
			.exec()
			.then(stype => {
				if (stype.length >= 100) {
					res.json({
						error: 'stype Already Exist',
						status: 802,
					});
				} else {
					const stype1 = new STypeModel({
						_id: new mongoose.Types.ObjectId(),
						stype: req.body.stype,
						createdBy: req.body.createdBy,
						updatedBy: req.body.updatedBy,
					});
					stype1
						.save()
						.then(result => {
							res.status(201).json({
								message: 'stype created successfully',
								status: 201,
								result,
							});
						})
						.catch(err => {
							res.json({
								error: err,
								status: 411,
							});
						});
				}
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
			STypeModel.find({}).select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const stype = await features.query;
		res.status(200).json({
			data: stype,
		});
	} catch (err) {
		res.status(422).json({
			data: err,
		});
	}
};

exports.getByID = async (req, res) => {
	try {
		const stype = await STypeModel.findById(req.params.id);
		if (!stype) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		}
		res.status(200).json({
			status: 'success',
			data: stype,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	const { id } = req.params;
	try {
		const stype = await STypeModel.findById(id);
		if (!stype) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		} else {
			const updatestype = await STypeModel.findByIdAndUpdate(id, {
				stype: req.body.stype,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};
