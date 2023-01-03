const express = require('express');

const router = express.Router();

const adminController = require('../controller/admin');

router.route('/').get(adminController.getAllData).post(adminController.Create);

router.route('/:id').get(adminController.getById).put(adminController.Update);

module.exports = router;
