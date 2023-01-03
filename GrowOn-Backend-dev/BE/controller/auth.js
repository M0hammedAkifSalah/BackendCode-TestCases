const mongoose = require('mongoose');

const UserModel = require('../model/user');
const ParentModel = require('../model/parent');
const StudentModel = require('../model/student');
const SessionModel = require('../model/session');
const ActivityModel = require('../model/activity');
const RoleModel = require('../model/role');

const passwordUtil = require('../utils/password');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const successResponse = require('../utils/successResponse');
const otpHelper = require('../utils/otpHelper');

async function stats(id) {
	if (!id) return null;

	const studentId = mongoose.Types.ObjectId(id);

	const activities = await ActivityModel.aggregate([
		{
			$match: {
				'assignTo.student_id': studentId,
			},
		},
		{
			$group: {
				_id: '$activity_type',
				assigned: {
					$sum: 1,
				},
				selected_livepool: {
					$sum: {
						$cond: [
							{
								$eq: [
									{
										$first: '$selected_livepool.selected_by',
									},
									studentId,
								],
							},
							1,
							0,
						],
					},
				},
				acknowledge_by: {
					$sum: {
						$cond: [
							{
								$eq: [
									{
										$first: '$acknowledge_by.acknowledge_by',
									},
									studentId,
								],
							},
							1,
							0,
						],
					},
				},
				going: {
					$sum: {
						$cond: [
							{
								$eq: [
									{
										$first: '$going',
									},
									studentId,
								],
							},
							1,
							0,
						],
					},
				},
				submited_by: {
					$sum: {
						$cond: [
							{
								$eq: [
									{
										$first: '$submited_by.student_id',
									},
									studentId,
								],
							},
							1,
							0,
						],
					},
				},
				selected_checkList: {
					$sum: {
						$cond: [
							{
								$eq: [
									{
										$first: '$selected_checkList.selected_by',
									},
									studentId,
								],
							},
							1,
							0,
						],
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				assigned: 1,
				completed: {
					$sum: [
						'$selected_livepool',
						'$acknowledge_by',
						'$going',
						'$submited_by',
						'$selected_checkList',
					],
				},
			},
		},
	]);

	return activities.reduce(
		(obj, item) => Object.assign(obj, { [item._id]: item }),
		{}
	);
}

exports.getMe = catchAsync(async (req, res, next) => {
	let id = req.user ? req.user._id || null : null;

	id = req.query ? req.query.id || id : null;

	if (!id) {
		return next(new ErrorResponse('user not logged in', 401));
	}

	const populateOptions = [
		{
			path: 'role',
			select: 'role_name display_name',
		},
		{
			path: 'school_id',
			select: 'schoolName school_code schoolImage',
		},
		{
			path: 'branch_id',
			select: 'school_id',
		},
		{
			path: 'city',
			select: 'city_name',
			populate: {
				path: 'state_id',
				select: 'state_name',
				populate: {
					path: 'country_id',
					select: 'country_name',
				},
			},
		},
	];

	const user =
		(await UserModel.findById(id).populate(populateOptions).lean()) ||
		(await ParentModel.findById(id).populate(populateOptions).lean()) ||
		(await StudentModel.findById(id).populate(populateOptions).lean());

	if (!user) return next(new ErrorResponse('User not found', 404));

	// const activityStats = await stats(user._id);

	const resData = {
		...user,
		stats: {
			// activity: activityStats,
		},
	};

	res.status(200).json(successResponse(resData, 1));
});

exports.signup = catchAsync(async (req, res, next) => {
	const {
		schoolId,
		role,
		name,
		phoneNumber,
		password,
		otp,
		gender,
		parent: parentData = {},
	} = req.body;

	if (!role || !schoolId || !phoneNumber || !password || !otp) {
		return next(new ErrorResponse('Fields are required', 400));
	}

	await otpHelper.verifyOtp(phoneNumber, otp);

	let userModel = null;

	const foundRole = await RoleModel.findById(role).lean();

	if (!foundRole) return next(new ErrorResponse('Role undefined', 404));

	const r_name = foundRole.role_name.toUpperCase();
	switch (r_name) {
		case 'STUDENT':
			userModel = StudentModel;
			break;
		case 'PARENT':
			userModel = ParentModel;
			break;
		default:
			userModel = UserModel;
			break;
	}

	const isUserExist = await userModel
		.findOne({ mobile: phoneNumber })
		.select('_id')
		.lean();

	if (isUserExist) {
		return next(new ErrorResponse('User already registered', 400));
	}

	let userData = {
		_id: new mongoose.Types.ObjectId(),
		profileStatus: 'PENDING',
		school_id: schoolId,
		role: foundRole,
		name,
		gender,
		username: phoneNumber,
		mobile: phoneNumber,
		password,
		section: req.body.section || null,
		class: req.body.class || null,
	};
	if (!(r_name == 'STUDENT' || r_name == 'PARENT')) {
		userData.profile_type = foundRole;
		userData.designation = foundRole.role_name;
	}

	if (foundRole.role_name.toUpperCase() === 'STUDENT') {
		// check if user is student
		if (!req.body.section || !req.body.class) {
			return next(new ErrorResponse('Section and class are required', 400));
		}

		if (!parentData.id && !parentData.name) {
			return next(new ErrorResponse('Parent data is required', 400));
		}

		if (parentData.id) {
			const foundParent = await ParentModel.findOne({
				_id: parentData.id,
			}).lean();

			if (!foundParent) {
				return next(new ErrorResponse('Parent not found', 404));
			}

			userData.parent_id = foundParent._id;
		} else {
			const parentRole = await RoleModel.findOne({
				role_name: 'parent',
			}).lean();

			const createdParent = await ParentModel.create({
				...parentData,
				_id: new mongoose.Types.ObjectId(),
				profileStatus: 'PENDING',
				mobile: parentData.phoneNumber || phoneNumber,
				username: parentData.phoneNumber || phoneNumber,
				parentType: parentData.parentType || 'FATHER',
				name: parentData.name || `${name} (parent)`,
				school_id: schoolId,
				role: parentRole._id,
				password: parentData.password || `${password}parent`,
			});

			if (!createdParent) {
				return next(new ErrorResponse('Error creating parent', 400));
			}

			userData.parent_id = createdParent._id;
		}
	}

	if (foundRole.role_name.toUpperCase() === 'PARENT') {
		userData = {
			...req.body,
			...userData,
		};
	}

	let createdUser = await userModel.create(userData);
	createdUser = await createdUser
		.populate({
			path: 'parent_id',
			select: {
				_id: 1,
				username: 1,
				name: 1,
				parentType: 1,
				profile_type: 1,
				guardian: 1,
				father_name: 1,
				mother_name: 1,
				role: 1,
				guardian_name: 1,
				profile_image: 1,
				activeStatus: 1,
			},
			populate: {
				path: 'role',
				select: 'role_name display_name',
			},
		})
		.populate('school_id', 'schoolName school_code schoolImage')
		.populate('class', 'name')
		.populate('section', 'name')
		.execPopulate();
	delete createdUser.password;

	const token = passwordUtil.genJwtToken(createdUser.id);

	res
		.status(201)
		.json(
			successResponse(
				{ token, user: createdUser },
				1,
				'User signed up successfully'
			)
		);
});

exports.login = catchAsync(async (req, res, next) => {
	const { username, password } = req.body;

	if (!username || !password) {
		return next(new ErrorResponse('Username and Password are required', 400));
	}

	const user = await UserModel.findOne({ username })
		.select('+password')
		.populate('role');

	const parent = await ParentModel.findOne({ username })
		.select('+password')
		.populate('role');

	const student = await StudentModel.findOne({ username })
		.select('+password')
		.populate('role');

	if (!user && !parent && !student) {
		return next(new ErrorResponse('User not found', 401));
	}

	const resData = {};

	if (user && user.password && (await user.comparePassword(password))) {
		resData.token = passwordUtil.genJwtToken(user._id);
		resData.user = user;
	} else if (
		parent &&
		parent.password &&
		(await parent.comparePassword(password))
	) {
		resData.token = passwordUtil.genJwtToken(parent._id);
		resData.user = parent;
	} else if (
		student &&
		student.password &&
		(await student.comparePassword(password))
	) {
		resData.token = passwordUtil.genJwtToken(student._id);
		resData.user = student;
	} else {
		return next(new ErrorResponse('Invalid credentials', 401));
	}

	if (resData.user.profileStatus !== 'APPROVED') {
		return next(
			new ErrorResponse(`User is blocked or not approved, contact admin`, 403)
		);
	}

	return res.status(200).json(successResponse(resData, 1));
});

exports.updateMe = catchAsync(async (req, res, next) => {
	let id;
	// eslint-disable-next-line no-unused-expressions
	req.user ? ({ _id: id } = req.user) : null;

	const updateObj = { ...req.body };

	if (updateObj && updateObj._id) {
		id = updateObj._id;
	}

	delete updateObj.id;
	delete updateObj.activeStatus;
	delete updateObj.deleted;
	delete updateObj.profileStatus;
	delete updateObj.role;
	delete updateObj.profile_type;
	delete updateObj.secondary_profile_type;
	delete updateObj.authorized;
	delete updateObj.mobile;
	delete updateObj.password;

	const user =
		(await UserModel.findByIdAndUpdate(id, updateObj, { new: true })) ||
		(await ParentModel.findByIdAndUpdate(id, updateObj, { new: true })) ||
		(await StudentModel.findByIdAndUpdate(id, updateObj, { new: true }));

	if (!user) return next(new ErrorResponse('User not found', 404));

	return res.status(200).json(successResponse(user, 1));
});
