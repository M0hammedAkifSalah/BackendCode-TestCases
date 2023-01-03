const express = require('express');

const router = express.Router();
const chapterController = require('../controller/chapter');

router.route('/').get(chapterController.GetAll).post(chapterController.Create);

router.route('/recordCount').post(chapterController.GetAllCount);

router.route('/getAll').post(chapterController.GetAllData);

router.route('/filter').post(chapterController.filter);

router.route('/filter/media').post(chapterController.filtermedia);

router.route('/page').get(chapterController.GetAll);

router.route('/get').post(chapterController.Get);

router
	.route('/:id')
	.get(chapterController.GetById)
	.put(chapterController.Update);

router.post('/deleteChapter', chapterController.deleteChapter);

router.post('/deleteContent', chapterController.deleteContent);

module.exports = router;
