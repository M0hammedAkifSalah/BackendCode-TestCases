const TestAssignModel = require('../model/testAssignTo');
const APIFeatures = require('../utils/apiFeatures');

exports.GetAll = async (req, res) => {
	try {
		const features = new APIFeatures(TestAssignModel.find({}), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const AssignData = await features.query;
		res.json({
			status: 201,
			result: AssignData.length,
			data: AssignData,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.GetById = async (req, res) => {
	try {
		const data = await TestAssignModel.findById(req.params.id);
		if (data.length == 0) {
			res.json({
				status: 200,
				message: 'Invaild id',
			});
		} else {
			res.status(200).json({
				status: 200,
				data,
			});
		}
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Create = async (req, res) => {
	try {
		const newsubject = await TestAssignModel.create({
			teacher_id: req.body.teacher_id,
			class_id: req.body.class_id,
			school_id: req.body.school_id,
			assignDate: req.body.assignDate,
			assignTo: req.body.assignTo,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});

		res.status(201).json({
			status: 201,
			data: {
				class: newsubject,
			},
		});
	} catch (error) {
		res.json({
			error,
			message: 'error creating',
		});
	}
};

exports.Update = async (req, res, next) => {
	TestAssignModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			question_title: req.body.question_title,
			detail_question_paper: req.body.detail_question_paper,
			section: req.body.section,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		}
	)
		.exec()
		.then(chapter => {
			console.log(chapter);
			if (chapter) {
				res.status(200).json({
					message: req.body,
				});
			} else {
				res.status(500).json({
					error: 'error updating',
					message: 'error updating',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};
