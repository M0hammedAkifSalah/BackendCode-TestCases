const express = require('express');

const router = express.Router();
const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');

const roleModel = require('../model/role');
const userModel = require('../model/user');

// search
exports.search = async (req, res, next) => {
	try {
		const { searchValue } = req.body;
		const { filterKeysArray } = req.body;
		const findObj = {};
		const searchArray = [];
		for (const ele of filterKeysArray) {
			const element = {
				[ele]: { $regex: searchValue, $options: 'i' },
			};
			searchArray.push(element);
		}
		if (searchArray && searchArray.length) {
			findObj.$or = searchArray;
		}

		await roleModel.find(findObj, (err, data) => {
			if (err) {
				console.log(err);
				res.status(400).json({
					data: err,
				});
			} else {
				res.status(201).json({
					data,
				});
			}
		});
	} catch (error) {
		console.log(error);
	}
};

exports.Create = (req, res, next) => {
	try {
		const roleName = req.body.role_name.replace(' ', '_');
		roleModel
			.find({ $and: [{ role_name: roleName }, { type: 'system' }] })
			.exec()
			.then(user => {
				if (user.length) {
					return res.status(409).json({
						message: 'exists',
					});
				}

				roleModel
					.find({
						$and: [
							{ role_name: roleName },
							{ 'repository.id': req.body.repository[0].id },
						],
					})
					.exec()
					.then(user1 => {
						if (user1.length) {
							res.status(409).json({
								message: 'exists',
							});
						} else {
							// eslint-disable-next-line new-cap
							const user2 = new roleModel({
								_id: new mongoose.Types.ObjectId(),
								role_name: roleName,
								display_name: req.body.display_name,
								description: req.body.description,
								level: req.body.level,
								type: req.body.type,
								privilege: req.body.privilege,
								repository: req.body.repository,
							});
							user2
								.save()
								.then(result => {
									res.status(201).json({
										message: 'added successfully',
										data: result,
									});
								})
								.catch(err => {
									res.status(500).json({
										error: err,
									});
								});
						}
					});
			});
	} catch (err) {
		res.status(500).json({
			error: err,
		});
	}
};

exports.Get = async (req, res) => {
	try {
		const obj = [];
		console.log(req.body['repository.id']);
		console.log(req.body);
		const features = new APIFeatures(roleModel.find({}), req.body)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const user = await features.query;
		for (const ele of user) {
			if (
				ele.role_name != 'teacher' &&
				ele.role_name != 'principal' &&
				ele.role_name != 'management' &&
				ele.role_name != 'school_admin' &&
				ele.role_name != 'admin'
			) {
				obj.push(ele);
			}
		}

		res.json({
			status: 201,
			result: obj.length,
			data: obj,
		});
	} catch (error) {
		console.log(error);
		res.json({
			status: 400,
			message: error,
		});
	}
};

/// //////find all permission //////////////////////
exports.GetAll = async (req, res, next) => {
	const role = await roleModel.find();
	res.status(200).json({
		status: 'success',
		data: role,
	});
};

exports.exist = async (req, res, next) => {
	const role_name = req.body.role_name.toLowerCase().trim().replace(' ', '_');

	const role = await roleModel.findOne({ role_name });
	if (role) {
		res.status(200).json({
			flag: true,
			data: role,
		});
	} else {
		res.status(200).json({
			flag: false,
			data: role,
		});
	}
};
exports.GetAllDashboard = async (req, res, next) => {
	const role = await roleModel
		.find()
		.select(
			'-description -type -privilege -createdAt -updatedAt -repository -level -__v'
		);
	res.status(200).json({
		status: 'success',
		length: role.length,
		data: role,
	});
};

exports.Update = async (req, res, next) => {
	roleModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				role_name: req.body.role_name,
				display_name: req.body.display_name,
				description: req.body.description,
				level: req.body.level,
				type: req.body.type,
				privilege: req.body.privilege,
				repository: req.body.repository,
			}
		)
		.exec()
		.then(roles => {
			if (roles) {
				res.status(200).json({
					message: 'successfully updated',
				});
			} else {
				res.status(500).json({
					error: 'error updating',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.deleteRole = async (req, res) => {
	try {
		const { roleId } = req.body;
		let isMapRole = false;
		let responeStatus = 200;
		let message;
		const userData = await userModel.find({
			profile_type: mongoose.Types.ObjectId(roleId),
		});

		if (userData && userData.length) isMapRole = true;
		if (isMapRole) {
			responeStatus = 400;
			message = 'This role is already mapped, pls delete the mapping first';
		} else {
			message = 'Role deleted Successfully';
			await roleModel.deleteOne({ _id: roleId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
