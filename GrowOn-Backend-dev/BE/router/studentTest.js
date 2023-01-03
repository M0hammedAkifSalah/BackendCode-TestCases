const express = require('express');
const Controller = require('../controller/studentTest');

const router = express.Router();
router.post('/mobile', Controller.GetAllMObile);
router.post('/', Controller.TestAvailable);

router.post('/getSubjectName', Controller.TestAvailableSubject);
router.post('/getRank', Controller.getRank);

router.post('/getTestSubject', Controller.getTestSubject);

router.post('/pendingCount', Controller.pendingCount);

router.post('/begin', Controller.BeginTest);
router.post('/detail', Controller.TestDetails);

module.exports = router;
