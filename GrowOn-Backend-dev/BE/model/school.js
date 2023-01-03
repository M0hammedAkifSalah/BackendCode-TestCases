const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(mongoose);
const schoolSchema = new mongoose.Schema({
	schoolName: {
		type: String,
		required: [true, 'School name required'],
	},
	school_code: {
		type: Number,
		default: 0,
	},
	schoolImage: {
		type: String,
		required: false,
		default: '',
	},
	address: {
		type: String,
		required: false,
	},
	location: {
		type: {
			type: String,
			default: 'Point',
			enum: ['Point'],
		},
		coordinates: {
			// lon, lat
			type: [Number],
			index: '2dsphere',
		},
		radius: Number, // miles
	},
	startTime: Date,
	loginTime: Date,
	logoutTime: Date,
	city: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'City',
		required: [true, 'City Required'],
		default: null,
	},
	state: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'State',
		required: [true, 'State Required'],
		default: null,
	},
	country: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Country',
		required: [true, 'Country Required'],
		default: null,
	},
	institute: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Institute',
		required: false,
		default: null,
		index: true,
	},
	branchNumber: {
		// need to verify
		type: Number,
		required: false,
	},
	branchName: {
		// need to verify
		type: String,
		required: false,
	},
	board: {
		type: String,
		required: false,
	},
	userSignup: {
		type: Boolean,
		required: false,
		default: false,
	},
	studSignup: {
		type: Boolean,
		required: false,
		default: false,
	},
	email: {
		type: String,
		required: false,
	},
	webSite: {
		type: String,
		required: false,
	},
	contact_number: {
		type: Number,
		required: [true, 'enter Contact number'],
	},
	pincode: {
		type: Number,
		required: [false, 'enter PinCode'],
	},
	sType: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Stype',
		required: false,
	},
	classList: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Class',
				required: false,
			},
		],
		default: [],
	},
	subjectList: {
		type: Array,
		required: false,
	},
	syllabusList: {
		type: Array,
		required: false,
	},
	branch: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Branch',
				required: false,
			},
		],
		default: [],
	},
	smsActivated: {
		type: Boolean,
		default: false,
	},
	payment: {
		activeStatus: {
			type: Boolean,
			default: false,
		},
		activateDate: {
			type: Date,
		},
		status: {
			type: Boolean,
			default: false,
		},
		orders: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Order',
					required: false,
				},
			],
			default: [],
		},
		lastPayDone: {
			type: Date,
			default: Date.now,
		},
		dueDate: {
			type: Date,
			default: Date.now,
		},
	},
	onboard: {
		type: Date,
	},
	isLead: {
		type: Boolean,
		required: false,
		default: true,
	},
	activeStatus: {
		type: Boolean,
		required: false,
		default: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
		ref: 'User',
	},
	repository: {
		type: Array,
		required: false,
	},
	createdBy: {
		type: String,
		required: false,
	},
	updatedBy: {
		type: String,
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

schoolSchema.plugin(autoIncrement.plugin, {
	model: 'School',
	field: 'school_code',
	startAt: 1100,
});

const School = mongoose.model('School', schoolSchema);

module.exports = School;
