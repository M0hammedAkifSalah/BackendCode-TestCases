const express = require('express');
const feedTypeController = require('../controller/feed_type');

const router = express.Router();

router
	.route('/')
	.post(feedTypeController.create)
	.get(feedTypeController.getAllData);

router.route('/:id').get(feedTypeController.getById);

module.exports = router;
