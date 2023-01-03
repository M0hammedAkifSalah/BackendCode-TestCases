const express = require('express');

const router = express.Router();
const managementController = require('../controller/management');

router
	.route('/')
	.post(managementController.Create)
	.get(managementController.getAllData);

router
	.route('/:id')
	.get(managementController.getById)
	.put(managementController.Update);

module.exports = router;
