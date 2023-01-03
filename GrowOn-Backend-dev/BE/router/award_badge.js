const express = require('express');
const awardController = require('../controller/award_badge');

const router = express.Router();

router.route('/').post(awardController.create).get(awardController.getAllData);

router.route('/:id').get(awardController.getById);

module.exports = router;
