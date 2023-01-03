const mongoose = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const bcrypt = require('bcrypt');
const mongoose_block = require('../middleware/skipBlockedUser');

const passwordUtil = require('../utils/password');

const studentSchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	DeviceToken: {
		type: String,
		required: false,
	},
	activeStatus: {
		type: Boolean,
		required: false,
		default: true,
	},
	deleted: {
		type: Boolean,
		default: false,
		required: false,
	},
	name: {
		type: String,
		required: false,
	},
	profileStatus: {
		type: String,
		default: 'APPROVED',
		enum: ['APPROVED', 'PENDING', 'BLOCKED'],
		required: false,
	},
	profile_image: {
		type: String,
		required: false,
	},
	role: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role',
		required: true,
	},
	// role === objectid & profiletype === string
	// delete profile_type in future
	profile_type: {
		type: String,
		required: false,
		default: 'student',
	},
	passport_image: {
		type: String,
		required: false,
	},
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'school_id is required'],
		ref: 'School',
		index: true,
	},
	branch_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
		ref: 'Branch',
	},
	city_id: {
		type: mongoose.Schema.Types.ObjectId,
		// required: true,
		ref: 'City',
	},
	country_id: {
		type: mongoose.Schema.Types.ObjectId,
		// required: true,
		ref: 'Country',
	},
	state_id: {
		type: mongoose.Schema.Types.ObjectId,
		// required: true,
		ref: 'State',
	},
	username: {
		type: String,
		required: [true, 'username is required'],
		index: true,
	},
	password: {
		type: String,
		required: false,
		select: false,
	},
	pin: {
		type: String,
		required: false,
		default: '',
	},
	contact_number: {
		type: Number,
		required: false,
	},
	admission_no: {
		type: String,
		required: false,
	},
	pincode: {
		type: Number,
		required: false,
	},
	dob: {
		type: Date,
		required: false,
	},
	gender: {
		type: String,
		required: false,
	},
	email: {
		type: String,
		required: false,
	},
	address: {
		type: String,
		required: false,
	},
	aadhar: {
		type: String,
		required: false,
	},
	sts_no: {
		type: String,
		required: false,
	},
	rte_student: {
		type: String,
		required: false,
	},
	caste: {
		type: String,
		required: false,
	},
	religion: {
		type: String,
		required: false,
	},
	mother_tongue: {
		type: String,
		required: false,
	},
	blood_gr: {
		type: String,
		required: false,
	},
	mode_of_transp: {
		type: String,
		required: false,
	},
	medical_cond: {
		type: String,
		required: false,
	},
	wear_glasses: {
		type: String,
		required: false,
	},
	class: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'class is required'],
		ref: 'Class',
	},
	section: {
		type: mongoose.Schema.Types.ObjectId,
		required: [true, 'section is required'],
		ref: 'Section',
	},
	subject: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Subject',
			},
		],
		default: [],
	},
	coin: {
		type: Number,
		required: false,
	},
	about_me: {
		type: String,
		required: false,
	},
	hobbies: {
		type: String,
		required: false,
	},
	repository: {
		type: Array,
		required: false,
	},
	rewards: {
		coins: {
			type: Number,
			required: false,
			default: 0,
		},
		dailyCoins: {
			type: Number,
			required: false,
			default: 5,
		},
		isClaimed: {
			type: Boolean,
			required: false,
		},
		date: {
			type: Date,
			required: false,
			default: Date.now(),
		},
	},
	parent_id: {
		type: mongoose.Schema.Types.ObjectId,
		require: [true, 'Parent_id is required'],
		ref: 'Parent',
	},
	livepoll: {
		assigned: {
			type: Number,
			default: 0,
			required: false,
		},
		completed: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	checklist: {
		assigned: {
			type: Number,
			default: 0,
			required: false,
		},
		completed: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	event: {
		assigned: {
			type: Number,
			default: 0,
			required: false,
		},
		completed: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	announcement: {
		assigned: {
			type: Number,
			default: 0,
			required: false,
		},
		completed: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	assignment: {
		assigned: {
			type: Number,
			default: 0,
			required: false,
		},
		completed: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	stats: {
		attendance: {
			present: {
				type: Number,
				default: 0,
			},
			absent: {
				type: Number,
				default: 0,
			},
			late: {
				type: Number,
				default: 0,
			},
			partial: {
				type: Number,
				default: 0,
			},
		},
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

studentSchema.pre('save', async function (next) {
	if (this.isModified('password') && this.password) {
		this.password = await passwordUtil.getHash(this.password);
	}

	next();
});

// compare password
studentSchema.methods.comparePassword = function (password) {
	return bcrypt.compare(password, this.password);
};

studentSchema.plugin(mongoose_delete, { overrideMethods: 'all' });
studentSchema.plugin(mongoose_block);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
