const express = require('express');

const router = express.Router();
const scheduleClassController = require('../controller/schedule_class');

router.post(
	'/manual/attendance/:id',
	scheduleClassController.addStudentJoinClass
);
router.post(
	'/manual/attendanceTeacher/:id',
	scheduleClassController.addTeacherJoinClass
);

router.post('/update/:id', scheduleClassController.UpdatescheduleClass);

router.post('/delete/:id', scheduleClassController.scheduleClassArchive);

router.post('/linkedId/delete', scheduleClassController.deleteByLinkedId);

// scheduleClassArchive
router.route('/').post(scheduleClassController.GetAll);
router.route('/limited').post(scheduleClassController.get);

router.route('/add').post(scheduleClassController.Create);

router.route('/joinClass/:id').post(scheduleClassController.studentJoin);

router.route('/joinClassTeacher/:id').post(scheduleClassController.teacherJoin);

router.route('/:id').post(scheduleClassController.GetById);

module.exports = router;
