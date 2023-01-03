const express = require('express');

const router = express.Router();
const generateQuesionController = require('../controller/generatedQuestionWithId');

router
	.route('/')
	.get(generateQuesionController.GetAll)
	.post(generateQuesionController.Create);

router
	.route('/:id')
	.get(generateQuesionController.getById)
	.put(generateQuesionController.UpdateData);

module.exports = router;
