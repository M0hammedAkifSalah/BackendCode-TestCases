const express = require('express');

const router = express.Router();
const learnOutcomeController = require('../controller/learnOutcome');

router
	.route('/')
	.get(learnOutcomeController.GetAll)
	.post(learnOutcomeController.Create);

router.route('/recordCount').post(learnOutcomeController.GetAllCount);

router.route('/getAll').post(learnOutcomeController.GetAllData);

router.route('/filter').post(learnOutcomeController.filter);

router.route('/page').get(learnOutcomeController.GetAll);

router.route('/get').post(learnOutcomeController.Get);

router
	.route('/:id')
	.get(learnOutcomeController.GetById)
	.put(learnOutcomeController.Update);

router
	.route('/deleteLearningOutcome')
	.post(learnOutcomeController.deleteLearningOutcome);
module.exports = router;
