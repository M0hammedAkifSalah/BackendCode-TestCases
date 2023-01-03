const router = require('express').Router();

const authController = require('../controller/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/getMe', authController.getMe);
router.post('/updateMe', authController.updateMe);

module.exports = router;
