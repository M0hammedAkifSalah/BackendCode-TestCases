const mongoose = require('mongoose');
const AdminModel = require('../model/admin');

exports.Create = async (req, res) => {
	try {
		AdminModel.find({
			mobile: req.body.mobile,
		})
			.exec()
			.then(mobile => {
				if (mobile.length >= 1) {
					return res.json({
						error: 'Mobile Already Exist',
						status: 802,
					});
				}
				const admin = new AdminModel({
					_id: mongoose.Types.ObjectId(),
					username: req.body.username,
					password: req.body.password,
					name: req.body.name,
					mobile: req.body.mobile,
					dob: req.body.dob,
					gender: req.body.gender,
					qualification: req.body.qualification,
					designation: req.body.designation,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
				});
				admin
					.save()
					.then(result => {
						res.status(201).json({
							message: 'Admin profile created successfully',
							status: 201,
							data: result,
						});
					})
					.catch(err => {
						res.json({
							erroe: err,
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
			message: 'Failed',
			status: 400,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const admin = await AdminModel.find();
		res.status(201).json({
			status: 200,
			result: admin.length,
			data: admin,
		});
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.getById = async (req, res) => {
	try {
		const admin = await AdminModel.findById(req.params.id);
		if (admin == 0) {
			res.json({
				status: 404,
				message: ' Invalid Id',
			});
		} else {
			res.status(200).json({
				status: 200,
				admin,
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
		const admin = {
			username: req.body.username,
			password: req.body.password,
			name: req.body.name,
			mobile: req.body.mobile,
			dob: req.body.dob,
			gender: req.body.gender,
			qualification: req.body.qualification,
			designation: req.body.designation,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		};
		AdminModel.findByIdAndUpdate(
			{
				_id: req.params.id,
			},
			admin
		)
			.exec()
			.then(aname => {
				if (aname) {
					res.status(201).json({
						message: 'Profile save successfully',
						status: 201,
					});
				} else {
					res.json({
						error: aname,
						status: 400,
					});
				}
			})
			.catch(err => {
				res.status(803).json({
					error: 'management details not found',
					status: 803,
				});
			});
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};
