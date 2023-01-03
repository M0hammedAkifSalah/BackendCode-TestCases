const router = require('express').Router();
const curriculumController = require('../controller/curriculum');

router
	.route('/')
	.post(curriculumController.create)
	.get(curriculumController.getAll);

router
	.route('/:id')
	.get(curriculumController.get)
	.put(curriculumController.update)
	.delete(curriculumController.delete);

module.exports = router;
