const { Query } = require('mongoose');
const question_typeModel = require('../model/question_type');

exports.getAll = async (req, res) => {
	try {
		const question_typeData = await question_typeModel.find();
		res.json({
			status: 200,
			results: question_typeData.length,
			data: question_typeData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err,
		});
	}
};
exports.get = async (req, res) => {
	try {
		const getquestion_type = await question_typeModel.findById(req.params.id);
		res.json({
			status: 200,
			data: getquestion_type,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.create = async (req, res) => {
	try {
		const newquestion_type = await question_typeModel.create(req.body);

		res.status(201).json({
			status: 201,
			data: {
				class: newquestion_type,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.updatequestion_type = async (req, res) => {
	try {
		const question_typeUpdate = await question_typeModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({
			status: 201,
			data: {
				question_typeUpdate,
			},
		});
	} catch {
		res.json({
			status: 404,
			message: 'error updating',
		});
	}
};

exports.detele = async (req, res) => {
	try {
		await question_typeModel.findByIdAndDelete(req.params.id);
		res.json({
			status: 201,
			data: null,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};
