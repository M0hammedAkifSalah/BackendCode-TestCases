const router = require('express').Router();
const featureController = require('../controller/features');

router.route('/create').post(featureController.create);

router.route('/get').get(featureController.getAll);

router
	.route('/:id')
	.get(featureController.get)
	.put(featureController.update)
	.delete(featureController.delete);

module.exports = router;
