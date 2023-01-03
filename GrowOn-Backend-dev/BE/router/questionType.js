const express = require('express');
const questionTypeController = require('../controller/questionType');

const router = express.Router();

router
	.route('/')
	.post(questionTypeController.create)
	.get(questionTypeController.getAllData);

router
	.route('/byrepositoryid/:id')
	.get(questionTypeController.getByRepositoryId);

router
	.route('/:id')
	.get(questionTypeController.getById)
	.put(questionTypeController.Update);

router.route('/delete').post(questionTypeController.delete);

module.exports = router;
