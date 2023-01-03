const mongoose = require('mongoose');
const BranchModel = require('../model/branch');
const APIFeatures = require('../utils/apiFeatures');
const schoolModel = require('../model/school');

exports.getAllBranch = async (req, res) => {
	try {
		const features = new APIFeatures(BranchModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const branchData = await features.query;
		res.status(200).json({
			status: 200,
			results: branchData.length,
			data: branchData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err,
		});
	}
};
exports.getBranch = async (req, res) => {
	try {
		const getBranch = await BranchModel.findById(req.params.id);
		res.status(200).json({
			status: 'success',
			data: getBranch,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.createBranch = async (req, res) => {
	try {
		const newBranch = await BranchModel.create(req.body);
		await schoolModel.findByIdAndUpdate(
			{ _id: req.body.schoolId },
			{ branch: newBranch._id }
		);
		res.status(201).json({
			status: 201,
			data: newBranch,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.updateBranch = async (req, res) => {
	try {
		const branchUpdate = await BranchModel.findByIdAndUpdate(
			req.params.id,
			req.body
			// {
			// 	new: true,
			// 	runValidators: true,
			// }
		);

		res.status(201).json({
			status: 201,
			data: {
				branchUpdate,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.deteleBranch = async (req, res) => {
	const { id } = req.params;
	await BranchModel.findByIdAndDelete(id)
		.then(result => {
			res.status(200).json({
				status: 200,
				data: 'deleted',
			});
		})
		.catch(err => {
			res.status(400).json({
				data: err.message,
			});
		});
};
