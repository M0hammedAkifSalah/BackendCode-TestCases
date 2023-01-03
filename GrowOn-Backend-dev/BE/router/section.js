const express = require('express');
const sectionController = require('../controller/section');

const router = express.Router();

router
	.route('/')
	.get(sectionController.getAllSection)
	// .put(sectionController.updateRepo)
	.post(sectionController.createSection);

router.route('/subjectMap').get(sectionController.getSubMapping);

router.route('/dashboard').get(sectionController.dashboard);

router.route('/create').post(sectionController.create);
router
	.route('/:id')
	.get(sectionController.getSection)
	.put(sectionController.updateSection);
router.route('/mapSubject').post(sectionController.mapSubject);
router.route('/mapManySubject').post(sectionController.mapManySubject);
router.route('/unmapSubject').post(sectionController.unmapSubject);
// router.route('/unmapManySubject').post(sectionController.unmapManySubject);

router.route('/delete').post(sectionController.deleteSection);

module.exports = router;
