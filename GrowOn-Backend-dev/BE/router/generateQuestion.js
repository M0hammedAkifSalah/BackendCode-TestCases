const express = require('express');

const router = express.Router();
const generateQuestionController = require('../controller/generateQuestion');

router
	.route('/')
	.get(generateQuestionController.GetAll)
	.post(generateQuestionController.Create);

router
	.route('/:id')
	.get(generateQuestionController.getById)
	.put(generateQuestionController.Update);

module.exports = router;
