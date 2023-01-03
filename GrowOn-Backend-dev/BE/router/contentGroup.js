const router = require('express').Router();
const groupController = require('../controller/contentGroup');

router
	.route('/')
	.post(groupController.addContentGroup)
	.get(groupController.getContentGroup);

router.route('/teacher').post(groupController.getTeacherStatus);

router
	.route('/:id')
	// 	.get(groupController.getGroupById)
	.put(groupController.updateGroupById)
	.delete(groupController.deleteGroupById);

router
	.route('/:id/users')
	.post(groupController.addUserToGroup)
	.get(groupController.getUsersList);

router.route('/:id/user/status').post(groupController.changeStatus);

router.route('/userCount').post(groupController.getCount);

module.exports = router;
