const express = require('express');
const stypeController = require('../controller/stype');
const { route } = require('./class');

const router = express.Router();

router.route('/').post(stypeController.Create).get(stypeController.getAllData);

router.route('/:id').get(stypeController.getByID).put(stypeController.Update);

module.exports = router;
