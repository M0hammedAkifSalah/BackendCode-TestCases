const express = require('express');

const router = express.Router();
const topicController = require('../controller/topic');

router.route('/').get(topicController.GetAll).post(topicController.Create);

router.route('/recordCount').post(topicController.GetAllCount);

router.route('/getAll').post(topicController.GetAllData);

router.route('/filter').post(topicController.filter);
router.route('/filter/media').post(topicController.filtermedia);
router.route('/page').get(topicController.GetAll);

router.route('/get').post(topicController.Get);

router.route('/:id').get(topicController.GetById).put(topicController.Update);

router.route('/deleteTopic').post(topicController.deleteTopic);

router.post('/deleteContent', topicController.deleteContent);
module.exports = router;
