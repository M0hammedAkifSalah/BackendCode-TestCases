const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const TeacherSkillModel = require('../model/teacherSkill');

exports.Create = async (req, res, next) => {
	try {
		const board = new TeacherSkillModel({
			_id: mongoose.Types.ObjectId(),
			class_id: req.body.class_id,
			teacher_id: req.body.teacher_id,
			skill: req.body.skill,
		});
		board
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
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
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getAllData = async (req, res, next) => {
	try {
		const features = new APIFeatures(TeacherSkillModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const board = await features.query;
		res.status(200).json({
			message: 'success',
			status: 200,
			data: board,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getByID = async (req, res) => {
	try {
		const board = await TeacherSkillModel.findById(req.params.id);
		if (!board) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		}
		res.status(200).json({
			status: 'success',
			data: board,
		});
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	const { id } = req.params;
	try {
		const board = await TeacherSkillModel.findById(id);
		if (!board) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const updateboard = await TeacherSkillModel.findByIdAndUpdate(id, {
				class_id: req.body.class_id,
				teacher_id: req.body.teacher_id,
				skill: req.body.skill,
			});

			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};
