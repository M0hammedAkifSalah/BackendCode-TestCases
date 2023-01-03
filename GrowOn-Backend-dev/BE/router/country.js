const express = require('express');
const countryController = require('../controller/country');
const { route } = require('./class');

const router = express.Router();

router
	.route('/')
	.post(countryController.createCountry)
	.get(countryController.getAllData);

router.route('/:id').get(countryController.getById);

module.exports = router;
