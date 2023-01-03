const jwt = require('jsonwebtoken');

const UserModel = require('../model/user');
const ParentModel = require('../model/parent');
const StudentModel = require('../model/student');

const redisClient = require('../config/redisClient');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');

// keep strings in lowercase
const allowedRoutes = [
	'/api/v1/otp',
	'/api/v1/otp/send',
	'/api/v1/otp/verify',
	'/api/v1/admin/login',
	'/api/v1/signup/login',
	'/api/v1/student/login',
	'/api/v1/student/updatepassword',
	'/api/v1/parent/updatepassword',
	'/api/v1/parent/login',
	'/api/v1/parent/find',
	'/api/v1/student/find',
	'/api/v1/signup/mobilelogin',
	'/api/v1/signup/user/dashboard',
	'/api/v1/school/getschoolswithselfsignup',
	'/api/get_token',
	'/api/v1/signup',
	'/api/v1/country',
	'/api/v1/state',
	'/api/v1/city',
	'/api/v1/role',
	'/api/v1/school',
	'/api/v1/school/newapi/create/addschool',
	'/api/v1/school/sections/get',
	'/api/v1/signup/updateuserpassword',
	'/api/v1/signup/updatepincode',
	'/api/v1/auth/login',
	'/api/v1/auth/signup',
	'/api/v1/school/demoschool',
	'/api/v1/features/get',
	'/api/v1/signup/globalData',
];

const protect = catchAsync(async (req, res, next) => {
	if (allowedRoutes.includes(req.path.toLowerCase())) return next();

	const authHeader = req.headers.authorization;

	if (!authHeader) return next(new ErrorResponse('Not authorized', 401));

	const token = authHeader.split(' ')[1];

	if (!token) return next(new ErrorResponse('Not authorized', 401));

	const decoded = jwt.verify(token, process.env.JWT_SECRET);

	if (!decoded) return next(new ErrorResponse('Invalid token', 401));

	const cacheKey = `auth:user:${decoded.id}`;
	const cachedUser = await redisClient.get(cacheKey);

	if (cachedUser) {
		req.user = JSON.parse(cachedUser);
		return next();
	}

	const selOpts = {
		profileStatus: 1,
		role: 1,
		profile_type: 1,
		secondary_profile_type: 1,
		username: 1,
		mobile: 1,
		school_id: 1,
		branch_id: 1,
		primary_class: 1,
		primary_section: 1,
		name: 1,
	};

	const user =
		(await UserModel.findById(decoded.id)
			.select(selOpts)
			.populate('role')
			.lean()) ||
		(await ParentModel.findById(decoded.id)
			.select(selOpts)
			.populate('role')
			.lean()) ||
		(await StudentModel.findById(decoded.id)
			.select(selOpts)
			.populate('role')
			.lean());

	if (!user) return next(new ErrorResponse('Invalid token', 401));

	if (user.profileStatus !== 'APPROVED') {
		return next(new ErrorResponse('Profile is blocked', 403));
	}

	req.user = user;

	await redisClient.set(cacheKey, JSON.stringify(user), {
		EX: 60 * 10, // 10 min of expiration
	});

	next();
});

module.exports = protect;
