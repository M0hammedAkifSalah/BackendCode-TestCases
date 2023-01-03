const express = require('express');

const router = express.Router();
const subjectController = require('../controller/subject');

router.route('/getAllSubject').get(subjectController.getAllSubject);

router.route('/chapterCount').get(subjectController.getchapterCount);

router.route('/school/:school').get(subjectController.subjectBySchool);

router
	.route('/')
	.get(subjectController.getAll)
	.post(subjectController.Create)
	.put(subjectController.updateRepo);

router.route('/bulkCreate').post(subjectController.CreateMany);

router.route('/getmapdata').get(subjectController.getAllWithClassID);

router
	.route('/byschool/:school_id')
	.get(subjectController.getsubjectByschoolId)
	.put(subjectController.updateMapDetalis);

router
	.route('/:id')
	.get(subjectController.get)
	.put(subjectController.update)
	.delete(subjectController.detele);

router.route('/duplication').post(subjectController.duplication);

router.route('/mapMany').put(subjectController.updateMultiple);
router.route('/getAll').put(subjectController.getAllSubject);

router.post('/unMapSubject', subjectController.unMapSubject);
router.post('/deleteSubject', subjectController.deleteSubject);

module.exports = router;
