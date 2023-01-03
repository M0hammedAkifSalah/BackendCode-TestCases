const express = require('express');

const router = express.Router();
const groupController = require('../controller/group');

router
	.route('/')
	.get(groupController.GetGroups)
	.post(groupController.CreateGroup);

router
	.route('/:group_id')
	.get(groupController.GetGroup)
	.put(groupController.UpdateGroup)
	.delete(groupController.DeleteGroup);

router
	.route('/:group_id/student/:student_id')
	.put(groupController.AddStudent)
	.delete(groupController.RemoveStudent);

router
	.route('/:group_id/user/:user_id')
	.put(groupController.AddUser)
	.delete(groupController.RemoveUser);

module.exports = router;
