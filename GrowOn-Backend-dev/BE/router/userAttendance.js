const router = require('express').Router();
const attendanceController = require('../controller/userAttendance');

router
	.route('/')
	.get(attendanceController.getAll)
	.post(attendanceController.create);

router.route('/verifylocation').post(attendanceController.verifyLocation);

router
	.route('/manage')
	.get(attendanceController.getAllAttendance)
	.post(attendanceController.updateAllAttendance);

router.route('/report/userMonthly').get(attendanceController.userMonthlyReport);

router
	.route('/:id')
	.get(attendanceController.getById)
	.put(attendanceController.updateById)
	.delete(attendanceController.deleteById);

module.exports = router;
