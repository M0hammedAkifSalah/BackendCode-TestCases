const router = require('express').Router();
const paperController = require('../controller/questionPaper');

router
	.route('/mcq')
	.get(paperController.getAllPaper)
	.post(paperController.create);

router.post('/mcq/evaluate', paperController.evaluate);

router.post('/mcq/:id/assign', paperController.assignToStudents);

router
	.route('/mcq/:id')
	.get(paperController.getById)
	.put(paperController.updateById)
	.delete(paperController.deleteById);

module.exports = router;
