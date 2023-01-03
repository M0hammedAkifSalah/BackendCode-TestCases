const crypto = require('crypto');
const Razorpay = require('razorpay');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const APIFeatures = require('../utils/apiFeatures');
const StudentModel = require('../model/student');
const SchoolModel = require('../model/school');
const OrderModel = require('../model/order');

async function amountWithGST(school_id) {
	try {
		let count = await StudentModel.find({ school_id, deleted: false });
		count = count.length;
		const amount = count * 10 + 1.8 * count;
		return { amount, count };
	} catch (err) {
		return null;
	}
}
async function createOrder(order, count, schoolId) {
	try {
		const startdate = new Date(Date());
		startdate.setDate(startdate.getDate() + 30);
		const orderModel = new OrderModel({
			order_id: order.id,
			entity: order.entity,
			amount: (order.amount / 100).toFixed(2),
			amount_paid: (order.amount_paid / 100).toFixed(2),
			amount_due: order.amount_due / 100,
			currency: order.currency,
			receipt: order.receipt,
			offer_id: order.offer_id,
			status: order.status,
			no_of_student: count,
			school_id: schoolId,
			due_date: startdate,
			attempts: order.attempts,
			notes: order.notes,
			created_at: Date(order.created_at),
		});
		const orderData = await orderModel.save();
		return orderData;
	} catch (err) {
		return null;
	}
}
exports.CreateOrder = catchAsync(async (req, res, next) => {
	const schoolId = req.body.school_id;
	const instance = new Razorpay({
		key_id: process.env.key_id,
		key_secret: process.env.key_secret,
	});
	const { amount, count } = await amountWithGST(schoolId);
	const options = {
		amount: amount * 100,
		currency: req.body.currency ? req.body.currency : 'INR',
		receipt: crypto.randomBytes(10).toString('hex'),
	};
	options.amount = Math.round(options.amount);
	instance.orders.create(options, async (error, order) => {
		if (error) {
			return res.status(500).json(error);
		}
		const orderData = await createOrder(order, count, schoolId);
		const orderDetails = JSON.parse(JSON.stringify(orderData));
		await SchoolModel.findByIdAndUpdate(schoolId, {
			$push: { 'payment.orders': orderData._id },
		});
		res.status(200).json({ data: orderDetails });
	});
});

exports.CreateOrderMany = catchAsync(async (req, res, next) => {
	const orderList = [];
	for (const schoolId of req.body.schoolIdList) {
		const instance = new Razorpay({
			key_id: process.env.key_id,
			key_secret: process.env.key_secret,
		});
		const { amount, count } = await amountWithGST(schoolId);
		const options = {
			amount: amount * 100,
			currency: req.body.currency ? req.body.currency : 'INR',
			receipt: crypto.randomBytes(10).toString('hex'),
		};
		options.amount = Math.round(options.amount);
		instance.orders.create(options, async (error, order) => {
			if (error) {
				return res.status(500).json(error);
			}
			const orderData = await createOrder(order, count, schoolId);
			orderList.push(orderData._id);
			const orderDetails = JSON.parse(JSON.stringify(orderData));
			await SchoolModel.findByIdAndUpdate(schoolId, {
				$push: { 'payment.orders': orderData._id },
			});
		});
	}
	res.status(200).json({ message: 'order created', data: orderList });
});

exports.VerifyOrder = catchAsync(async (req, res, next) => {
	const { order_id, payment_id, signature, school_id } = req.body;
	const sign = `${order_id}|${payment_id}`;
	const expectedSign = crypto
		.createHmac('sha256', process.env.key_secret)
		.update(sign.toString())
		.digest('hex');
	if (signature === expectedSign) {
		await OrderModel.findOneAndUpdate({ order_id: req.body.order_id }, [
			{
				$set: {
					amount_paid: '$amount',
					amount_due: 0,
					status: 'Paid',
					payment_date: Date(),
					razorpay_payment_id: payment_id,
				},
			},
		]);
		if (req.body.school_id) {
			await SchoolModel.findByIdAndUpdate(school_id, {
				'payment.lastPayDone': Date(),
			});
		}
		res.json({ success: true, message: 'Payment has been verified' });
	} else {
		await OrderModel.findOneAndUpdate({ order_id: req.body.order_id }, [
			{
				$set: { status: 'Attempted' },
			},
		]);
		res.json({ success: false, message: 'Payment verification failed' });
	}
});
exports.GetAll = catchAsync(async (req, res, next) => {
	const orderQuery = new APIFeatures(
		OrderModel.find({}).populate('userInfo.student_id', 'name'),
		req.query
	)
		.filter()
		.limitFields()
		.paginate();

	const orderDetails = await orderQuery.query;
	res.json(
		SuccessResponse(
			orderDetails,
			orderDetails.length,
			'order record fetched successfully'
		)
	);
});
exports.orderUpdates = catchAsync(async (req, res, next) => {
	let orderQuery = await OrderModel.find({}).sort('created_at');
	let num = 0000;
	orderQuery = JSON.parse(JSON.stringify(orderQuery));
	for (const ele of orderQuery) {
		num+=1
		await OrderModel.findByIdAndUpdate(
			{ _id: ele._id },
			{ $set: { invoice_No: num } }
		);
	}
	res.json(
		SuccessResponse(null,0,
			'order record fetched successfully'
		)
	);
});
exports.CreateOrderStudent = catchAsync(async (req, res, next) => {
	const instance = new Razorpay({
		key_id: process.env.key_id,
		key_secret: process.env.key_secret,
	});
	const options = {
		amount: req.body.amount * 100,
		currency: req.body.currency ? req.body.currency : 'INR',
		receipt: crypto.randomBytes(10).toString('hex'),
	};
	options.amount = Math.round(options.amount);
	instance.orders.create(options, async (error, order) => {
		if (error) {
			return res.status(500).json(error);
		}
		const orderDetails = await OrderModel.create({
			order_id: order.id,
			entity: order.entity,
			amount: (order.amount / 100).toFixed(2),
			amount_paid: (order.amount_paid / 100).toFixed(2),
			currency: order.currency,
			receipt: order.receipt,
			offer_id: order.offer_id,
			status: order.status,
			school_id: req.body.school_id,
			userInfo: req.body.userInfo,
			attempts: order.attempts,
			notes: order.notes,
			created_at: Date(order.created_at),
		});
		res.status(200).json({ data: orderDetails });
		res.json(
			SuccessResponse(orderDetails, 1, 'order record created successfully')
		);
	});
});
