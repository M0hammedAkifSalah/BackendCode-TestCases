const mongoose = require('mongoose');
const ManagementModel = require('../model/management');

exports.Create = async (req, res) => {
	try {
		ManagementModel.find({
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
				const management = new ManagementModel({
					_id: mongoose.Types.ObjectId(),
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
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				management
					.save()
					.then(result => {
						res.status(201).json({
							message: 'management Profile successfully Created',
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
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const managementData = await ManagementModel.find();
		res.json({
			status: 200,
			result: managementData.length,
			data: managementData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const managementData = await ManagementModel.findById(req.params.id);
		if (managementData == 0) {
			res.json({
				status: 400,
				message: 'Invalid Id',
			});
		} else {
			res.json({
				status: 200,
				managementData,
			});
		}
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	try {
		const management = {
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
			repository: req.body.repository,
		};
		ManagementModel.findByIdAndUpdate(
			{
				_id: req.params.id,
			},
			management
		)
			.exec()
			.then(tname => {
				if (tname) {
					res.json({
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
					error: 'management details Not Found',
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
