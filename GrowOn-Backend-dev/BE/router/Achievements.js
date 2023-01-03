const express = require('express');
const achievementController = require('../controller/Achievements');

const router = express.Router();

router.post('/', achievementController.Create);
router.get('/', achievementController.getAllData);
// router
// .route('/')
// .post(achievementController.Create)
// .get(achievementController.getAllData);

router
	.route('/:id')
	.get(achievementController.getByID)
	.put(achievementController.Update);

module.exports = router;
