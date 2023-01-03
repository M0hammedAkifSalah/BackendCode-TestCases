const express = require('express');

const router = express.Router();
const multer = require('multer');

const upload = require('../config/multer.config.js');

const questionController = require('../controller/objectiveQuestion');

router.get('/all', questionController.CompleteData);
router.get('/count', questionController.GetNumber);
router.get('/filter', questionController.filterData);

router
	.route('/globalQuestions')
	.post(questionController.createGlobalQuestions)
	.get(questionController.getGlobalQuestions);

router
	.route('/globalQuestions/recordCount')
	.post(questionController.getGlobalQuestionsCount);

router.post(
	'/bulkUploadQuestion',
	upload.single('file'),
	questionController.bulkUpload
);

router
	.route('/globalQuestions/getAll')
	.post(questionController.getGlobalQuestionsAllData);

router
	.route('/globalQuestionsImport')
	.post(questionController.GlobalQuesImport);

router
	.route('/globalQuestions/page')
	.get(questionController.getGlobalQuestions);

router.route('/globalgetQuesCount').post(questionController.GlobalGetQuesCount);

router
	.route('/globalgetQuesAttempCount')
	.post(questionController.GlobalGetQuesAttemptCount);

router
	.route('/globalQuestions/:id')
	.get(questionController.getGlobalQuestion)
	.put(questionController.UpdateGlobalQuestions);

router.route('/').get(questionController.Get).post(questionController.Create);

router.route('/recordCount').post(questionController.GetCount);

// getting questionIds grouped by question type with count
router.route('/getCount').post(questionController.CountWithData);

router.route('/getAll').post(questionController.GetAllData);

// fetching questions by multiple question types (mobile App)
router.route('/getQuesByType').post(questionController.GetByType);

router.route('/page').get(questionController.Get);
router.route('/getQuesCount').post(questionController.GetQuesCount);
router
	.route('/:id')
	.get(questionController.GetById)
	// .delete(questionController.DeleteQuestion)
	.put(questionController.Update);

router.route('/deleteQuestions').post(questionController.deleteQuestions);

module.exports = router;
