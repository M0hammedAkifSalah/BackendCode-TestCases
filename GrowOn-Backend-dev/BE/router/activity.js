const express = require('express');

const router = express.Router();
const activityController = require('../controller/activity');

router.route('/getTeachersData').post(activityController.GetTeachersData);

router.post('/search', activityController.search);

router
	.route('/updateStatusToEvaluate/:id')
	.put(activityController.UpdatestatusEvaluate);

router.post('/createAssignment', activityController.AssignmentCreate);
router.put('/updateAssignment/:id', activityController.AssignmentUpdate);

router
	.route('/updateAssignmentStatus/:id')
	.put(activityController.Updatestatus);

router.post('/addAnouncement', activityController.AcknowledgeCreate);
router.put('/updateAnouncement/:id', activityController.updateAcknowledge);

router.post('/addLivepool', activityController.createLivepool);
router.put('/updateLivepool/:id', activityController.updateLivepoolData);

router.post('/addEventCreact', activityController.EventCreate);
router.put('/updateEvent/:id', activityController.updateEvent);

router.post('/Checklist/add', activityController.createCheckList);
router.put('/updateChecklist/:id', activityController.updateCheckList);

router.post('/Like/:id', activityController.Like);
router.post('/Dislike/:id', activityController.Dislike);
router.post('/checklist/:id', activityController.UpdateCheckListStatus);
router.post('/viewed/:id', activityController.Viewed);
router.post('/forwarded/:id', activityController.Activityforwaded);
router.post(
	'/Anouncement/teacher/:id',
	activityController.AcknowledgeByTeacher
);
router.post(
	'/event/going/teacher/:id',
	activityController.EventUpdateByTeacher
);
router.post(
	'/event/notgoing/teacher/:id',
	activityController.EventNotGoingUpdateByteacher
);
router.post('/Anouncement/parent/:id', activityController.AcknowledgeByParent);
router.post(
	'/event/going/parent/:id',
	activityController.EventGoingUpdateByParent
);
router.post(
	'/event/notgoing/parent/:id',
	activityController.EventNotGoingUpdateByParent
);
router.post('/delete/:id', activityController.ActivityArchive);
router.post('/reassign', activityController.reassign);
router.post('/submitEvaluated', activityController.submitTeacherEvaluated);

router.route('/').post(activityController.GetAll);

router.route('/getAllUpdatestatus').post(activityController.getAllUpdatestatus);
router.route('/:id').post(activityController.getById);

router.route('/Anouncement/:id').post(activityController.AcknowledgeUpdate);

router.route('/Assignment/:id').post(activityController.Assignmentcompleted);

router
	.route('/offlineAssignment/:id')
	.post(activityController.offlineAssignment);

router.route('/Event/going/:id').post(activityController.EventGoingUpdate);
router
	.route('/teacherData/activityStatus/:id')
	.get(activityController.teacherDataActivityStatus);

router
	.route('/Event/notgoing/:id')
	.post(activityController.EventNotGoingUpdate);

router.route('/livepool/:id').post(activityController.UpdatelivePool);

router.route('/feed/:id').post(activityController.ActivityComment);
module.exports = router;
