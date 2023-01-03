const express = require('express');

const router = express.Router();
const actualQuestionController = require('../controller/actualQuestions');

// router
// .route('/mobile')
// .get(actualQuestionController.GetAllData)

router
	.route('/mobileData')
	.get(actualQuestionController.GetAllData)
	.post(actualQuestionController.GetAllData1);

router.route('/filter').post(actualQuestionController.filter);

router
	.route('/')
	.get(actualQuestionController.GetAll)
	.post(actualQuestionController.Create);

router.route('/assign/:id').post(actualQuestionController.Assign);

router.route('/getAllQuestions').post(actualQuestionController.getAllQuestions);

// creating question paper with IDS
router.route('/create').post(actualQuestionController.createByIds);

router
	.route('/:id')
	.get(actualQuestionController.GetById)
	.put(actualQuestionController.Update);

router.route('/deleteQuestionPaper').post(actualQuestionController.detele);

router
	.route('/questionIdValidation')
	.post(actualQuestionController.questionIdValidationAtSchoolLevel);

router.route('/mappingApi').post(actualQuestionController.mappingApi);

module.exports = router;
