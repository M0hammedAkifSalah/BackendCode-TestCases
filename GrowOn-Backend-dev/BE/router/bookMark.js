const express = require('express');

const router = express.Router();
const bookmarkController = require('../controller/bookmark');

router.post('/', bookmarkController.getBookMark);
router.post('/create', bookmarkController.CreateBookMark);

router.post('/parent', bookmarkController.getBookMarkParent);
router.post('/parent/create', bookmarkController.CreateBookMarkParent);

router.post('/update', bookmarkController.UpdateBookMark);
router.post('/delete/:id', bookmarkController.delete);

router.post('/parent/delete/:id', bookmarkController.deleteParent);

module.exports = router;
