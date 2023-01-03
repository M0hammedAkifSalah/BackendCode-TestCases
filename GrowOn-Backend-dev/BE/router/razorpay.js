const express = require('express');

const router = express.Router();
const razorpay = require('../razorpay/razorpay');

router.route('/createOrder').post(razorpay.CreateOrder);
router.route('/createOrderMany').post(razorpay.CreateOrderMany);
router.route('/update').post(razorpay.orderUpdates);
router.route('/verifyOrder').post(razorpay.VerifyOrder);
router.route('/createOrderStudent').post(razorpay.CreateOrderStudent);
router.route('/getAllOrder').get(razorpay.GetAll);

module.exports = router;
