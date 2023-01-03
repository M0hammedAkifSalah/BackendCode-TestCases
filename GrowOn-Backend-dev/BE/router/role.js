const express = require('express');

const router = express.Router();
const rolerouter = require('../controller/roleContoller');

router.route('/').post(rolerouter.Create).get(rolerouter.GetAll);
router.route('/dashboard').get(rolerouter.GetAllDashboard);

router.route('/search').post(rolerouter.search);

router.route('/exist').post(rolerouter.exist);

router.route('/get').post(rolerouter.Get);

router.route('/:id').put(rolerouter.Update);

router.route('/deleteRole').post(rolerouter.deleteRole);

module.exports = router;
