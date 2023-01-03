const express = require('express');

const router = express.Router();
const principalController = require('../controller/principal');

router
	.route('/')
	.post(principalController.Create)
	.get(principalController.getAllData);

router
	.route('/:id')
	.get(principalController.getById)
	.put(principalController.Update);

module.exports = router;
