const express = require('express');

const router = express.Router();

const userRoleController = require('../controller/userRole');

router
	.route('/')
	.get(userRoleController.GetAll)
	.post(userRoleController.Create);

router
	.route('/:id')
	.delete(userRoleController.deleteUser)
	.put(userRoleController.Update);

module.exports = router;
