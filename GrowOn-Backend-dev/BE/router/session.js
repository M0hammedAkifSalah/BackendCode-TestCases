const express = require('express');

const router = express.Router();
const sessionController = require('../controller/session');

router.post('/manual/attendance/:id', sessionController.addStudentJoinClass);
router.post(
	'/manual/attendanceTeacher/:id',
	sessionController.addTeacherJoinClass
);

router.post('/update/:id', sessionController.updateSession);

router.post(
	'/updateCompleteSession/:id',
	sessionController.updateCompleteSession
);

router.delete('/delete/:id', sessionController.deleteSession);

router.post('/linkedId/delete', sessionController.deleteByLinkedId);

// scheduleClassArchive
router.route('/').post(sessionController.GetAll);
router.route('/withPagination').post(sessionController.GetAllWithPagination);
router.route('/future').post(sessionController.GetFutureDates);
router.route('/tofuture').post(sessionController.toFutureDates);
router.route('/limited').post(sessionController.get);

router.route('/add').post(sessionController.Create);

router.route('/joinSession/:id').post(sessionController.studentJoin);

router.route('/joinSessionParent/:id').post(sessionController.parentJoin);

router.route('/joinSessionTeacher/:id').post(sessionController.teacherJoin);

// SESSION REPORTS
router
	.route('/report/institute/:instituteId')
	.get(sessionController.instituteReport);
router
	.route('/report/school/:schoolId/students')
	.get(sessionController.schoolStudentsReport);
router
	.route('/report/school/:schoolId/teachers')
	.get(sessionController.schoolTeachersReport);

router.route('/:id').post(sessionController.GetById);

module.exports = router;
