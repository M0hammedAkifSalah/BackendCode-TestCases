const mongoose = require('mongoose');

const CountryModel = require('../model/country');
const APIFeatures = require('../utils/apiFeatures');

exports.createCountry = async (req, res) => {
	try {
		CountryModel.find({
			country_name: req.body.country_name,
		})
			.exec()
			.then(country_name => {
				if (country_name.length >= 1000) {
					return res.json({
						error: 'country Already Exist',
						status: 802,
					});
				}
				const country = new CountryModel({
					_id: new mongoose.Types.ObjectId(),
					country_name: req.body.country_name,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				country
					.save()
					.then(result => {
						res.status(201).json({
							message: 'country created successfully',
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
		const features = new APIFeatures(CountryModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const countryData = await features.query;
		if (countryData) {
			res.json({
				status: 200,
				message: 'success',
				results: countryData.length,
				data: countryData,
			});
		} else {
			res.json({
				status: 200,
				message: 'no data found',
				results: countryData.length,
				data: countryData,
			});
		}
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const countryData = await CountryModel.findById(req.params.id);
		res.json({
			status: 200,
			data: countryData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
