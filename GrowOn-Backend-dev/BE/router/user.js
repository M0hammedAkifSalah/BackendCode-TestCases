const express = require('express');

const router = express.Router();
const teacherController = require('../controller/user');

router.route('/getall').get(teacherController.GetAll);
router.route('/globalData').get(teacherController.GetAllGlobalData);

router.post('/find', teacherController.find);
router.post('/user/dashboard', teacherController.AllDashboardData);
router.post('/updatePinCode', teacherController.updatePincode);

router.post('/updateUserPassword', teacherController.updateUserPassword);

router.post('/mobileLogin', teacherController.mobileLogin);
router.post('/user', teacherController.getAllData);

router.get('/getAllUsers', teacherController.getAlluserData);

router.post('/getAllteacherIds', teacherController.getAllteacherIds);

router.post('/updateschoolid', teacherController.UpdateSchoolId);
router.post('/teacher/class', teacherController.getteacherClass);
router.post('/teacher/id', teacherController.getteacherId);
router.post(
	'/teacher/updateDeviceToken/:id',
	teacherController.updateDeviceToken
);
router.post('/profile/image/:id', teacherController.profile_image);
router.post('/profile/:id', teacherController.UpdateTeacherData);
router.post('/bulkupload', teacherController.BulkUpload);
router.post('/bulkupdate', teacherController.BulkUpdate);

// router.post('/delete', teacherController.DeleteUser);
router.post('/deleteUser', teacherController.deleteUserBySchool);
router.put('/updatestate/:id', teacherController.UpdateIsform);

router.post('/existWithMobile', teacherController.ExistWithMobile);

router.post('/validationCheck', teacherController.validationCheck);

router.put('/userActiveStatus/:id', teacherController.UpdateactiveStatus);

router.post('/deleteAllUserBySchoolId', teacherController.deleteUser);

router.post('/excelsheet', teacherController.excelSheet);

router
	.route('/')
	.post(teacherController.Create)
	.get(teacherController.getAllData);

router.route('/createMany').post(teacherController.CreateMany);

router.route('/page').get(teacherController.getAllData);

router.route('/userByRole').post(teacherController.userByRole);

router.route('/userByRoleCount').post(teacherController.userByRoleCount);

router.route('/userIdByRole').post(teacherController.userIdByRole);

router.route('/get').post(teacherController.Get);

router.route('/userFilter').post(teacherController.userFilter);

// daily claiming coins
router.route('/:id/dailyCoins').get(teacherController.dailyCoins);

router.route('/:id/rewards').get(teacherController.getUserRewards);
// end

router
	.route('/:id')
	.get(teacherController.getById)
	.put(teacherController.Update);

router.route('/login').post(teacherController.login);

module.exports = router;
