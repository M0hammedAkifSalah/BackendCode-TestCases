const express = require('express');

const router = express.Router();
const teacherController = require('../controller/teacher');
const { route } = require('./class');

router
	.route('/')
	.post(teacherController.Create)
	.get(teacherController.getAllData);

router.route('/getAllTeacherIds').get(teacherController.getAllTeacherIds);

router
	.route('/:id')
	.get(teacherController.getById)
	.put(teacherController.Update);

router.route('/login').post(teacherController.login);
router.post('/updateDeviceToken/:id', teacherController.updateDeviceToken);

module.exports = router;
