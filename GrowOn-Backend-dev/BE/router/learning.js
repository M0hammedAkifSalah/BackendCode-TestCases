const express = require('express');

const router = express.Router();
const learningController = require('../controller/learning');

router.post('/create', learningController.Create);
router.post('/getchapter', learningController.GetChapter);
router.post('/getsubject', learningController.GetSubject);
router.post('/topic', learningController.GetAll);
router.post('/data', learningController.GetTeacherData);
router.post('/recentfile', learningController.GetRecentFile);
router.put('/data/:id', learningController.Update);
router.put('/chapter/addImage/:id', learningController.UpdateChapter);
router.put('/subject/files/:id', learningController.UpdateSubject);

// router
// .route('/')
// .post(learningController.GetAll)
// .post(learningController.Create)

router
	.route('/:id')
	.get(learningController.GetById)
	.put(learningController.Update);

module.exports = router;
