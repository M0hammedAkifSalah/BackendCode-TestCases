const express = require('express');

const router = express.Router();
const fileDirectoryController = require('../controller/fileDirectory');

router
	.route('/')
	.get(fileDirectoryController.GetDir)
	.post(fileDirectoryController.CreateDir);

router
	.route('/file')
	.post(fileDirectoryController.AddFiles)
	.put(fileDirectoryController.UpdateFiles)
	.delete(fileDirectoryController.RemoveFiles);

router
	.route('/:dirId')
	.put(fileDirectoryController.UpdateDir)
	.delete(fileDirectoryController.DeleteDir);

module.exports = router;
