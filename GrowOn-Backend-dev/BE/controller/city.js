const mongoose = require('mongoose');
const CityModel = require('../model/city');
const APIFeatures = require('../utils/apiFeatures');

exports.Create = (req, res, next) => {
	try {
		CityModel.find({
			city_name: req.body.city_name,
		})
			.exec()
			.then(city_name => {
				if (city_name.length >= 100) {
					return res.json({
						error: 'city Already Exist',
						status: 802,
					});
				}
				const city = new CityModel({
					_id: new mongoose.Types.ObjectId(),
					state_id: req.body.state_id,
					city_name: req.body.city_name,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				city
					.save()
					.then(result => {
						res.status(201).json({
							message: 'city created successfully',
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
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(CityModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const city = await features.query;
		res.status(200).json({
			message: 'success',
			result: city.length,
			data: city,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getByID = async (req, res) => {
	try {
		const city = await CityModel.findById(req.params.id);
		if (!city) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		}
		res.status(200).json({
			status: 'success',
			data: city,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getCitiesByState = async (req, res) => {
	const { id } = req.params;
	try {
		const cities = await CityModel.find({ state_id: id })
			.select('city_name')
			.sort('city_name');
		if (!cities) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		} else {
			res.status(200).json({
				status: 'success',
				data: cities,
			});
		}
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
		const city = await CityModel.findById(id);
		if (!city) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		} else {
			await CityModel.findByIdAndUpdate(id, {
				state_id: req.body.state_id,
				city_name: req.body.city_name,
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
			status: 'failed',
			message: err,
		});
	}
};
