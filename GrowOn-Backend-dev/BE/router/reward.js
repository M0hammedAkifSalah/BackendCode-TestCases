const express = require('express');

const router = express.Router();
const rewardController = require('../controller/reward');

router.post('/', rewardController.GetAll);
router.post('/getallrank', rewardController.GetAllWithRank);
router.post('/create', rewardController.CreateReward);

module.exports = router;
