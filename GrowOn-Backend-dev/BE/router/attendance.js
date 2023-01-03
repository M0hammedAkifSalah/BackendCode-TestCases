const express = require('express');

const router = express.Router();
const attendanceController = require('../controller/attendance');

router.route('/').get(attendanceController.GetAll);
router.route('/removeDeletedStudents').get(attendanceController.deleteStudents);

router.route('/create').post(attendanceController.Create);
router.route('/createMany').post(attendanceController.CreateMany);
router.route('/byschool').get(attendanceController.bySchool);

router.route('/update').post(attendanceController.UpdateAttendanceClass);

router.get(
	'/report/schoolMonthByDate',
	attendanceController.MonthlySchoolReport
);

router.get('/report/schoolMonth', attendanceController.GetSchoolMonthlyReport);
router.get('/report/classMonth', attendanceController.GetClassMonthlyReport);
router.get(
	'/report/sectionMonth',
	attendanceController.GetSectionMonthlyReport
);
router.get('/report/schoolWeek', attendanceController.GetSchoolWeeklyReport);
router.get('/report/classWeek', attendanceController.GetClassWeeklyReport);
router.get('/report/sectionWeek', attendanceController.GetSectionWeeklyReport);
router.get('/report/schoolDaily', attendanceController.GetSchoolDailyReport);
router.get('/report/classDaily', attendanceController.GetClassDailyReport);
router.get('/report/sectionDaily', attendanceController.GetSectionDailyReport);
router.get(
	'/report/sectionDailyWeb',
	attendanceController.GetSectionDailyReportWeb
);
router.get(
	'/report/sectionWeeklyWeb',
	attendanceController.GetSectionWeeklyReportWeb
);

router.get(
	'/report/sectionMonthlyWeb',
	attendanceController.GetSectionMonthlyReportWeb
);
router.get('/report/byStudent', attendanceController.getStudentMonthly);
// router.get('/report/studentList', attendanceController.GetReportStudentList);
router.get('/report/studentList', attendanceController.GetReportStudentListNew);
router.get(
	'/report/studentListNew',
	attendanceController.GetReportStudentListNew
);
router.get(
	'/report/schoolDailyExcel',
	attendanceController.GetExcelSchoolDailyReport
);

router.get(
	'/report/schoolWeeklyExcel',
	attendanceController.GetExcelSchoolWeeklyReport
);

router.get(
	'/report/schoolMonthlyExcel',
	attendanceController.GetExcelSchoolMonthlyReport
);

router.get(
	'/report/sectionWeeklyExcel',
	attendanceController.GetExcelSectionWeeklyReport
);

router.get(
	'/report/sectionDailyExcel',
	attendanceController.GetExcelSectionDailyReport
);

router.get(
	'/report/sectionMonthlyExcel',
	attendanceController.GetExcelSectionMonthlyReport
);

router.get(
	'/report/classMonthlyExcel',
	attendanceController.GetExcelClassMonthlyReport
);

router.get(
	'/report/classWeeklyExcel',
	attendanceController.GetExcelClassWeeklyReport
);

router.get(
	'/report/classDailyExcel',
	attendanceController.GetExcelClassDailyReport
);

router.get(
	'/report/studentMonthlyExcel',
	attendanceController.GetExcelStudentMonthlyReport
);
router.get(
	'/report/studentWeeklyExcel',
	attendanceController.GetExcelStudentWeeklyReport
);

router.route('/:id').get(attendanceController.GetById);

router.route('/getbydate').post(attendanceController.GetByDate);

router.route('/list').post(attendanceController.GetList);

router.route('/previousDay').post(attendanceController.GetByPreviousDay);

router.route('/reportbyschool').post(attendanceController.ReportBySchool);

router.route('/reportbystudent').post(attendanceController.ReportByStudent);

router.route('/byclass').post(attendanceController.ReporByClass);

router.route('/schoolsReport').post(attendanceController.SchoolsReport);

router
	.route('/attendanceReportStudent/:id')
	.get(attendanceController.AttendanceReportByStudent);

// router.route('/reportbysection').post(attendanceController.ReportBySection);

router.route('/delete/:id').delete(attendanceController.DeletedAttendance);

router
	.route('/attendanceUpdate/:id')
	.post(attendanceController.StudentAttendanceUpdate);

module.exports = router;
