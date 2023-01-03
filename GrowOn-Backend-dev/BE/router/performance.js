const express = require('express');
const performanceController = require('../controller/performance');

const router = express.Router();

router.post('/create', performanceController.Create);
router.get('/', performanceController.getAllData);
router.get('/award/stats/:id', performanceController.rewardCount);

// router
// .route('/')
// .post(performanceController.Create)
// .get(performanceController.getAllData);

router
	.route('/:id')
	.get(performanceController.getByID)
	.put(performanceController.Update);

module.exports = router;
