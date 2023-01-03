const {
	Types: { ObjectId },
} = require('mongoose');

const FileDirectoryModel = require('../model/fileDirectory');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.CreateDir = catchAsync(async (req, res, next) => {
	const { groupId, parentFolder = null, name, description = '' } = req.body;
	const {
		user: { _id: userId = null },
	} = req;

	const createObj = {
		groupId,
		parentFolder,
		name,
		description,
		files: [],
		type: 'FOLDER',
		uploadedBy: userId,
	};

	let createdDir = await FileDirectoryModel.create(createObj);

	createdDir = await createdDir
		.populate('uploadedBy', 'name profileImage')
		.execPopulate();

	if (!createdDir) {
		return next(new ErrorResponse('Failed to create dir', 400));
	}

	res.status(201).json(SuccessResponse(createdDir, 1, 'Created successfully'));
});

exports.GetDir = catchAsync(async (req, res, next) => {
	const { groupId, searchVal } = req.query;

	if (!groupId) {
		return next(new ErrorResponse('Groupid is required', 400));
	}

	const matchQuery = {
		groupId: ObjectId(groupId),
	};

	if (searchVal) {
		matchQuery.$text = { $search: searchVal };
	}

	const foundDirs = await FileDirectoryModel.aggregate([
		{
			$match: matchQuery,
		},
		{
			$lookup: {
				from: 'users',
				let: { userId: '$uploadedBy' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [{ $eq: ['$_id', '$$userId'] }],
							},
						},
					},
					{
						$limit: 1,
					},
					{
						$project: {
							name: '$name',
							profileImage: '$profile_image',
						},
					},
				],
				as: 'uploadedBy',
			},
		},
		{
			$project: {
				_id: '$_id',
				groupId: '$groupId',
				parentFolder: '$parentFolder',
				name: '$name',
				description: '$description',
				files: '$files',
				type: '$type',
				createdAt: '$createdAt',
				updatedAt: '$updatedAt',
				uploadedBy: {
					$cond: {
						if: { $eq: [{ $size: '$uploadedBy' }, 0] },
						then: null,
						else: {
							$first: '$uploadedBy',
						},
					},
				},
			},
		},
	]);

	return res
		.status(200)
		.json(SuccessResponse(foundDirs, foundDirs.length, 'Directories fetched.'));
});

exports.UpdateDir = catchAsync(async (req, res, next) => {
	const { dirId } = req.params;
	const { name = null, description = null } = req.body;

	const updateObj = {};

	if (name) updateObj.name = name;
	if (description) updateObj.description = description;

	const updatedDir = await FileDirectoryModel.updateOne(
		{ _id: dirId },
		updateObj,
		{ new: true }
	);

	if (!updatedDir) {
		return next(new ErrorResponse('Failed to update dir', 400));
	}

	res.status(201).json(SuccessResponse(updatedDir, 1, 'Updated successfully'));
});

exports.DeleteDir = catchAsync(async (req, res, next) => {
	const { dirId } = req.params;

	const arrOfChildIds = [dirId];

	async function getAllDecendants(parentIds) {
		const foundChilds = await FileDirectoryModel.find({
			parentFolder: { $in: parentIds },
		});

		if (!foundChilds || foundChilds.length < 1) {
			return;
		}

		const childs = foundChilds.map(({ _id }) => _id);
		arrOfChildIds.push(...childs);

		await getAllDecendants(childs);
	}

	await getAllDecendants([dirId]);

	await FileDirectoryModel.deleteMany({ _id: { $in: arrOfChildIds } });

	res.status(200).json(SuccessResponse(null, 1, 'Deleted successfully'));
});

exports.AddFiles = catchAsync(async (req, res, next) => {
	const {
		user: { _id: userId = null },
	} = req;

	const {
		groupId,
		parentFolder = null,
		files = [],
		name = '',
		description = '',
	} = req.body;

	const setObj = { files, uploadedBy: userId };

	if (name) setObj.name = name;
	if (description) setObj.description = description;
	if (groupId) setObj.groupId = groupId;

	let createdData = await FileDirectoryModel.create({
		parentFolder,
		type: 'FILES',
		groupId,
		...setObj,
	});

	createdData = await createdData
		.populate('uploadedBy', 'name profileImage')
		.execPopulate();

	res
		.status(201)
		.json(
			SuccessResponse(createdData, files.length, 'files created successfully')
		);
});

exports.UpdateFiles = catchAsync(async (req, res, next) => {
	const {
		user: { _id: userId = null },
	} = req;

	const { fileId, files = [], name = null, description = null } = req.body;

	if (!fileId) return next(new ErrorResponse('fileid is required', 400));

	const setObj = { files, uploadedBy: userId };

	if (name) setObj.name = name;
	if (description) setObj.description = description;

	const updatedData = await FileDirectoryModel.findOneAndUpdate(
		{ _id: fileId },
		{ $set: setObj },
		{ new: true }
	).populate('uploadedBy', 'name profileImage');

	if (!updatedData) return next(new ErrorResponse('No file found', 400));

	res
		.status(201)
		.json(SuccessResponse(updatedData, files.length, 'updated successfully'));
});

exports.RemoveFiles = catchAsync(async (req, res, next) => {
	const { fileId } = req.body;

	if (!fileId) return next(new ErrorResponse('Fileid is required', 400));

	const deletedFile = await FileDirectoryModel.deleteOne({ _id: fileId });

	if (!deletedFile) return next(new ErrorResponse('Not found', 404));

	res.status(200).json(SuccessResponse(null, 1, 'Deleted successfully'));
});
