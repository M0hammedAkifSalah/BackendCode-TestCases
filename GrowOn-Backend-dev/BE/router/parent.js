const express = require('express');

const router = express.Router();

const parentController = require('../controller/parent');

router.route('/getBySectionId').post(parentController.getBySectionId);

router.get('/replace', parentController.replace);

router.post('/login', parentController.login);
router.post('/find', parentController.find);
router.post('/updatePassword', parentController.UpdatePassword);
router.post('/profile/image/:id', parentController.profile_image);
router.post('/deleteAllParentBySchoolId', parentController.deleteParent);
router.put('/updateDeviceToken/:id', parentController.updateDeviceToken);

router.route('/getProgress').post(parentController.getParentProgess);
router.route('/getProgress/livePoll/:id').get(parentController.getParentProgessLivePoll);
router.route('/getProgress/checkList/:id').get(parentController.getParentProgessCheckList);
router.route('/getProgress/event/:id').get(parentController.getParentProgessEvent);
router.route('/getProgress/announcement/:id').get(parentController.getParentProgessAnnouncement);

module.exports = router;
