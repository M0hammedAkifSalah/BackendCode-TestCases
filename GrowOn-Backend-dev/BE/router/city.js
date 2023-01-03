const express = require('express');
const cityController = require('../controller/city');
const { route } = require('./class');

const router = express.Router();

router.route('/').post(cityController.Create).get(cityController.getAllData);

router.route('/:id').get(cityController.getByID).put(cityController.Update);

router.route('/state/:id').get(cityController.getCitiesByState);

module.exports = router;
