const express = require('express');
const examTypeController = require('../controller/examType');

const router = express.Router();

router
	.route('/')
	.post(examTypeController.create)
	.get(examTypeController.getAllData);

router
	.route('/:id')
	.get(examTypeController.getById)
	.put(examTypeController.Update);

router.route('/delete').post(examTypeController.delete);

module.exports = router;
