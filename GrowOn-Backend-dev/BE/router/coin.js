const express = require('express');

const router = express.Router();
const coinController = require('../controller/coin');

// Assignment fetching and creation APIs
router.route('/').get(coinController.GetAll);

module.exports = router;
