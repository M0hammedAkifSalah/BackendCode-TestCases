const express = require('express');

const router = express.Router();
const assignmentController = require('../controller/assignment');

// Assignment fetching and creation APIs
router
	.route('/')
	.get(assignmentController.getAllData)
	.post(assignmentController.AssignmentCreate);

router.post('/getAssignment', assignmentController.getAssignment);

// Get 7days assignment count and status for section, class and group
router
	.route('/weekAssignmentCount')
	.get(assignmentController.weekAssignmentCount);

// Get all schools assignment data web dashboard.
router.route('/dashboard').get(assignmentController.dashboard);
router.route('/dashboard/sections').get(assignmentController.dashboardSections);

router.route('/report/sectionlist').get(assignmentController.ReportSectionList);

// summary and students by assignment id
router.get('/report/:id', assignmentController.statusCount);

// Assignment evaluation APIs
router.route('/:id/evaluate').post(assignmentController.evaluate);

router.route('/student/:id').get(assignmentController.studentAssignments);

router.post('/reassign', assignmentController.reassign);

router.post('/countByGroup', assignmentController.groupCount);

router.post('/countByClassSection', assignmentController.classSectionCount);

router.post(
	'/getAssignment/byClass',
	assignmentController.getAssignmentByClass
);

router.post(
	'/getAssignment/byGroup',
	assignmentController.getAssignmentByGroup
);

router.post('/byClass', assignmentController.assignmentByClass);

router
	.route('/getSectionAssignments')
	.post(assignmentController.assignmentBySection);

// ALL section and groups with submission count
router.route('/allGroupWithCount').post(assignmentController.getAllGroupCount);
router.route('/getAllSection').post(assignmentController.getAllsections);

// Teacher report APIs daily,weekly and monthly
router
	.route('/reportTeacher/daily')
	.get(assignmentController.teacherDailyReport);

router
	.route('/reportTeacher/weekly')
	.get(assignmentController.teacherWeeklyReport);
router
	.route('/reportTeacher/monthly')
	.get(assignmentController.teacherMonthlyReport);

// school Excel report APIs daily, weekly and monthly
router
	.route('/reportSchool/daily/excel')
	.get(assignmentController.schoolDailyReportExcel);
router
	.route('/reportSchool/monthly/excel')
	.get(assignmentController.schoolMonthlyReportExcel);

// school report APIs daily, weekly and monthly
router.route('/reportSchool/daily').get(assignmentController.schoolDailyReport);

router
	.route('/reportSchool/weekly')
	.get(assignmentController.schoolWeeklyReport);

// fetch assignment by student_id and date range
router.get('/byStudent', assignmentController.getStudentAssignment);
router
	.route('/reportSchool/monthly')
	.get(assignmentController.schoolMonthlyReport);

// class excel reports for daily, weekly and monthly
router
	.route('/reportClass/daily/excel')
	.get(assignmentController.classDailyReportExcel);
router
	.route('/reportClass/weekly/excel')
	.get(assignmentController.classWeeklyReportExcel);
router
	.route('/reportClass/monthly/excel')
	.get(assignmentController.classMonthlyReportExcel);

// class reports for daily, weekly and monthly
router.route('/reportClass/daily').get(assignmentController.classDailyReport);
router.route('/reportClass/weekly').get(assignmentController.classWeeklyReport);
router
	.route('/reportClass/monthly')
	.get(assignmentController.classMonthlyReport);

router
	.route('/reportSectionStudentList/daily')
	.get(assignmentController.sectionDailyReportStudentList);

router
	.route('/reportSectionStudentList/weekly')
	.get(assignmentController.sectionWeeklyReportStudentList);
router
	.route('/reportSectionStudentList/monthly')
	.get(assignmentController.sectionMonthlyReportStudentList);

router
	.route('/reportClassStudentList/daily')
	.get(assignmentController.classDailyReportStudentList);
router
	.route('/reportClassStudentList/weekly')
	.get(assignmentController.classWeeklyReportStudentList);
router
	.route('/reportClassStudentList/monthly')
	.get(assignmentController.classMonthlyReportStudentList);

// section report for daily, weekly and monthly
router
	.route('/reportSection/daily/excel')
	.get(assignmentController.sectionDailyReportExcel);
router
	.route('/reportSection/weekly/excel')
	.get(assignmentController.sectionWeeklyReportExcel);
router
	.route('/reportSection/monthly/excel')
	.get(assignmentController.sectionMonthlyReportExcel);
// section report for daily, weekly and monthly
router
	.route('/reportSection/daily')
	.get(assignmentController.sectionDailyReport);
router
	.route('/reportSection/weekly')
	.get(assignmentController.sectionWeeklyReport);

router
	.route('/reportSection/monthly')
	.get(assignmentController.sectionMonthlyReport);

// Teacher Excel report APIs for daily, weekly and monthly
router
	.route('/reportTeacher/monthly/excel')
	.get(assignmentController.teacherMonthlyReportExcel);

// Student Excel report APIs for daily, weekly and monthly
router
	.route('/reportStudent/monthly/excel')
	.get(assignmentController.studentMonthlyReportExcel);

// Student report APIs for daily, weekly and monthly
router
	.route('/reportStudent/daily')
	.get(assignmentController.studentDailyReport);

router
	.route('/reportStudent/weekly')
	.get(assignmentController.studentWeeklyReport);

router
	.route('/reportStudent/monthly')
	.get(assignmentController.studentMonthlyReport);
// END

// Assignment submission from student and update status
router.route('/:id/submission').post(assignmentController.studentSubmission);

router.route('/studentsBySection').post(assignmentController.studentBySection);

router.route('/studentsByGroup').post(assignmentController.studentByGroup);

// Assignment excel reports
router
	.route('/schoolMonthlyExcel')
	.get(assignmentController.schoolMonthlyExcel);

router.post('/bySectionCount', assignmentController.assignmentBySectionCount);

router
	.route('/:id')
	.get(assignmentController.getById)
	.put(assignmentController.AssignmentUpdate)
	.delete(assignmentController.deleteAssignment);
router
	.route('/updateAssignmentStatus/:id')
	.put(assignmentController.Updatestatus);

router.route('/teacherReport').post(assignmentController.teacherReport);

router
	.route('/notAssignedSections')
	.post(assignmentController.getNotassignedSections);

// Fetching classes and groups while assignment creation
router
	.route('/ClassDetails/:user_id')
	.get(assignmentController.getClassDetails);
router
	.route('/groupDetails/:user_id')
	.get(assignmentController.getGroupDetails);

// Doubts and comments related APIs
// router
// 	.route('/:assignmentId/doubt')
// 	.get(assignmentController.GetDoubts)
// 	.post(assignmentController.CreateDoubt)
// 	.delete(assignmentController.DeleteDoubt);

module.exports = router;
