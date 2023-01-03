const express = require('express');
const question_typeControlle = require('../controller/question_type');

const router = express.Router();

router
	.route('/')
	.get(question_typeControlle.getAll)
	.post(question_typeControlle.create);

router
	.route('/:id')
	.get(question_typeControlle.get)
	.put(question_typeControlle.updatequestion_type)
	.delete(question_typeControlle.detele);

module.exports = router;
