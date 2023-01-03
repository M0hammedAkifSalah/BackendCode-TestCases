const mongoose = require('mongoose');
const TeacherModel = require('../model/teacher');
const UserModel = require('../model/user');

const passwordUtil = require('../utils/password');
const ErrorResponse = require('../utils/errorResponse');

exports.Create = async (req, res) => {
	try {
		TeacherModel.find({
			mobile: req.body.mobile,
		})
			.exec()
			.then(mobile => {
				if (mobile.length >= 1) {
					return res.json({
						error: 'Mobile number Already Exist',
						status: 802,
					});
				}

				const teacher = new TeacherModel({
					_id: new mongoose.Types.ObjectId(),
					username: req.body.username,
					name: req.body.name,
					mobile: req.body.mobile,
					profile_type: req.body.profile_type,
					school_id: req.body.school_id,
					branch_id: req.body.branch_id,
					designation: req.body.designation,
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
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				teacher
					.save()
					.then(result => {
						res.status(201).json({
							message: 'Teacher Profile successfully Created',
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
		const teacherData = await TeacherModel.find();
		res.json({
			status: 200,
			result: teacherData.length,
			data: {
				teacherData,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getAllTeacherIds = async (req, res) => {
	try {
		const teacherData = await TeacherModel.find({
			school_id: req.body.school_id,
		});
		const allTeacherIds = teacherData.map(ele => ele._id);
		res.json({
			status: 200,
			result: allTeacherIds.length,
			data: {
				allTeacherIds,
			},
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
		const teacherData = await TeacherModel.findById(req.params.id);
		if (teacherData == 0) {
			res.status(400).json({
				status: 'failed',
				message: 'Invailed Id',
			});
		} else {
			res.status(200).json({
				status: 'success',
				teacherData,
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
		const teacher = {
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
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		};
		TeacherModel.findByIdAndUpdate(
			{
				_id: req.params.id,
			},
			teacher
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
					error: 'teacher details Not Found',
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

exports.login = async (req, res, next) => {
	try {
		TeacherModel.find({
			username: req.body.username,
		})
			.populate('School')
			.exec()
			.then(async teacher => {
				if (teacher.length < 1) {
					return res.json({
						status: 401,
						message: 'User does Not Exist',
					});
				}
				//  bcrypt.compare(req.body.password, user[0].password, (err, result) => {
				if (!req.body.password) {
					return res.json({
						status: 401,
						message: 'Please Provide password',
					});
				}

				if (teacher.profileStatus !== 'APPROVED') {
					return next(
						new ErrorResponse(`User is in ${teacher.profileStatus} state`, 403)
					);
				}

				let isMatch = null;

				if (teacher[0].password === req.body.password) {
					isMatch = true;
					// hash password if it isnt hashed.
					// remove this in future.
					teacher[0].password = req.body.password;
					teacher[0].markModified('password');
					await teacher[0].save();
				} else {
					isMatch = await teacher[0].comparePassword(req.body.password);
				}

				if (isMatch) {
					const token = await passwordUtil.genJwtToken(teacher[0]._id);

					return res.status(200).json({
						message: 'Auth successful',
						token,
						user_info: teacher,
					});
				}
				return res.status(411).json({
					message: 'Please Provide Correct Password',
				});
			})
			.catch(err => {
				res.status(500).json({
					error: err.message,
				});
			});
	} catch (err) {
		res.status(400).jso({
			message: 'error',
		});
	}
};

exports.updateDeviceToken = async (req, res, next) => {
	UserModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			DeviceToken: req.body.device_token,
		}
	)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: 'token Updated',
				});
			} else {
				res.status(500).json({
					message: 'fail to update',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};
