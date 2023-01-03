const express = require('express');
const boardController = require('../controller/board');

const router = express.Router();

router
	.route('/')
	.post(boardController.Create)
	.put(boardController.updateRepo)
	.get(boardController.getAllData);

router.route('/getmapdata').get(boardController.getAllDataWithClassId);

router
	.route('/byschool/:school_id')
	.get(boardController.getBoardByschoolId)
	.put(boardController.updateMapDetalis);

router.route('/:id').get(boardController.getByID).put(boardController.Update);

router.post('/unMapBoard', boardController.unMapBoard);
router.post('/deleteBoard', boardController.deleteBoard);
module.exports = router;
