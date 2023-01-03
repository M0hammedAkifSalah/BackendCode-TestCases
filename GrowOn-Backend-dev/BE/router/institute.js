const express = require('express');

const router = express.Router();
const instituteController = require('../controller/institute');

router.route('/').get(instituteController.GetAll);

router.route('/create').post(instituteController.Create);

router.route('/updateInstitute').post(instituteController.UpdateInstitute);

router.route('/updateSchoolList').post(instituteController.UpdateSchoolList);

router.route('/removeSchool/:id').post(instituteController.removeSchool);

router.route('/:id').get(instituteController.GetById);

router.route('/delete/:id').delete(instituteController.DeletedInstitute);

module.exports = router;
