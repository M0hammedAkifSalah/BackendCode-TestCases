/* eslint-disable new-cap */
const mongoose = require('mongoose');
const principalModel = require('../model/principal');

exports.Create = async (req, res) => {
	try {
		principalModel
			.find({
				mobile: req.body.mobile,
			})
			.exec()
			.then(mobile => {
				if (mobile.length >= 10) {
					return res.json({
						error: ' Mobile number Already Exist',
						status: 802,
					});
				}
				console.log(
					'--------------------------------------------------------------'
				);
				const principal = new principalModel({
					_id: new mongoose.Types.ObjectId(),
					name: req.body.name,
					mobile: req.body.mobile,
					gender: req.body.gender,
					password: req.body.password,
					qualification: req.body.qualification,
					dob: req.body.dob,
					email: req.body.email,
					address: req.body.address,
					aadhar_card: req.body.aadhar_card,
					blood_gr: req.body.blood_gr,
					religion: req.body.religion,
					caste: req.body.caste,
					mother_tounge: req.body.mother_tounge,
					marital_status: req.body.marital_status,
					experiance: req.body.experiance,
					level: req.body.level,
					leaderShip_Exp: req.body.leaderShip_Exp,
					cv: req.body.cv,
					ten_details: req.body.ten_details,
					twelve_details: req.body.twelve_details,
					graduation_details: req.body.graduation_details,
					masters_details: req.body.masters_details,
					other_degrees: req.body.other_degrees,
					certifications: req.body.certifications,
					extra_achievement: req.body.extra_achievement,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				principal
					.save()
					.then(result => {
						res.status(201).json({
							message: 'principal Profile successfully Created',
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
		const principalData = await principalModel.find();
		res.json({
			status: 200,
			result: principalData.length,
			data: principalData,
		});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const principalData = await principalModel.findById(req.params.id);
		if (principalData == 0) {
			res.status(400).json({
				status: 400,
				message: 'Invailed Id',
			});
		} else {
			res.json({
				status: 200,
				principalData,
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
	try {
		const principal = {
			name: req.body.name,
			mobile: req.body.mobile,
			gender: req.body.gender,
			password: req.body.password,
			qualification: req.body.qualification,
			dob: req.body.dob,
			email: req.body.email,
			address: req.body.address,
			aadhar_card: req.body.aadhar_card,
			blood_gr: req.body.blood_gr,
			religion: req.body.religion,
			caste: req.body.caste,
			mother_tounge: req.body.mother_tounge,
			marital_status: req.body.marital_status,
			experiance: req.body.experiance,
			level: req.body.level,
			leaderShip_Exp: req.body.leaderShip_Exp,
			cv: req.body.cv,
			ten_details: req.body.ten_details,
			twelve_details: req.body.twelve_details,
			graduation_details: req.body.graduation_details,
			masters_details: req.body.masters_details,
			other_degrees: req.body.other_degrees,
			certifications: req.body.certifications,
			extra_achievement: req.body.extra_achievement,
			repository: req.body.repository,
		};
		principalModel
			.findByIdAndUpdate(
				{
					_id: req.params.id,
				},
				principal
			)
			.exec()
			.then(tname => {
				if (tname) {
					res.status(201).json({
						message: ' Profile Update successfully',
						status: 201,
					});
				} else {
					res.json({
						error: tname,
						status: 400,
					});
				}
			})
			.catch(err => {
				res.json({
					error: 'principal details Not Found',
					status: 803,
				});
			});
	} catch (err) {
		res.json({
			status: 'failed',
			message: err,
		});
	}
};
