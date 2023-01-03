const GroupModel = require('../model/group');

const checkLimitAndPage = require('../utils/checkLimitAndPage');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

// Get All Groups with filters in query params
exports.GetGroups = catchAsync(async (req, res, next) => {
	checkLimitAndPage(req);

	const groupQuery = new APIFeatures(
		GroupModel.find({})
			.populate('school_id', 'schoolName')
			.populate({
				path: 'teacher_id',
				select: 'name',
				options: { withDeleted: true },
			})
			.populate({
				path: 'students',
				select: 'name profile_image profile_type',
				populate: {
					path: 'class section parent_id',
					select: 'name',
				},
				options: {
					withDeleted: true,
				},
			})
			.populate({
				path: 'users',
				select: 'name profile_image profile_type',
				options: { withDeleted: true },
				populate: {
					path: 'profile_type',
					select: 'role_name',
				},
			})
			.lean(),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const groups = await groupQuery.query;

	res.status(200).json(SuccessResponse(groups, groups.length));
});

// Create group
exports.CreateGroup = catchAsync(async (req, res, next) => {
	const group = await GroupModel.create(req.body);

	if (!group) {
		return next(new ErrorResponse(`Group not created`, 400));
	}

	const populatedGroup = await GroupModel.findById(group._id)
		.lean()
		.populate('school_id', 'schoolName')
		.populate({
			path: 'teacher_id',
			select: 'name',
			options: { withDeleted: true },
		})
		.populate({
			path: 'students',
			select: 'name profile_image profile_type',
			populate: {
				path: 'class section parent_id',
				select: 'name',
				options: {
					withDeleted: true,
				},
			},
			options: {
				withDeleted: true,
			},
		})
		.populate({
			path: 'users',
			select: 'name profile_image profile_type',
			options: { withDeleted: true },
			populate: {
				path: 'profile_type',
				select: 'role_name',
			},
		});

	res.status(201).json(SuccessResponse(populatedGroup, 1));
});

// Get Group by :group_id
exports.GetGroup = catchAsync(async (req, res, next) => {
	const groupData = await GroupModel.findOne({ _id: req.params.group_id })
		.lean()
		.populate('school_id', 'schoolName')
		.populate({
			path: 'teacher_id',
			select: 'name',
			options: { withDeleted: true },
		})
		.populate({
			path: 'students',
			select: 'name profile_image profile_type',
			populate: {
				path: 'class section parent_id',
				select: 'name',
				options: {
					withDeleted: true,
				},
			},
			options: {
				withDeleted: true,
			},
		})
		.populate({
			path: 'users',
			select: 'name profile_image profile_type',
			options: { withDeleted: true },
			populate: {
				path: 'profile_type',
				select: 'role_name',
			},
		});

	if (!groupData) {
		return next(
			new ErrorResponse(`No group found with id ${req.params.id}`, 404)
		);
	}

	res.status(200).json(SuccessResponse(groupData, 1));
});

// Update Group by :group_id
exports.UpdateGroup = catchAsync(async (req, res, next) => {
	const updatedGroup = await GroupModel.findByIdAndUpdate(
		req.params.group_id,
		req.body,
		{
			new: true,
		}
	)
		.populate('school_id', 'schoolName')
		.populate({
			path: 'teacher_id',
			select: 'name',
			options: { withDeleted: true },
		})
		.populate({
			path: 'students',
			select: 'name profile_image profile_type',
			options: {
				withDeleted: true,
			},
			populate: {
				path: 'class section parent_id',
				select: 'name',
				options: {
					withDeleted: true,
				},
			},
		})
		.populate({
			path: 'users',
			select: 'name profile_image profile_type',
			options: { withDeleted: true },
			populate: {
				path: 'profile_type',
				select: 'role_name',
			},
		});

	if (!updatedGroup) {
		return next(
			new ErrorResponse(`Group not found with id ${req.params.id}`, 404)
		);
	}

	res.status(201).json(SuccessResponse(updatedGroup, 1, 'Group updated'));
});

// Delete Group by :group_id
exports.DeleteGroup = catchAsync(async (req, res, next) => {
	const deltedGroup = await GroupModel.deleteOne({ _id: req.params.group_id });

	if (!deltedGroup) {
		return next(new ErrorResponse(`Group not found`, 404));
	}

	res.status(201).json(SuccessResponse(null, 1, 'Group deleted successfully'));
});

// Add Student to :group_id by :student_id
exports.AddStudent = catchAsync(async (req, res, next) => {
	const group = await GroupModel.findByIdAndUpdate(
		req.params.group_id,
		{
			$addToSet: { students: req.params.student_id },
		},
		{ new: true }
	);

	if (!group) {
		return next(new ErrorResponse(`Group not found`, 404));
	}

	res.status(201).json(SuccessResponse(group, 1, 'Student added successfully'));
});

// Remove Student from :group_id by :student_id
exports.RemoveStudent = catchAsync(async (req, res, next) => {
	const group = await GroupModel.findByIdAndUpdate(
		req.params.group_id,
		{
			$pull: { students: req.params.student_id },
		},
		{ new: true }
	);

	if (!group) {
		return next(new ErrorResponse(`Group not found`, 404));
	}

	res
		.status(201)
		.json(SuccessResponse(group, 1, 'Student removed successfully'));
});

// Add User to :group_id by :user_id
exports.AddUser = catchAsync(async (req, res, next) => {
	const group = await GroupModel.findByIdAndUpdate(
		req.params.group_id,
		{
			$addToSet: { users: req.params.user_id },
		},
		{ new: true }
	);

	if (!group) {
		return next(new ErrorResponse(`Group not found`, 404));
	}

	res.status(201).json(SuccessResponse(group, 1, 'User added successfully'));
});

// Remove User from :group_id by :user_id
exports.RemoveUser = catchAsync(async (req, res, next) => {
	const group = await GroupModel.findByIdAndUpdate(
		req.params.group_id,
		{
			$pull: { users: req.params.user_id },
		},
		{ new: true }
	);

	if (!group) {
		return next(new ErrorResponse(`Group not found`, 404));
	}

	res.status(201).json(SuccessResponse(group, 1, 'User removed successfully'));
});
