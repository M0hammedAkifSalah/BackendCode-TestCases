const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const firebaseNoti = require('../firebase');
const UserModel = require('../model/user');
const StudentModel = require('../model/student');
const catchAsync = require('../utils/catchAsync');

const globalcontentModel = require('../model/globalcontent');

exports.Create = (req, res, next) => {
	try {
		// eslint-disable-next-line new-cap
		const content = new globalcontentModel({
			_id: new mongoose.Types.ObjectId(),
			display_image: req.body.display_image,
		});
		content
			.save()
			.then(result => {
				res.status(201).json({
					message: 'added successfully',
					data: result,
				});
			})
			.catch(err => {
				res.status(500).json({
					error: err,
				});
			});
	} catch (err) {
		res.status(500).json({
			error: err,
		});
	}
};
exports.GetNotification = catchAsync(async (req, res, next) => {
	try {
		const arrOfDeviceToken = [];
		let studentData = await StudentModel.find()
			.populate('parent_id', 'DeviceToken')
			.select('DeviceToken');
		let userData = await UserModel.find().select('DeviceToken');
		studentData = JSON.parse(JSON.stringify(studentData));
		userData = JSON.parse(JSON.stringify(userData));
		if (studentData) {
			for (const ele of studentData) {
				if (ele.parent_id.DeviceToken && ele.parent_id.DeviceToken.length) {
					arrOfDeviceToken.push(ele.parent_id.DeviceToken);
				}
				if (ele.DeviceToken && ele.DeviceToken.length) {
					arrOfDeviceToken.push(ele.DeviceToken);
				}
			}
		}
		if (userData) {
			for (const ele of userData) {
				if (ele.DeviceToken) {
					arrOfDeviceToken.push(ele.DeviceToken);
				}
			}
		}
		const payload = {
			notification: {
				title: 'Happy Independence Day!',
				body: `growOn Wishes you a very Happy 76th Independence Day.`,
				image:
					'https://grow-on-prod.s3.ap-south-1.amazonaws.com/WhatsApp%20Image%202022-08-15%20at%2012.03.02%20AM.jpeg',
				sound: 'default',
				click_action: 'FLUTTER_NOTIFICATION_CLICK',
				collapse_key: 'grow_on',
				icon: '@drawable/notification_icon',
				channel_id: 'messages',
			},
			data: {
				type: 'Test',
			},
		};
		const finalArray = [...new Set(arrOfDeviceToken)];
		firebaseNoti.sendToDeviceFirebase(payload, finalArray);
		res.status(200).json({
			message: 'success notification send',
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});
exports.GetAll = catchAsync(async (req, res, next) => {
	const finalArray = [];
	const GetGlobalContentData = await globalcontentModel.find();
	for (const ele of GetGlobalContentData) {
		if (ele.status === 'active') {
			finalArray.push(ele);
		} else {
			return res.status(404).json({
				status: 'success',
				data: null,
			});
		}
	}
	res.status(200).json({
		status: 'success',
		data: finalArray,
	});
});

exports.Update = async (req, res, next) => {
	globalcontentModel
		.findOneAndUpdate(
			{
				_id: req.params.id,
			},
			{
				display_image: req.body.display_image,
			}
		)
		.exec()
		.then(data => {
			if (data) {
				res.status(200).json({
					message: 'successfully updated',
				});
			} else {
				res.status(500).json({
					error: 'error updating',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};
exports.getById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const getData = await globalcontentModel.findById(id);

	if (getData) {
		res.status(200).json({
			data: getData,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
});
