const jwt = require('jsonwebtoken');

const UserModel = require('../model/user');
const ParentModel = require('../model/parent');
const StudentModel = require('../model/student');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');

const authorize = catchAsync(async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader) return next(new ErrorResponse('Not authorized', 401));

	const token = authHeader.split(' ')[1];

	if (!token) return next(new ErrorResponse('Not authorized', 401));

	const decoded = jwt.verify(token, process.env.JWT_SECRET);

	if (!decoded) return next(new ErrorResponse('Invalid token', 401));

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

	req.user = user;

	next();
});

module.exports = authorize;
