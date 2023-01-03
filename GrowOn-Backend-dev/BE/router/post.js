const router = require('express').Router();
const postController = require('../controller/post');

router.route('/').post(postController.create).get(postController.getAll);

router
	.route('/:id')
	.get(postController.get)
	.put(postController.update)
	.delete(postController.delete);

module.exports = router;
