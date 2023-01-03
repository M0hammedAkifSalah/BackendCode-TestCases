const express = require('express');
const branchController = require('../controller/branch');

const router = express.Router();

router
	.route('/')
	.get(branchController.getAllBranch)
	.post(branchController.createBranch);

router
	.route('/:id')
	.get(branchController.getBranch)
	.put(branchController.updateBranch)
	.delete(branchController.deteleBranch);

module.exports = router;
