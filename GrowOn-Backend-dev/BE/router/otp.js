const express = require('express');

const router = express.Router();
const OtpController = require('../controller/otp');

router.post('/', OtpController.otp);
router.post('/send', OtpController.SendOtp);
router.post('/verify', OtpController.VerifyOtp);

module.exports = router;
