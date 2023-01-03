/* eslint-disable no-inner-declarations */
/* eslint-disable no-unused-expressions */
const mongoose = require('mongoose');
const csv = require('fast-csv');
const { Readable } = require('stream');
const excel = require('excel4node');
const UserModel = require('../model/user');
const APIFeatures = require('../utils/apiFeatures');
const CountryModel = require('../model/country');
const CityModel = require('../model/city');
const RoleModel = require('../model/roles');
const StateModel = require('../model/state');
const ClassModel = require('../model/class');
const SectionModel = require('../model/section');
const StudentModel = require('../model/student');
const roleModel = require('../model/role');
const schoolModel = require('../model/school');
const userGlobalData = require('../data/user');

// const User = require('../model/user');

const checkLimitAndPage = require('../utils/checkLimitAndPage');
const passwordUtil = require('../utils/password');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

exports.GetAll = catchAsync(async (req, res, next) => {
	const userQuery = new APIFeatures(
		UserModel.find({}, {}, { withProfileStatus: 'ALL' })
			.populate('role', 'role_name display_name')
			.populate('school_id', 'schoolName schoolImage'),
		req.query
	)
		.filter()
		.limitFields()
		.paginate();

	const users = await userQuery.query;

	res.status(200).json(SuccessResponse(users, users.length));
});

exports.GetAllGlobalData = catchAsync(async (req, res, next) => {
	res.status(200).json(SuccessResponse(userGlobalData, 1, 'Ok'));
});

exports.dailyCoins = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const date = new Date();
	const rewards = {
		coins: 0,
		dailyCoins: 5,
		isClaimed: true,
		date,
	};
	const foundStudent = await UserModel.findById(id);
	let { rewards: reward, coin } = foundStudent;
	coin = coin + reward.coins + reward.dailyCoins;
	const updatedReward = await UserModel.findOneAndUpdate(
		{ _id: id },
		{
			coin,
			rewards,
		},
		{
			new: true,
		}
	);
	res
		.status(200)
		.json(
			SuccessResponse(
				updatedReward,
				updatedReward.length,
				'Updated SuccessFully'
			)
		);
});

exports.getUserRewards = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const { rewards } = await UserModel.findOne({ _id: id }, { rewards: 1 });
	const { isClaimed, date } = rewards;
	if (date < today && isClaimed == true) {
		rewards.isClaimed = false;
	}
	res.status(200).json(SuccessResponse(rewards, 1, 'Fetched SuccessFully'));
});

exports.UpdateactiveStatus = async (req, res, next) => {
	UserModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			activeStatus: req.body.activeStatus,
		}
	)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: 'Updated',
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

exports.deleteUser = async (req, res, next) => {
	const deletedData = await UserModel.delete({
		school_id: req.body.schoolId,
	});

	res.status(200).json({
		data: deletedData,
	});
};
exports.excelSheet = catchAsync(async (req, res, next) => {
	const { schoolList } = req.body;
	const workbook = new excel.Workbook();
	for (const ele of schoolList) {
		const school = await schoolModel
			.findOne(
				{ _id: mongoose.Types.ObjectId(ele) },
				{ schoolName: 1, country: 1, state: 1, city: 1 }
			)
			.populate('country state city', 'country_name state_name city_name');
		const country = school.country.country_name;
		const state = school.state.state_name;
		const city = school.city.city_name;
		const worksheet = workbook.addWorksheet(`${school.schoolName}`);
		const style = workbook.createStyle({
			font: {
				bold: true,
				color: '#000000',
				size: 12,
			},
			numberFormat: '$#,##0.00; ($#,##0.00); -',
		});
		const teachers = await UserModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(ele),
					deleted: {
						$ne: true,
					},
				},
			},
			{
				$project: {
					_id: 1,
					name: '$name',
					designation: '$designation',
					gender: '$gender',
					contact_number: '$username',
					address: '$address',
					aadhar_card: '$aadhar_card',
					mother_tounge: '$mother_tounge',
					caste: '$caste',
					experience: '$experience',
					pf_number: '$pf_number',
					dob: '$dob',
					email: '$email',
					pincode: '$pincode',
					blood_group: '$blood_gr',
					religion: '$religion',
					qualification: '$qualification',
					marital_status: '$marital_status',
					esi_number: '$esi_number',
					school_name: '$ten_details.school',
					school_board: '$ten_details.Board',
					school_percentage: '$ten_details.percentage',
					school_year_of_passing: '$ten_details.percentage',
					college_name: '$twelve_details.school',
					college_board: '$twelve_details.board',
					college_percentage: '$twelve_details.percentage',
					college_year_of_passing: '$twelve_details.year_of_passing',
					graduation_college_name: '$graduation_details.school',
					graduation_board: '$graduation_details.board',
					graduation_percentage: '$graduation_details.percentage',
					graduation_year_of_passing: '$graduation_details.year_of_passing',
					master_college_name: '$masters_details.school',
					masters_board: '$masters_details.board',
					masters_percentage: '$masters_details.percentage',
					masters_year_of_passing: '$masters_details.year_of_passing',
					institution_name: '$experience_list.institution_name',
					joining_date: '$experience_list.joining_date',
					served_as: '$experience_list.served_as',
					reliving_date: '$experience_list.reliving_date',
					served_for: '$experience_list.served_for',
					experience_certificate: '$experience_list.experience_certificate',
				},
			},
		]);
		worksheet.cell(1, 1).string('NAME').style(style);
		worksheet.cell(1, 2).string('DESIGNATION').style(style);
		worksheet.cell(1, 3).string('GENDER').style(style);
		worksheet.cell(1, 4).string('CONTACT NUMBER').style(style);
		worksheet.cell(1, 5).string('COUNTRY').style(style);
		worksheet.cell(1, 6).string('STATE').style(style);
		worksheet.cell(1, 7).string('CITY').style(style);
		worksheet.cell(1, 8).string('ADDRESS').style(style);
		worksheet.cell(1, 9).string('AADHAR NO').style(style);
		worksheet.cell(1, 10).string('MOTHER TONGUE').style(style);
		worksheet.cell(1, 11).string('CASTE').style(style);
		worksheet.cell(1, 12).string('TEACHING EXPERIENCE').style(style);
		worksheet.cell(1, 13).string('PF NUMBER').style(style);
		worksheet.cell(1, 14).string('DOB').style(style);
		worksheet.cell(1, 15).string('EMAIL').style(style);
		worksheet.cell(1, 16).string('PINCODE').style(style);
		worksheet.cell(1, 17).string('BLOOD GROUP').style(style);
		worksheet.cell(1, 18).string('RELIGION').style(style);
		worksheet.cell(1, 19).string('QUALIFICATION').style(style);
		worksheet.cell(1, 20).string('MARITAL STATUS').style(style);
		worksheet.cell(1, 21).string('ESI NUMBER').style(style);
		worksheet.cell(1, 22).string('SCHOOL NAME').style(style);
		worksheet.cell(1, 23).string('SCHOOL BOARD').style(style);
		worksheet.cell(1, 24).string('SCHOOL PERCENTAGE').style(style);
		worksheet.cell(1, 25).string('SCHOOL PASSING YEAR').style(style);
		worksheet.cell(1, 26).string('COLLEGE NAME').style(style);
		worksheet.cell(1, 27).string('COLLEGE BOARD').style(style);
		worksheet.cell(1, 28).string('COLLEGE PERCENTAGE').style(style);
		worksheet.cell(1, 29).string('COLLEGE PASSING YEAR').style(style);
		worksheet.cell(1, 30).string('GRADUATION COLLEGE NAME').style(style);
		worksheet.cell(1, 31).string('GRADUATION BOARD').style(style);
		worksheet.cell(1, 32).string('GRADUATION PERCENTAGE').style(style);
		worksheet.cell(1, 33).string('GRADUATION PASSING YEAR').style(style);
		worksheet.cell(1, 34).string('MASTERS COLLEGE NAME').style(style);
		worksheet.cell(1, 35).string('MASTERS BOARD').style(style);
		worksheet.cell(1, 36).string('MASTERS PERCENTAGE').style(style);
		worksheet.cell(1, 37).string('MASTERS PASSING YEAR').style(style);
		worksheet.cell(1, 38).string('INSTITUTION NAME').style(style);
		worksheet.cell(1, 39).string('SERVED AS').style(style);
		worksheet.cell(1, 40).string('JOINING DATE').style(style);
		worksheet.cell(1, 41).string('RELIVING DATE').style(style);
		worksheet.cell(1, 42).string('SERVED FOR (YEARS)').style(style);
		worksheet.cell(1, 43).string('EXPERIENCE CERTIFICATE').style(style);
		let row = 2;
		let col = 1;
		teachers.forEach(async user => {
			worksheet.cell(row, col).string(user.name);
			worksheet.cell(row, col + 1).string(user.designation);
			worksheet.cell(row, col + 2).string(user.gender);
			worksheet.cell(row, col + 3).string(user.contact_number);
			worksheet.cell(row, col + 4).string(country);
			worksheet.cell(row, col + 5).string(state);
			worksheet.cell(row, col + 6).string(city);
			worksheet.cell(row, col + 7).string(user.address);
			worksheet.cell(row, col + 8).string(user.aadhar_card);
			worksheet.cell(row, col + 9).string(user.mother_tongue);
			worksheet.cell(row, col + 10).string(user.caste);
			worksheet.cell(row, col + 11).string(user.experience);
			worksheet.cell(row, col + 12).string(user.pf_number);
			worksheet.cell(row, col + 13).string(user.dob);
			worksheet.cell(row, col + 14).string(user.email);
			worksheet.cell(row, col + 15).string(user.pincode);
			worksheet.cell(row, col + 16).string(user.blood_group);
			worksheet.cell(row, col + 17).string(user.religion);
			worksheet.cell(row, col + 18).string(user.qualification);
			worksheet.cell(row, col + 19).string(user.marital_status);
			worksheet.cell(row, col + 20).string(user.esi_number);
			worksheet.cell(row, col + 21).string(user.school_name);
			worksheet.cell(row, col + 22).string(user.school_board);
			worksheet.cell(row, col + 23).string(user.school_percentage);
			worksheet.cell(row, col + 24).string(user.school_year_of_passing);
			worksheet.cell(row, col + 25).string(user.college_name);
			worksheet.cell(row, col + 26).string(user.college_board);
			worksheet.cell(row, col + 27).string(user.college_percentage);
			worksheet.cell(row, col + 28).string(user.college_year_of_passing);
			worksheet.cell(row, col + 29).string(user.graduation_college_name);
			worksheet.cell(row, col + 30).string(user.graduation_board);
			worksheet.cell(row, col + 31).string(user.graduation_percentage);
			worksheet.cell(row, col + 32).string(user.graduation_year_of_passing);
			worksheet.cell(row, col + 33).string(user.master_college_name);
			worksheet.cell(row, col + 34).string(user.masters_board);
			worksheet.cell(row, col + 35).string(user.masters_percentage);
			worksheet.cell(row, col + 36).string(user.masters_year_of_passing);
			worksheet.cell(row, col + 37).string(user.institution_name);
			worksheet.cell(row, col + 38).string(user.joining_date);
			worksheet.cell(row, col + 39).string(user.served_as);
			worksheet.cell(row, col + 40).string(user.reliving_date);
			worksheet.cell(row, col + 41).string(user.served_for);
			worksheet.cell(row, col + 42).string(user.experience_certificate);
			row += 1;
			col = 1;
		});
	}
	workbook.write('Teachers_list.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(SuccessResponse(data, data.length, 'fetched'));
});

exports.Create = async (req, res) => {
	try {
		let isSubmitForm = null;
		let hashPassword = '000';
		let isTeacher = false;

		await RoleModel.findById(req.body.profile_type)
			.exec()
			.then(schoolAdmin => {
				if (schoolAdmin) {
					if (schoolAdmin.role_name == 'school_admin') {
						isSubmitForm = true;
						hashPassword = req.body.password;
					}
					if (schoolAdmin.role_name === 'teacher') {
						isTeacher = true;
					}
				}
			});

		const sectionsList = await SectionModel.aggregate([
			{
				$match: {
					school: mongoose.Types.ObjectId(req.body.school_id),
				},
			},
			{
				$group: {
					_id: '$class_id',
					section: {
						$push: '$_id',
					},
				},
			},
			{
				$project: {
					_id: 0,
					secondClasses: '$_id',
					section: 1,
				},
			},
		]);

		const pin_code = null;
		UserModel.find({
			mobile: req.body.mobile,
			school_id: req.body.school_id,
			profile_type: req.body.profile_type,
		})
			.exec()
			.then(mobile => {
				if (mobile.length >= 1) {
					return res.status(400).json({
						data: ' Mobile number Already Exist',
					});
				}

				const userObj = new UserModel({
					_id: new mongoose.Types.ObjectId(),
					username: req.body.mobile,
					activeStatus: true,
					profile_image: req.body.profile_image,
					name: req.body.name,
					mobile: req.body.mobile,
					isSubmitForm,
					profile_type: req.body.profile_type,
					role: req.body.profile_type,
					secondary_profile_type: req.body.secondary_profile_type,
					school_id: req.body.school_id,
					branch_id: req.body.branch_id,
					designation: req.body.designation,
					gender: req.body.gender,
					password: hashPassword,
					experience_list: req.body.experience_list,
					pin: pin_code,
					qualification: req.body.qualification,
					primary_class: req.body.primary_class,
					primary_section: req.body.primary_section,
					secondary_class: isTeacher ? sectionsList : [], // ...req.body.secondary_class, ...sectionsList
					subject: req.body.subject,
					dob: req.body.dob,
					email: req.body.email,
					experience: req.body.experience,
					address: req.body.address,
					aadhar_card: req.body.aadhar_card,
					blood_gr: req.body.blood_gr,
					religion: req.body.religion,
					caste: req.body.caste,
					mother_tounge: req.body.mother_tounge,
					marital_status: req.body.marital_status,
					experiance: req.body.experiance,
					level: req.body.level,
					city: req.body.city,
					state: req.body.state,
					country: req.body.country,
					pincode: req.body.pincode,
					leaderShip_Exp: req.body.leaderShip_Exp,
					cv: req.body.cv,
					ten_details: req.body.ten_details,
					twelve_details: req.body.twelve_details,
					graduation_details: req.body.graduation_details,
					other_education: req.body.other_education,
					masters_details: req.body.masters_details,
					other_degrees: req.body.other_degrees,
					certifications: req.body.certifications,
					extra_achievement: req.body.extra_achievement,
					repository: req.body.repository,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				userObj
					.save()
					.then(result => {
						res.status(201).json({
							data: result,
						});
					})
					.catch(err => {
						res.status(411).json({
							data: err,
						});
					});
			})
			.catch(err => {
				res.status(411).json({
					data: err,
				});
			});
	} catch (err) {
		res.status(400).json({
			data: 'failed',
		});
	}
};

exports.CreateMany = catchAsync(async (req, res, next) => {
	const uncreatedUsers = [];
	const createdUsers = [];
	const { users } = req.body;
	const schoolId = users[0].school_id;

	const sectionsList = await SectionModel.aggregate([
		{
			$match: {
				school: mongoose.Types.ObjectId(schoolId),
			},
		},
		{
			$group: {
				_id: '$class_id',
				section: {
					$push: '$_id',
				},
			},
		},
		{
			$project: {
				_id: 0,
				secondClasses: '$_id',
				section: 1,
			},
		},
	]);

	for (const user of users) {
		try {
			const hashPassword = '000';
			const isExist = await UserModel.find({
				mobile: user.mobile,
				school_id: user.school_id,
				profile_type: user.profile_type,
			});
			delete user.password;
			if (isExist.length > 0) {
				uncreatedUsers.push({
					...user,
					error: 'User Already exist',
				});
			} else {
				const des_name = await roleModel.findOne({ _id: user.profile_type });
				const createdUser = await UserModel.create({
					...user,
					_id: new mongoose.Types.ObjectId(),
					activeStatus: true,
					username: user.mobile,
					role: user.profile_type,
					password: hashPassword,
					designation: des_name.role_name,
					secondary_class: sectionsList,
				});

				createdUsers.push(createdUser);
			}
		} catch (err) {
			uncreatedUsers.push({
				...user,
				error: err.message || 'something went wrong',
			});
		}
	}

	const schoolData = await schoolModel.findOne({ _id: schoolId });
	const { isLead } = schoolData;
	if (isLead) {
		const userExist = await UserModel.findOne({
			school_id: schoolData._id,
			designation: { $ne: 'school_admin' },
		});
		const studExist = await StudentModel.findOne({ school_id: schoolData._id });
		if (userExist && studExist) {
			await schoolModel.updateOne(
				{ _id: schoolId },
				{
					$set: {
						isLead: false,
					},
				}
			);
		}
	}

	if (uncreatedUsers.length) {
		return res.status(400).json({
			isSuccess: false,
			status: 'fail',
			error: 'error creating users',
			data: uncreatedUsers,
		});
	}

	return res
		.status(201)
		.json(
			SuccessResponse(
				createdUsers,
				createdUsers.length,
				'Users created successfully'
			)
		);
});

exports.userFilter = catchAsync(async (req, res, next) => {
	try {
		const payload = {
			deleted: false,
		};
		function queryGen(params) {
			const newArr = params.split('-');
			const lower = newArr[0];
			const upper = newArr[1];
			return { $gte: lower, $lte: upper };
		}
		req.body.school_id ? (payload.school_id = req.body.school_id) : null;
		req.body.age ? (payload.age = queryGen(req.body.age)) : null;
		req.body.gender ? (payload.gender = req.body.gender) : null;
		req.body.ten_details
			? (payload.ten_details = { percentage: queryGen(req.body.ten_details) })
			: null;
		req.body.twelve_details
			? (payload.twelve_details = {
					percentage: queryGen(req.body.twelve_details),
			  })
			: null;
		req.body.graduation_details
			? (payload.graduation_details = {
					percentage: queryGen(req.body.graduation_details),
			  })
			: null;
		req.body.qualification
			? (payload.qualification = req.body.qualification)
			: null;
		req.body.experience
			? (payload.experience = queryGen(req.body.experience))
			: null;
		req.body.state ? (payload.state = req.body.state) : null;
		req.body.city ? (payload.city = req.body.city) : null;
		req.body.religion ? (payload.religion = req.body.religion) : null;
		req.body.marital_status
			? (payload.marital_status = req.body.marital_status)
			: null;
		req.body.blood_gr ? (payload.blood_gr = req.body.blood_gr) : null;
		req.body.masters_details
			? (payload.master_detials = {
					percentage: queryGen(req.body.masters_details),
			  })
			: null;
		req.body.designation ? (payload.designation = req.body.designation) : null;
		const userdata = await UserModel.find(payload)
			.populate('school_id', '_id schoolName')
			.populate('city', '_id city_name')
			.populate('state', '_id state_name')
			.populate('country', '_id country_name')
			.populate('branch_id', '_id name')
			.populate('profile_type', '_id role_name');
		const finalobj = [];
		const { page } = req.query;
		const { limit } = req.query;
		const skip = (page - 1) * limit;
		for (let i = skip; i < parseInt(limit) + skip && i < userdata.length; i++) {
			finalobj.push(userdata[i]);
		}
		res.status(200).json(SuccessResponse(finalobj, userdata.length, 'Success'));
	} catch (err) {
		console.log(err);
		res.status(400).json({
			data: err.message,
		});
	}
});

exports.Get = async (req, res) => {
	try {
		const obj = [];
		const features = new APIFeatures(
			UserModel.find({})
				.populate('profile_type secondary_profile_type')
				.populate('school_id', 'schoolName schoolImage'),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const user = await features.query;
		// console.log(user);
		for (const ele of user) {
			if (ele.profile_type) {
				const role = await RoleModel.findById(ele.profile_type);
				if (
					role &&
					(role.role_name != 'school Admin' ||
						role.role_name != 'principal' ||
						role.role_name != 'management' ||
						role.role_name != 'role_name' ||
						role.role_name != 'admin')
				) {
					obj.push(ele);
				}
			}
		}
		res.status(201).json({
			// status: 201,
			result: obj.length,
			data: obj,
		});
	} catch (error) {
		// console.log(error);
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.DeleteUser = async (req, res, next) => {
	try {
		const { mobile } = req.body;
		await UserModel.delete({ mobile });
		res.status(200).json({
			status: 'success deleted successfully',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.deleteUserBySchool = async (req, res, next) => {
	try {
		const { isGlobal } = req.body;
		const { isStudent } = req.body;
		const { repositoryId } = req.body;
		const { userId } = req.body;
		let userData;
		let message = 'User deleted successfully';
		let responseStatus = 200;
		if (isGlobal) {
			userData = await UserModel.findOne({
				$and: [
					{ 'repository.id': repositoryId },
					{ _id: mongoose.Types.ObjectId(userId) },
				],
			});
		} else if (isStudent) {
			userData = await StudentModel.findOne({
				$and: [
					{ school_id: repositoryId },
					{ _id: mongoose.Types.ObjectId(userId) },
				],
			});
		} else {
			userData = await UserModel.findOne({
				$and: [
					{ school_id: repositoryId },
					{ _id: mongoose.Types.ObjectId(userId) },
				],
			});
		}
		if (userData) {
			if (isStudent) {
				await StudentModel.delete({ _id: req.body.userId });
			} else {
				await UserModel.delete({ _id: req.body.userId });
			}
		} else {
			message = 'Invalid user id';
			responseStatus = 400;
		}
		res.status(responseStatus).json({
			status: responseStatus,
			message,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.userIdByRole = async (req, res) => {
	try {
		const teacherobj = [];
		const principleobj = [];
		const managementobj = [];
		let finalobj = [];

		const features = new APIFeatures(
			UserModel.find({})
				.populate('subject', 'name')
				.populate('secondary_profile_type', 'display_name')
				.populate('school_id')
				.select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields();
		// .paginate();
		const teacherData = await features.query;
		// console.log(teacherData);
		for (const ele of teacherData) {
			const role = await roleModel
				.findById(ele.profile_type)
				.select(
					'-privilege, -description, -display_name, -createdAt, -updatedAt, -__v'
				);
			if (role.role_name == 'teacher') {
				teacherobj.push(ele._id);
			}
			if (role.role_name == 'principal') {
				principleobj.push(ele._id);
			}
			if (role.role_name == 'management') {
				managementobj.push(ele._id);
			}
			finalobj = teacherobj.concat(principleobj);
			finalobj = finalobj.concat(managementobj);
		}
		res.status(200).json({
			data: finalobj,
		});
	} catch (err) {
		// console.log('err', err);
		res.status(400).status(400).json({
			data: err,
		});
	}
};

exports.userByRole = async (req, res) => {
	try {
		const obj = [];
		let { flag } = req.body;
		delete req.body.flag;
		checkLimitAndPage(req);
		const features = new APIFeatures(
			UserModel.find({})
				.populate('subject', 'name')
				.populate('secondary_profile_type', 'display_name')
				.populate('school_id')
				.populate('branch_id', '_id name')
				.populate('profile_type')
				.select('-createdAt -updatedAt'),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		// .paginate();
		let teacherData = await features.query;
		if (flag == 'principle') {
			flag = 'principal';
		}
		if (flag) {
			teacherData = teacherData.filter(
				ele => ele.profile_type.role_name === flag
			);
		}
		// console.log(teacherData);
		if (flag && req.query.page && req.query.limit) {
			const finalobj = [];
			const { page } = req.query;
			const { limit } = req.query;
			const skip = (page - 1) * limit;
			for (
				let i = skip;
				i < parseInt(limit) + skip && i < teacherData.length;
				i++
			) {
				finalobj.push(teacherData[i]);
			}
			res.status(200).json({
				result: finalobj.length,
				data: finalobj,
			});
		} else {
			res.status(200).json({
				result: teacherData.length,
				data: teacherData,
			});
		}
	} catch (err) {
		// console.log('err', err);
		res.status(400).json({
			data: err.message,
		});
	}
};

exports.userByRoleCount = async (req, res) => {
	try {
		let teacherData = [];
		let { flag } = req.body;
		delete req.body.flag;
		let complied = [];
		const features = new APIFeatures(
			UserModel.find({})
				.populate('subject', 'name')
				.populate('secondary_profile_type', 'display_name')
				.populate('school_id')
				.populate('profile_type')
				.select('-createdAt -updatedAt'),
			req.body
		)
			.filter()
			.sort()
			.limitFields();
		// .paginate();
		teacherData = await features.query;
		complied = JSON.parse(JSON.stringify(teacherData));
		// console.log(teacherData);
		if (flag == 'principle') {
			flag = 'principal';
		}
		teacherData = complied.filter(
			ele => ele.profile_type && ele.profile_type.role_name === flag
		);

		res.status(200).json({
			result: teacherData.length,
		});
	} catch (err) {
		res.status(400).status(400).json({
			data: err.message,
		});
	}
};
exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(
			UserModel.find({})
				.populate('subject', 'name')
				.populate('secondary_profile_type', 'display_name')
				.populate('profile_type', 'display_name')
				.populate('school_id', 'schoolName')
				.select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();

		const teacherData = await features.query;

		if (teacherData) {
			const mainObj = [];
			let city;
			let country;
			let state;
			let pClass;
			const responeData1 = JSON.parse(JSON.stringify(teacherData));
			for (const responeData of responeData1) {
				if (responeData.secondary_class) {
					const obj = [];
					let secondClasses;
					let section;
					for (const element1 of responeData.secondary_class) {
						if (element1.secondClasses) {
							secondClasses = await ClassModel.findById(
								element1.secondClasses
							).select(
								'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
							);
						}
						if (element1.section) {
							section = await SectionModel.findById(element1.section).select(
								'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
							);
						}
						if (secondClasses) {
							let sectionId;
							let sectionName;
							if (!section) {
								sectionId = '';
								sectionName = '';
							} else {
								sectionId = section._id;
								sectionName = section.name;
							}
							obj.push({
								classId: secondClasses._id,
								className: secondClasses.name,
								sectionId,
								sectionName,
							});
							responeData.secondary_class = obj;
							secondClasses = '';
							section = '';
						}
					}
				}

				if (responeData.primary_class) {
					if (responeData.primary_class.length == 24) {
						pClass = await ClassModel.findById(
							responeData.primary_class
						).select('-repository -state_id');
						if (pClass) {
							responeData.primaryClassName = pClass.name;
						}
					}
				}
				if (responeData.primary_section) {
					if (responeData.primary_section.length == 24) {
						// console.log(responeData.primary_section);
						const pSection = await SectionModel.findById(
							responeData.primary_section
						).select('-repository -state_id');
						if (pSection) {
							// console.log(pSection);
							responeData.primarySectionName = pSection.name;
						}
					}
				}

				if (responeData.city) {
					if (responeData.city.length == 24) {
						city = await CityModel.findById(responeData.city).select(
							'-repository -state_id'
						);
						if (city) {
							responeData.cityName = city.city_name;
						}
					}
				}
				if (responeData.country) {
					if (responeData.country.length == 24) {
						country = await CountryModel.findById(responeData.country).select(
							'-repository -state_id -_id'
						);
						if (country) {
							responeData.countryName = country.country_name;
						}
					}
				}
				if (responeData.state) {
					if (responeData.state.length == 24) {
						state = await StateModel.findById(responeData.state).select(
							'-repository -state_id -_id'
						);
						if (state) {
							responeData.stateName = state.state_name;
						}
					}
				}

				mainObj.push(responeData);
			}
			res.status(200).json({
				result: mainObj.length,
				data: mainObj,
			});
		} else {
			res.status(401).json({
				data: 'Data not Found',
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).status(400).json({
			data: err,
		});
	}
};

exports.getAlluserData = async (req, res) => {
	try {
		if (req.query.school_code || req.query.mobile) {
			if (req.query.school_code) {
				const schoolData = await schoolModel.find({
					school_code: req.query.school_code,
				});
				if (schoolData && schoolData.length) {
					for (const ele of schoolData) {
						const userData = await UserModel.find({ school_id: ele._id });
						if (userData) {
							res.status(200).json({
								result: userData.length,
								data: userData,
							});
						}
					}
				}
			} else if (req.query.mobile) {
				const userData = await UserModel.find({ mobile: req.query.mobile });
				if (userData) {
					res.status(200).json({
						result: userData.length,
						data: userData,
					});
				}
			} else {
				res.status(401).json({
					data: 'School Code not Found',
				});
			}
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).status(400).json({
			data: err,
		});
	}
};

exports.getAllteacherIds = async (req, res) => {
	try {
		const features = new APIFeatures(
			UserModel.find({})
				.populate('subject', 'name')
				.populate('secondary_profile_type', 'display_name')
				.populate('profile_type', 'display_name')
				.populate('school_id', 'schoolName')
				.select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();

		const teacherData = await features.query;

		if (teacherData) {
			const mainObj = [];
			let city;
			let country;
			let state;
			let pClass;
			const responeData1 = JSON.parse(JSON.stringify(teacherData));
			for (const responeData of responeData1) {
				mainObj.push(responeData._id);
			}
			res.status(200).json({
				result: mainObj.length,
				data: mainObj,
			});
		} else {
			res.status(401).json({
				data: 'Data not Found',
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).status(400).json({
			data: err,
		});
	}
};

/// //////////////////dashboard///////////////////////////////
exports.AllDashboardData = async (req, res) => {
	try {
		const features = new APIFeatures(
			UserModel.find({})
				.select('+password')
				.populate('profile_type')
				.populate('role')
				.populate('secondary_profile_type')
				.populate({
					path: 'school_id',
					select: '_id schoolName school_code schoolImage',
					populate: { path: 'institute', select: 'name profile_image' },
				})
				.populate({ path: 'subject', select: 'name' }),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const teacherData = await features.query;
		if (teacherData) {
			let mainObj = [];
			let city;
			let country;
			let state;
			let pClass;
			const responeData1 = JSON.parse(JSON.stringify(teacherData));
			for (const responeData of responeData1) {
				if (responeData.secondary_class) {
					const obj = [];
					let secondClasses;
					let section;
					for (const element1 of responeData.secondary_class) {
						if (element1.secondClasses) {
							secondClasses = await ClassModel.findById(
								element1.secondClasses
							).select(
								'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
							);
						}
						if (element1.section) {
							section = await SectionModel.findById(element1.section).select(
								'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
							);
						}
						if (secondClasses) {
							let sectionId;
							let sectionName;
							if (!section) {
								sectionId = '';
								sectionName = '';
							} else {
								sectionId = section._id;
								sectionName = section.name;
							}
							obj.push({
								classId: secondClasses._id,
								className: secondClasses.name,
								sectionId,
								sectionName,
							});
							responeData.secondary_class = obj;
							secondClasses = '';
							section = '';
						}
					}
				}

				if (responeData.primary_class) {
					if (responeData.primary_class.length == 24) {
						pClass = await ClassModel.findById(
							responeData.primary_class
						).select('-repository -state_id');
						if (pClass) {
							responeData.primaryClassName = pClass.name;
						}
					}
				}
				if (responeData.primary_section) {
					if (responeData.primary_section.length == 24) {
						const pSection = await SectionModel.findById(
							responeData.primary_section
						).select('-repository -state_id');
						if (pSection) {
							responeData.primarySectionName = pSection.name;
						}
					}
				}

				if (responeData.city) {
					if (responeData.city.length == 24) {
						city = await CityModel.findById(responeData.city).select(
							'-repository -state_id'
						);
						if (city) {
							responeData.cityName = city.city_name;
						}
					}
				}
				if (responeData.country) {
					if (responeData.country.length == 24) {
						country = await CountryModel.findById(responeData.country).select(
							'-repository -state_id -_id'
						);
						if (country) {
							responeData.countryName = country.country_name;
						}
					}
				}
				if (responeData.state) {
					if (responeData.state.length == 24) {
						state = await StateModel.findById(responeData.state).select(
							'-repository -state_id -_id'
						);
						if (state) {
							responeData.stateName = state.state_name;
						}
					}
				}

				mainObj.push(responeData);
			}

			// not to break the frontend app will be removed once FE update.
			// pass password val as pin in usr obj
			mainObj = mainObj.map(item => ({ ...item, pin: item.password || null }));

			res.status(200).json({
				status: 200,
				result: mainObj.length,
				data: mainObj,
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};
/// //////////////////////////// get teacher class /////////////////

exports.getteacherClass = async (req, res) => {
	try {
		const teacherDataList = [];
		const features = new APIFeatures(
			UserModel.find({}).select(
				'-syllabus_id -repository -board_id -secondary_profile_type -subject -other_degrees -certifications -extra_achievement -ten_details -twelve_details -graduation_details -masters_details'
			),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const teacherData = await features.query;
		for (const tdata of teacherData) {
			let primaryClass = '';
			let primarySection = '';
			const pclassdata = await ClassModel.findById(tdata.primary_class).select(
				''
			);
			if (pclassdata) {
				primaryClass = pclassdata.name;
				tdata.primary_class_name = pclassdata.name;
			}
			const psectiondata = await SectionModel.findById(
				tdata.primary_section
			).select('');
			if (psectiondata) {
				primarySection = psectiondata.name;
			}
			const secondClassesList = [];
			if (tdata.secondary_class && tdata.secondary_class.length) {
				for (const sclass of tdata.secondary_class) {
					let obj = {};
					const sectionobj = {};

					const classdata = await ClassModel.findById(
						sclass.secondClasses
					).select('');
					const sectiondata = await SectionModel.findById(
						sclass.section
					).select('');
					if (sectiondata) {
						sectionobj.name = sectiondata.name;
						sectionobj.id = sectiondata._id;
					}
					if (classdata) {
						obj = {
							className: classdata.name,
							classId: classdata._id,
							section: [sectionobj],
						};
					}

					secondClassesList.push(obj);
				}
			}
			tdata.secondary_class = secondClassesList;
			const resp = JSON.parse(JSON.stringify(tdata));
			resp.primary_class_name = primaryClass;
			resp.primary_section_name = primarySection;
			teacherDataList.push(resp);
		}
		res.json({
			status: 200,
			classData: teacherDataList,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

/// ////////////////////////////////teacher id ////////
exports.getteacherId = async (req, res) => {
	try {
		const features = new APIFeatures(
			UserModel.find({}).select(
				'-syllabus_id -repository -board_id -secondary_profile_type -subject -other_degrees -certifications -extra_achievement -ten_details -twelve_details -graduation_details -masters_details'
			),
			req.body
		)
			.filter()
			// .sort()
			.limitFields()
			.paginate();
		const teacherData = await features.query;
		const primaryClass = teacherData.map(ele => ele._id);
		res.json({
			status: 200,
			Data: primaryClass,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

/// ///////////////////////////////////////////////////////////////
exports.getById = async (req, res) => {
	try {
		const teacherData = await UserModel.findById(req.params.id)
			.populate('profile_type')
			.populate('secondary_profile_type')
			.populate({
				path: 'school_id',
				select: '_id schoolName school_code schoolImage',
				populate: { path: 'institute', select: 'name profile_image' },
			})
			.populate({ path: 'subject', select: 'name' })
			.select('-createdAt -updatedAt');

		if (teacherData) {
			const mainObj = [];
			let city;
			let country;
			let state;
			let pClass;
			const responeData = JSON.parse(JSON.stringify(teacherData));
			if (responeData.secondary_class) {
				const obj = [];
				let secondClasses;
				let section;
				for (const element1 of responeData.secondary_class) {
					if (element1.secondClasses) {
						secondClasses = await ClassModel.findById(
							element1.secondClasses
						).select(
							'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
						);
					}
					if (element1.section) {
						section = await SectionModel.findById(element1.section).select(
							'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
						);
					}
					if (secondClasses) {
						let sectionId;
						let sectionName;
						if (!section) {
							sectionId = '';
							sectionName = '';
						} else {
							sectionId = section._id;
							sectionName = section.name;
						}
						obj.push({
							classId: secondClasses._id,
							className: secondClasses.name,
							sectionId,
							sectionName,
						});
						responeData.secondary_class = obj;
						secondClasses = '';
						section = '';
					}
				}
			}

			if (responeData.primary_class) {
				if (responeData.primary_class.length == 24) {
					pClass = await ClassModel.findById(responeData.primary_class).select(
						'-repository -state_id'
					);
					if (pClass) {
						responeData.primaryClassName = pClass.name;
					}
				}
			}
			if (responeData.primary_section) {
				if (responeData.primary_section.length == 24) {
					const pSection = await SectionModel.findById(
						responeData.primary_section
					).select('-repository -state_id');
					if (pSection) {
						responeData.primarySectionName = pSection.name;
					}
				}
			}

			if (responeData.city) {
				if (responeData.city.length == 24) {
					city = await CityModel.findById(responeData.city).select(
						'-repository -state_id'
					);
					if (city) {
						responeData.cityName = city.city_name;
					}
				}
			}
			if (responeData.country) {
				if (responeData.country.length == 24) {
					country = await CountryModel.findById(responeData.country).select(
						'-repository -state_id -_id'
					);
					if (country) {
						responeData.countryName = country.country_name;
					}
				}
			}
			if (responeData.state) {
				if (responeData.state.length == 24) {
					state = await StateModel.findById(responeData.state).select(
						'-repository -state_id -_id'
					);
					if (state) {
						responeData.stateName = state.state_name;
					}
				}
			}

			mainObj.push(responeData);
			res.status(200).json({
				status: 200,
				result: mainObj.length,
				data: mainObj,
			});
		} else {
			res.status(400).json({
				data: 'Invailed Id',
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			data: err,
		});
	}
};

exports.UpdateIsform = async (req, res) => {
	await UserModel.findByIdAndUpdate(
		{
			_id: req.params.id,
		},
		{ isSubmitForm: req.body.isSubmitForm }
	)
		.exec()
		.then(tname => {
			if (tname) {
				res.status(201).json({
					data: ' status Update successfully',
				});
			} else {
				res.status(400).json({
					data: tname,
				});
			}
		})
		.catch(err => {
			res.status(803).json({
				data: 'teacher details Not Found',
			});
		});
};

exports.Update = async (req, res) => {
	try {
		let isSubmitForm;

		await UserModel.findById(req.params.id)
			.exec()
			.then(schoolAdmin => {
				if (schoolAdmin) {
					isSubmitForm = schoolAdmin.isSubmitForm;
					if (schoolAdmin.isSubmitForm == true) {
						if (req.body.isSubmitForm != null) {
							isSubmitForm = req.body.isSubmitForm;
						}
					}
				}
			});
		const teacher = {
			username: req.body.mobile,
			profile_image: req.body.profile_image,
			name: req.body.name,
			mobile: req.body.mobile,
			isSubmitForm,
			profile_type: req.body.profile_type,
			role: req.body.profile_type,
			school_id: req.body.school_id,
			branch_id: req.body.branch_id,
			designation: req.body.designation,
			gender: req.body.gender,
			qualification: req.body.qualification,
			primary_class: req.body.primary_class,
			primary_section: req.body.primary_section,
			secondary_class: req.body.secondaryClass,
			authorized: req.body.authorized,
			subject: req.body.subject,
			dob: req.body.dob,
			email: req.body.email,
			experience: req.body.experience,
			address: req.body.address,
			aadhar_card: req.body.aadhar_card,
			blood_gr: req.body.blood_gr,
			religion: req.body.religion,
			caste: req.body.caste,
			mother_tounge: req.body.mother_tounge,
			marital_status: req.body.marital_status,
			experiance: req.body.experiance,
			level: req.body.level,
			city: req.body.city,
			state: req.body.state,
			country: req.body.country,
			pincode: req.body.pincode,
			pf_number: req.body.pf_number,
			esi_number: req.body.esi_number,
			leaderShip_Exp: req.body.leaderShip_Exp,
			cv: req.body.cv,
			ten_details: req.body.ten_details,
			twelve_details: req.body.twelve_details,
			graduation_details: req.body.graduation_details,
			other_education: req.body.other_education,
			masters_details: req.body.masters_details,
			other_degrees: req.body.other_degrees,
			certifications: req.body.certifications,
			extra_achievement: req.body.extra_achievement,
			experience_list: req.body.experience_list,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		};
		UserModel.findByIdAndUpdate(
			{
				_id: req.params.id,
			},
			teacher
		)
			.exec()
			.then(tname => {
				if (tname) {
					res.status(201).json({
						data: ' Profile Update successfully',
					});
				} else {
					res.status(400).json({
						data: tname,
					});
				}
			})
			.catch(err => {
				res.status(803).json({
					data: 'teacher details Not Found',
					err: err.message,
				});
			});
	} catch (err) {
		res.status(411).json({
			data: err,
		});
	}
};

exports.login = catchAsync(async (req, res, next) => {
	const { username, password, global, school_code } = req.body;

	if (!username || !password) {
		return next(new ErrorResponse('Username & password required', 401));
	}

	const findQuery = {
		mobile: username,
		activeStatus: true,
	};

	let foundSchool = null;

	if (!global || global.length < 0) {
		if (!school_code) {
			return next(new ErrorResponse('school code is required', 401));
		}

		foundSchool = await schoolModel
			.findOne({ school_code })
			.select('_id school_code schoolImage schoolName');

		if (!foundSchool) {
			return next(new ErrorResponse('school code is invalid', 400));
		}

		findQuery.$or = [
			{ 'repository.id': foundSchool._id },
			{ school_id: foundSchool._id },
		];
	}

	const foundUser = await UserModel.findOne(findQuery)
		.select('+password')
		.populate({
			path: 'profile_type role secondary_profile_type',
			select: 'role_name display_name privilege',
		});

	if (!foundUser) {
		return next(new ErrorResponse('User not found', 404));
	}

	if (global) {
		if (foundUser.role && foundUser.role.role_name !== 'admin') {
			return next(new ErrorResponse('User is not admin', 403));
		}
	}

	if (foundUser.profileStatus !== 'APPROVED') {
		return next(
			new ErrorResponse(`User is in ${foundUser.profileStatus} state`, 403)
		);
	}

	let pwdIsMatch = null;

	if (foundUser.password === password) {
		pwdIsMatch = true;
		// hash password if it isnt hashed.
		// remove this in future.
		foundUser.password = password;
		foundUser.markModified('password');
		await foundUser.save();
	} else {
		pwdIsMatch = await foundUser.comparePassword(password);
	}

	if (!pwdIsMatch) {
		return next(new ErrorResponse('Invalid Password', 402));
	}

	const jwtToken = await passwordUtil.genJwtToken(foundUser._id);

	const parsedUser = JSON.parse(JSON.stringify(foundUser));

	if (foundSchool) {
		parsedUser.school_details = [foundSchool];
		parsedUser.school_code = foundSchool.school_code;
	}

	res.status(200).json({
		status: 200,
		message: 'Auth successful',
		token: jwtToken,
		user_info: [parsedUser],
	});
});

exports.find = async (req, res, next) => {
	try {
		UserModel.find({
			mobile: req.body.username,
		})
			.select('+password')
			.populate({ path: 'profile_type', select: 'name role_name' })
			.populate({
				path: 'school_id',
				select: '_id schoolName school_code schoolImage',
				populate: { path: 'institute', select: 'name profile_image' },
			})
			.exec()
			.then(user => {
				// console.log('------------', user);
				if (user.length < 1) {
					return res.status(401).json({
						status: 401,
						message: 'user does Not Exist',
					});
				}

				if (req.body.username == user[0].mobile) {
					const foundUser = user[0].toObject();
					foundUser.pin = foundUser.password;
					return res.status(200).json({
						user_info: [foundUser],
					});
				}
			})
			.catch(err => {
				res.status(500).json({
					error: err,
				});
			});
	} catch (err) {
		res.status(400).jso({
			message: 'error',
		});
	}
};

/// //// update password ////
exports.updatePincode = catchAsync(async (req, res, next) => {
	const { id, pincode } = req.body;

	if (!id || !pincode) {
		return next(new ErrorResponse('id & pincode required', 400));
	}

	let user = await UserModel.findOne({ _id: id }).select('password');

	if (!user) {
		return next(new ErrorResponse('User does not exist', 404));
	}

	user.password = pincode.toString();
	user = await user.save();

	res.status(200).json({
		status: 'success',
	});
});

exports.updateUserPassword = catchAsync(async (req, res, next) => {
	let user = null;
	let responeData1 = [];

	if (req.body.school_code) {
		const schoolData = await schoolModel.find({
			school_code: req.body.school_code,
		});
		responeData1 = JSON.parse(JSON.stringify(schoolData));
		if (responeData1) {
			user = await UserModel.findOne({
				$and: [
					{ username: req.body.username },
					{ school_id: responeData1[0]._id },
				],
			});
		} else {
			return next(new ErrorResponse('School does not exist', 404));
		}
	} else {
		user = await UserModel.findOne({
			username: req.body.username,
		});
	}

	if (!user) {
		return next(new ErrorResponse('User does not exist', 404));
	}

	user.password = req.body.password;
	user = await user.save();

	res.status(200).json({
		status: 'success',
		user,
	});
});

/// ///////// mobile login ///////////
exports.mobileLogin = catchAsync(async (req, res, next) => {
	const { id, pincode } = req.body;

	if (!id || !pincode) {
		return next(new ErrorResponse('id and password are required', 400));
	}

	const user = await UserModel.findOne(
		{
			_id: id,
			activeStatus: true,
			profileStatus: { $ne: 'BLOCKED' },
		},
		{},
		{ withProfileStatus: 'ALL' }
	).select('+password');

	if (!user) {
		return next(new ErrorResponse('User does not exist', 400));
	}

	if (user.profileStatus == 'BLOCKED') {
		return next(
			new ErrorResponse(`User is in ${user.profileStatus} state`, 403)
		);
	}

	let isMatch = null;

	if (user.password === pincode) {
		isMatch = true;
		// hash password if it isnt hashed.
		// remove this in future.
		user.password = pincode;
		user.markModified('password');
		await user.save();
	} else {
		isMatch = await user.comparePassword(pincode);
	}

	if (!isMatch) return next(new ErrorResponse('Invalid credentials', 401));

	const token = await passwordUtil.genJwtToken(user._id);

	return res.status(200).json({
		message: 'Auth successful',
		token,
		user_info: [user],
	});
});
/// //////////////// update image ///////
exports.profile_image = async (req, res, next) => {
	try {
		const { id } = req.params;
		const Data = await UserModel.findByIdAndUpdate(id, {
			profile_image: req.body.profile_image,
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// //////////////// update hobbies ///////
exports.UpdateTeacherData = async (req, res, next) => {
	try {
		const { id } = req.params;
		const sudentData = await UserModel.findByIdAndUpdate(id, {
			about_me: req.body.about_me,
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.validationCheck = async (req, res, next) => {
	try {
		const { mobile } = req.body;
		const { type } = req.body;
		const { school_id } = req.body;

		// eslint-disable-next-line default-case
		switch (type) {
			case 'school_admin': {
				const userData = await UserModel.find({
					mobile,
				});
				if (userData.length) {
					const roleId = userData[0].profile_type;
					const roleData = await roleModel.findById(roleId);
					if (roleData) {
						if (roleData.role_name === type) {
							res.status(200).json({
								status: 'Exist',
								flag: true,
							});
						} else {
							res.status(200).json({
								status: 'Not exist',
								flag: false,
							});
						}
					}
				} else {
					res.status(200).json({
						status: 'Not exist',
						flag: false,
					});
				}
				break;
			}
			case 'teacher': {
				const teacherData = await UserModel.find({
					mobile,
				});
				if (teacherData.length) {
					const roleId = teacherData[0].profile_type;
					const roleData = await roleModel.findById(roleId);
					if (roleData) {
						if (roleData.role_name === type) {
							res.status(200).json({
								status: 'Exist',
								flag: true,
							});
						} else {
							res.status(200).json({
								status: 'Not exist',
								flag: false,
							});
						}
					}
				} else {
					res.status(200).json({
						status: 'Not exist',
						flag: false,
					});
				}
				break;
			}
			case 'principal': {
				const principleData = await UserModel.find({
					mobile,
				});
				if (principleData.length) {
					const roleId = principleData[0].profile_type;
					const roleData = await roleModel.findById(roleId);
					if (roleData) {
						if (roleData.role_name === type) {
							res.status(200).json({
								status: 'Exist',
								flag: true,
							});
						} else {
							res.status(200).json({
								status: 'Not exist',
								flag: false,
							});
						}
					}
				} else {
					res.status(200).json({
						status: 'Not exist',
						flag: false,
					});
				}
				break;
			}
			case 'principle': {
				const principleData = await UserModel.find({
					mobile,
				});
				if (principleData.length) {
					const roleId = principleData[0].profile_type;
					const roleData = await roleModel.findById(roleId);
					if (roleData) {
						if (roleData.role_name === type) {
							res.status(200).json({
								status: 'Exist',
								flag: true,
							});
						} else {
							res.status(200).json({
								status: 'Not exist',
								flag: false,
							});
						}
					}
				} else {
					res.status(200).json({
						status: 'Not exist',
						flag: false,
					});
				}
				break;
			}
			case 'management': {
				const managementData = await UserModel.find({
					mobile,
				});
				if (managementData.length) {
					const roleId = managementData[0].profile_type;
					const roleData = await roleModel.findById(roleId);
					if (roleData) {
						// eslint-disable-next-line no-undef
						if (roleData.role_name === type) {
							res.status(200).json({
								status: 'Exist',
								flag: true,
							});
						} else {
							res.status(200).json({
								status: 'Not exist',
								flag: false,
							});
						}
					}
				} else {
					res.status(200).json({
						status: 'Not exist',
						flag: false,
					});
				}
				break;
			}
		}
	} catch (err) {
		console.log(err);
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.ExistWithMobile = async (req, res, next) => {
	try {
		const userData = await UserModel.find({
			mobile: req.body.mobile,
		});
		if (userData.length) {
			res.status(200).json({
				status: 'Exist',
				flag: true,
			});
		} else {
			res.status(200).json({
				status: 'Not exist',
				flag: false,
			});
		}
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// ///////////////////////Bulk Upload /////////////////////
exports.BulkUpload = async (req, res, next) => {
	// console.log('-------------------', req.files);
	if (!req.files) return res.status(400).send('No files were uploaded.');

	const authorFile = req.files.file;

	const authors = [];
	csv
		.fromString(authorFile.data.toString(), {
			headers: true,
			ignoreEmpty: true,
		})
		.on('data', data => {
			data._id = new mongoose.Types.ObjectId();

			authors.push(data);
		})
		.on('end', () => {
			UserModel.create(authors, (err, documents) => {
				if (err) throw err;

				res.send(`${authors.length} authors have been successfully uploaded.`);
			});
		});
};

exports.BulkUpdate = async (req, res, next) => {
	try {
		if (!req.files) {
			return res.status(400).send('No files were uploaded.');
		}
		const authorFile = req.files.file;
		const updatedUsers = [];
		const notUpdatedUsers = [];
		Readable.from(authorFile.data)
			.pipe(csv.parse({ headers: true, ignoreEmpty: true }))
			.on('data', async row => {
				row.ten_details = {
					Board: row.ten_board,
					school: row.ten_details,
					percentage: row.ten_percentage,
					year_of_passing: row.ten_year_of_passing,
					document: row.ten_documents,
				};
				row.twelve_details = {
					Board: row.twelve_board,
					school: row.twelve_details,
					percentage: row.twelve_percentage,
					year_of_passing: row.twelve_year_of_passing,
					document: row.twelve_documents,
				};
				row.masters_details = {
					Board: row.masters_board,
					school: row.masters_details,
					percentage: row.masters_percentage,
					year_of_passing: row.masters_year_of_passing,
					document: row.masters_documents,
				};
				row.graduation_details = {
					Board: row.graduation_board,
					school: row.graduation_details,
					percentage: row.graduation_percentage,
					year_of_passing: row.graduation_year_of_passing,
					document: row.graduation_documents,
				};
				row.secondary_class = [];
				delete row.ten_board;
				delete row.ten_school;
				delete row.ten_percentage;
				delete row.ten_year_of_passing;
				delete row.ten_documents;
				delete row.twelve_board;
				delete row.twelve_school;
				delete row.twelve_percentage;
				delete row.twelve_year_of_passing;
				delete row.twelve_documents;
				delete row.masters_board;
				delete row.masters_school;
				delete row.masters_percentage;
				delete row.masters_year_of_passing;
				delete row.masters_documents;
				delete row.graduation_board;
				delete row.graduation_school;
				delete row.graduation_percentage;
				delete row.graduation_year_of_passing;
				delete row.graduation_documents;
				delete row.branch_name;
				if (row.mobile) {
					const { mobile } = row;
					const userData = await UserModel.findOne({ mobile }).select('_id');
					if (!userData) {
						notUpdatedUsers.push(row);
						console.log(row.mobile);
					} else {
						row._id = userData._id;
						updatedUsers.push(row);
					}
				}
				for (const user of updatedUsers) {
					try {
						await UserModel.findByIdAndUpdate(user._id, user);
					} catch (err) {
						console.log(err.message);
					}
				}
			})
			.on('end', () => {
				res.status(200).json({
					status: 'success',
				});
			})
			.on('error', error => {
				console.log(error.message);
			});
	} catch (err) {
		console.log(err.message);
	}
};

exports.UpdateSchoolId = async (req, res, next) => {
	// console.log('update id');
	try {
		const { id } = req.body;
		const updateExam = await UserModel.findByIdAndUpdate(id, {
			primary_class: req.body.newClassID,
		});
		// console.log('-----------------------', updateExam);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.updateDeviceToken = async (req, res, next) => {
	await UserModel.findOneAndUpdate(
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
				res.status(505).json({
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
