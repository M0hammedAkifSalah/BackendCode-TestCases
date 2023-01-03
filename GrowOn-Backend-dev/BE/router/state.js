const express = require('express');

const router = express.Router();
const stateController = require('../controller/state');

router.route('/').post(stateController.Create).get(stateController.getAllData);

router.route('/bulkCreate').post(stateController.bulkCreate);

module.exports = router;
