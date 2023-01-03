const express = require('express');

const router = express.Router();
const answerController = require('../controller/question_answer');

router.post('/get', answerController.GetAll);
router.post('/result', answerController.result);
// router.post('/:id', AnswerCOntroller.Single);
router.post('/submit', answerController.Create);
router.post('/teacherFeedback/:id', answerController.teacherFeedback);
// router.post('/update/:id', AnswerCOntroller.Update);
router.post('/freetextmark', answerController.freeTextUpdate);

module.exports = router;
