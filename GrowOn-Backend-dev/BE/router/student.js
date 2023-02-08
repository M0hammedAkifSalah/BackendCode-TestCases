const express = require('express');

const router = express.Router();
const multer = require('multer');

const student = require('../controller/student');

const upload = multer({ dest: 'tmp/csv/' });

router.post('/login', student.login);
router.post('/search', student.search);
router.post('/searchStudents', student.searchStudent);

router.post('/enroll', student.enroll);
router.get('/countBySchool', student.countBySchool);

router.post('/find', student.find);
router.post('/updatePassword', student.UpdatePassword);
router.post('/profile/:id', student.UpdateStudentData);
router.post('/Studentclassid', student.UpdateStudentClassID);
router.post('/profile/image/:id', student.profile_image);
router.get('/studentlist', student.student_details);
router.put('/student/:id', student.UpdateStudentDetails);

router.put('/studentActiveStatus/:id', student.UpdateactiveStatus);

router.post('/deleteMapping', student.deleteMapping);

// student assignment coins
router.route('/:id/dailyCoins').get(student.updateDailyCoins);
router.route('/:id/getDailyCoins').get(student.getDailyCoins);

router.route('/:id/rewards').get(student.getStudentsRewards);

router.post('/excelSheet', student.excelworksheet);

router.post('/download', student.exceldownload);

router.get('/dashboard', student.GetDashoardData);
router.post('/dashboard', student.GetDashoardDataPost);
router.post('/dashboardCount', student.GetDashoardDataCount);

router.get('/studentwithparent', student.GetWithParentDetalis);
router.get('/getAllstudentwithparent', student.getAllstudentwithparent);
router.post('/bulkUpload', upload.single('file'), student.BulkUpload);
router.post('/deleteAllStudentBySchoolId', student.deleteStudent);
router.post('/deleteAllStudentByClass', student.deleteAllClassStudents);
router.post('/deleteAllStudentBySection', student.deleteAllSectionStudents);
// GetDashoardData    BulkUpload
router.get('/GetAllStudentIds', student.GetAllStudentIds);
router.post('/addActiveStatusInUsers', student.addActiveStatusInUsers);
router.post('/deleteSectionFromStudents', student.deleteSectionFromStudents);

// This is router for fetching the students by section_id
router.get('/section/:sectionId', student.studentBySection);

router.route('/').post(student.Create).get(student.Get);
router.route('/createManyStudent').post(student.CreateMany);

router.post('/enroll', student.enroll);

router.route('/get').get(student.Get);

router.route('/getAllStudents').post(student.GetAllStudents);

router.put('/updateDeviceToken/:id', student.updateDeviceToken);

router.route('/getBySectionId').post(student.getBySectionId);

router.route('/:id').get(student.getById).put(student.updateById);

router.route('/bulkUpdate').post(student.BulkUpdate);

router
	.route('/byschool/:school_id/:page/:limit')
	.get(student.student_details)
	.post(student.student_details_post);

router
	.route('/count/byschool/:school_id')
	.get(student.student_details_count)
	.post(student.student_details_count_post);

router.route('/parentNumberValidation').post(student.parentNumberValidation);

module.exports = router;
