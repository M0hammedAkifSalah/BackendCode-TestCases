const express = require('express');
const schoolControlle = require('../controller/school');

const router = express.Router();

router.route('/sectionWiseProgress').post(schoolControlle.sectionWiseProgress);

router
	.route('/')
	.get(schoolControlle.getAllSchool)
	.post(schoolControlle.createSchool);

router
	.route('/getAllUpdateSchoolCode')
	.post(schoolControlle.getAllUpdateSchoolCode);

router
	.route('/deleteParentAndStudentFromSchoolId')
	.post(schoolControlle.deleteParentAndStudentFromSchoolId);

router.route('/requestedUsers/update').put(schoolControlle.UpdateRequestStatus);

router.route('/userSignup').post(schoolControlle.updateSignup);

router
	.route('/getSchoolswithSelfSignup')
	.get(schoolControlle.SelfSignupSchools);

router
	.route('/:id')
	.get(schoolControlle.getSchool)
	.put(schoolControlle.updateSchool)
	.delete(schoolControlle.deteleSchool);

router
	.route('/:id/updatelocation')
	.post(schoolControlle.UpdateLocationCoordinates);

router.route('/:id/stats').get(schoolControlle.GetSchoolStats);

router.route('/payment/:id').put(schoolControlle.updatePayment);
router.route('/payment/:id').get(schoolControlle.orderSchool);

router.route('/promoteStudent/:id').post(schoolControlle.promoteStudent);

router.post('/promoteStudent', schoolControlle.newPromote);

router
	.route('/deleteCompleteData/:id')
	.delete(schoolControlle.deleteSchoolData);

router
	.route('/mapping/:id')
	.get(schoolControlle.getAllDataWithSchoolID)
	.delete(schoolControlle.deleteAllMappingData);

router.get('/newapi/getschool/:id', schoolControlle.getSchoolById);
router.get(
	'/newapi/updateschoolclasslist',
	schoolControlle.getSchoolAndUpdateClassList
);
router.get('/newapi/getschool', schoolControlle.getSchoolAllData);
router.get('/sections/get', schoolControlle.getSchoolClassAndSection);

router.post('/filter', schoolControlle.filter);

router.post('/newapi/filter', schoolControlle.newfilter);

router.get('/newapi/getschools/:id', schoolControlle.getSchoolsByState);

router.post('/newapi/create/addschool', schoolControlle.addSchool);
router.put('/newapi/updateschool/:id', schoolControlle.updateSchoolData);
router.put('/newapi/updatebranchcity/city', schoolControlle.UpdatebranchCity);

router.post('/updateActiveStatus', schoolControlle.updateActiveStatus);

router.get('/mapDetails/:id', schoolControlle.getMapDetail);

router.post(
	'/updateClassInSchoolCollection',
	schoolControlle.updateClassInSchoolCollection
);
router.post('/paymentStatisticsMonthly', schoolControlle.paymentStatistics);

module.exports = router;
