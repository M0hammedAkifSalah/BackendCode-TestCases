const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

const orderSchema = mongoose.Schema({
	order_id: {
		type: String,
	},
	razorpay_payment_id: {
		type: String,
	},
	entity: {
		type: String,
		required: false,
	},
	no_of_student: {
		type: Number,
		default: 0,
		required: false,
	},
	invoice_No: {
		type: Number,
		default: 0,
	},
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
	},
	due_date: {
		type: Date,
	},
	payment_date: {
		type: Date,
	},
	amount: {
		type: Number,
		default: 0,
		required: false,
	},
	userInfo: {
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Student',
			default: null,
		},
		default: {},
	},
	amount_paid: {
		type: Number,
		default: 0,
		required: false,
	},
	amount_due: {
		type: Number,
		default: 0,
		required: false,
	},
	currency: {
		type: String,
		required: false,
	},
	receipt: {
		type: String,
		required: false,
	},
	offer_id: {
		type: String,
		required: false,
	},
	status: {
		type: String,
		required: false,
	},
	attempts: {
		type: Number,
		required: false,
		default: 0,
	},
	notes: {
		type: [],
		required: false,
		default: [],
	},
	created_at: {
		type: Date,
		default: Date.now,
	},
	updated_at: {
		type: Date,
		default: Date.now,
	},
});
orderSchema.plugin(autoIncrement.plugin, {
	model: 'Order',
	field: 'invoice_No',
	startAt: 0000,
});
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
