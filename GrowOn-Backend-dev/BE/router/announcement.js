const express = require('express');

const router = express.Router();
const announcementController = require('../controller/announcement');

router
	.route('/')
	.get(announcementController.GetAll)
	.post(announcementController.Create);

router
	.route('/:id')
	.get(announcementController.GetById)
	.put(announcementController.Update);

router
	.route('/:id/like')
	.put(announcementController.AddLike)
	.delete(announcementController.RemoveLike);

router.route('/:id/acknowledge').put(announcementController.AddAcknowledge);

module.exports = router;
