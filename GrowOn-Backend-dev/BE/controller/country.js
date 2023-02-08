const mongoose = require('mongoose');

const CountryModel = require('../model/country');

const redisClient = require('../config/redisClient');
const catchAsync = require('../utils/catchAsync');

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

exports.getAllData = catchAsync(async (req, res) => {
	const cacheKey = `countries:all`;
	const cachedData = await redisClient.GET(cacheKey);

	let countriesData = [];
	if (cachedData) {
		countriesData = JSON.parse(cachedData);
	} else {
		countriesData = await CountryModel.find({});
		await redisClient.SET(cacheKey, JSON.stringify(countriesData), {
			EX: 24 * 60 * 60,
		});
	}

	res.json({
		status: 200,
		message: 'success',
		results: countriesData.length,
		data: countriesData,
	});
});

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
