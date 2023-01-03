const mongoose = require('mongoose');
const UserRoleModel = require('../model/userRole');

exports.Create = async (req, res) => {
	try {
		const userData = new UserRoleModel({
			_id: new mongoose.Types.ObjectId(),
			profile_type: req.body.profile_type,
			isSubmitForm: false,
			isDeleteForm: false,
			sequenceNumber: req.body.sequenceNumber,
			urlString: req.body.url,
		});
		userData
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
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.GetAll = async (req, res) => {
	try {
		const userData = await UserRoleModel.find({});
		res.json({
			status: 201,
			result: userData.length,
			data: userData,
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error,
		});
	}
};

exports.Update = async (req, res) => {
	UserRoleModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			profile_type: req.body.profile_type,
			isSubmitForm: req.body.isSubmitForm,
			isDeleteForm: req.body.isDeleteForm,
			sequenceNumber: req.body.sequenceNumber,
			url: req.body.url,
		}
	)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: req.body,
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.deleteUser = async (req, res) => {
	try {
		const deletedData = await UserRoleModel.deleteOne({ _id: req.params._id });
		res.status(200).json({
			status: 200,
			message: 'record deleted successfully',
			data: deletedData,
		});
	} catch (err) {
		console.log(err);
		res.status(404).json({
			status: 404,
			message: err.message,
		});
	}
};
