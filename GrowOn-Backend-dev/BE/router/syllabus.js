const express = require('express');

const router = express.Router();
const syllabusController = require('../controller/syllabus');

router
	.route('/')
	.get(syllabusController.getAll)
	.post(syllabusController.Create)
	.put(syllabusController.updateRepo);

router.route('/getmapdata').get(syllabusController.getAllWithClassID);

router
	.route('/byschool/:school_id')
	.get(syllabusController.getsyllabusByschoolId)
	.put(syllabusController.updateMapDetalis);

router
	.route('/:id')
	.get(syllabusController.get)
	.put(syllabusController.update)
	.delete(syllabusController.detele);

router.post('/unMapSyllabus', syllabusController.unMapSyllabus);
router.post('/deleteSyllabus', syllabusController.deleteSyllabus);

module.exports = router;
