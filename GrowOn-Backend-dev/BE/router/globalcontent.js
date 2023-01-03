const express = require('express');

const router = express.Router();
const globalcontentrouter = require('../controller/globalcontent');

router
	.route('/')
	.post(globalcontentrouter.Create)
	.get(globalcontentrouter.GetAll);

router.route('/pushNotification').post(globalcontentrouter.GetNotification);
router
	.route('/:id')
	.get(globalcontentrouter.getById)
	.put(globalcontentrouter.Update);

module.exports = router;
