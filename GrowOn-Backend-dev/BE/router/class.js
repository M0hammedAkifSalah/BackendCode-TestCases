const express = require('express');
const classController = require('../controller/class');

const router = express.Router();

router
	.route('/')
	.get(classController.getAllClass)
	.post(classController.createClass);

router.route('/bySchool/:id').get(classController.getClass);

router
	.route('/:id')
	.get(classController.getTour)
	.put(classController.updateTour)
	.delete(classController.deleteTour);

router.post('/unMapClass', classController.unMapClass);
router.post('/deleteClass', classController.deleteClass);

module.exports = router;
