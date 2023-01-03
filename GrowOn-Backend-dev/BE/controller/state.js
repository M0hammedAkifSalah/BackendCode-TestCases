const mongoose = require('mongoose');
const StateModel = require('../model/state');
const { stateArray } = require('../utils/stateArray.json');
const { fetchCityAndState } = require('../utils/cities.js');
const CountryModel = require('../model/country');
const APIFeatures = require('../utils/apiFeatures');
const CityModel = require('../model/city');

exports.Create = (req, res, next) => {
	try {
		StateModel.find({
			state_name: req.body.state_name,
		})
			.exec()
			.then(state_name => {
				if (state_name.length >= 100) {
					return res.json({
						error: 'State Already Exist',
						status: 802,
					});
				}

				const state = new StateModel({
					_id: new mongoose.Types.ObjectId(),
					country_id: req.body.country_id,
					state_name: req.body.state_name,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				state
					.save()
					.then(result => {
						res.status(201).json({
							message: 'state created successfully',
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
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(
			StateModel.find({}).select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const stateData = await features.query;
		if (stateData) {
			res.json({
				status: 200,
				message: 'success',
				result: stateData.length,
				data: stateData,
			});
		} else {
			res.json({
				status: 200,
				message: 'no data found',
				result: stateData.length,
				data: stateData,
			});
		}
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.bulkCreate = async (req, res, next) => {
	try {
		const cityAndStateArray = fetchCityAndState();
		const countryRecord = await CountryModel.findOne({ country_name: 'India' });
		let countryId;
		if (countryRecord) countryId = countryRecord._id;
		else {
			const country = new CountryModel({
				_id: new mongoose.Types.ObjectId(),
				country_name: 'India',
			});
			const countryRecord1 = await country.save();
			countryId = countryRecord1._id;
		}
		for (const state of stateArray) {
			let stateId;
			const isState = await StateModel.find({ state_name: state });
			if (!(isState && isState.length)) {
				const statee = new StateModel({
					_id: new mongoose.Types.ObjectId(),
					country_id: countryId,
					state_name: state,
				});
				const stateRecord = await statee.save();
				stateId = stateRecord._id;
			} else {
				stateId = isState[0]._id;
			}
			const isCityPresent = cityAndStateArray.filter(
				ele => ele.state === state
			);
			if (isCityPresent && isCityPresent.length) {
				for (const cityEle of isCityPresent[0].city) {
					if (cityEle) {
						const isCity = await CityModel.find({ city_name: cityEle });

						if (!(isCity && isCity.length)) {
							const city = new CityModel({
								_id: new mongoose.Types.ObjectId(),
								state_id: stateId,
								city_name: cityEle,
							});
							await city.save();
						} else {
							await CityModel.findByIdAndUpdate(isCity[0]._id, {
								state_id: stateId,
							});
						}
					}
				}
			}
		}
		res.status(200).json({
			status: 'true',
			message: 'Bulk state created succussfully',
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
