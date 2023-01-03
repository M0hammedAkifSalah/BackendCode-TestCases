const express = require('express');

const router = express.Router();

const statsController = require('../controller/stats_dashboard');

router
	.route('/userByRole')
	.get(statsController.userByRole)
	.post(statsController.userByRolePost);

router.get('/', statsController.activityCount);
router.get('/student/details', statsController.schooldetailsStats);
router.get('/student/caste', statsController.stdCasteCount);
router.get('/student/illness', statsController.stdIllnessCount);
router.get('/student/transport', statsController.stdModeOfTansportCount);
router.get('/student/wearglass', statsController.stdWithGlassCount);
router.get('/student/motherTongue', statsController.stdMotherTongeCount);
router.get('/student/bloodGr', statsController.stdBloodGrCount);
router.post('/studentList', statsController.studentListCount);
router.post('/classprogress/calculate', statsController.classprogress);
router.get('/attendance/:id', statsController.scheduleClassCount);
router.post('/progress/:id', statsController.classprogressActivity);
router.post('/facultyList', statsController.totalFaculty);
router.post('/parentList', statsController.totalParent);
router.get('/:id', statsController.studentCount);

router.get('/assignment/:id', statsController.assignmentStats);

router.get('/lateSubmission/:id', statsController.lateSubmission);

router.get('/livepool/:id', statsController.livepoolStats);
router.get('/allprogress/:id', statsController.AllStats);
router.get('/Announcement/:id', statsController.AnnuncncementStat);
router.get(
	'/AnnouncementTeacher/:id',
	statsController.AnnuncncementStatTeacher
);
router.get('/EventTeacher/:id', statsController.EventStatsTeacher);
router.get('/checkListStatsTeacher/:id', statsController.checkListTeacher);
router.get('/livepoolTeacher/:id', statsController.livepoolStatsTeacher);

router.get('/Event/:id', statsController.EventStats);

router.get('/studentStats/:id', statsController.totalStats);
router.get('/checkListStats/:id', statsController.checkList);
router.get('/testing/app', statsController.dashbaordStatsdetails);
router.get('/school/branch', statsController.branchCount);
router.get('/student/count', statsController.studentdashboardCount);
router.post('/student/count', statsController.studentdashboardCountPost);
router.get('/student/class/count', statsController.studentClassList);
router.get('/student/class/count/count', statsController.studentClassListCount);
router.get(
	'/school/:school_id/classgendercount',
	statsController.classGenderCount
);
router.get('/student/genderCount', statsController.genderCount);

// totalStats  branchCount  studentCount studentClassList
// router.get('/count', questionController.GetNumber);
// router.get('/filter', questionController.filterData);

// router
// .route('/')
//     .get(questionController.Get)
//     .post(questionController.Create)

// router
// .route('/:id')
//     .get(questionController.GetById)
//     .delete(questionController.DeleteQuestion)
//     .put(questionController.Update);

module.exports = router;
