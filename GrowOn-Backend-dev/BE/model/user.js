const mongoose = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const bcrypt = require('bcrypt');
const mongoose_block = require('../middleware/skipBlockedUser');
const userGlobalData = require('../data/user');

const passwordUtil = require('../utils/password');

const userSchema = new mongoose.Schema({
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
	profileStatus: {
		type: String,
		default: 'APPROVED',
		enum: ['APPROVED', 'PENDING', 'BLOCKED'],
		required: false,
	},
	coin: {
		type: Number,
		required: false,
		default: 0,
	},
	role: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role',
		required: true,
	},
	// no diff in role & profiletype
	// delete profile_type in future
	profile_type: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role',
	},
	profile_image: {
		type: String,
		required: false,
	},
	passport_image: {
		type: String,
		required: false,
	},
	about_me: {
		type: String,
		required: false,
	},
	isSubmitForm: {
		type: Boolean,
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
	secondary_profile_type: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Role',
		},
	],
	username: {
		type: String,
		required: false,
	},
	school_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		index: true,
	},
	branch_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Branch',
		default: null,
		required: [false, ' branch Id needed'],
	},
	primary_class: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: 'Class',
	},
	primary_section: {
		type: mongoose.Schema.Types.ObjectId,
		default: null,
		ref: 'Section',
	},
	secondary_class: {
		type: [
			{
				secondClasses: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Class',
				},
				section: [
					{
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Section',
					},
				],
			},
		],
		default: [],
	},
	authorized: {
		type: Boolean,
		required: false,
		default: false,
	},
	pf_number: {
		type: String,
		required: false,
	},
	esi_number: {
		type: String,
		required: false,
	},
	subject: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Subject',
			default: null,
		},
	],
	designation: {
		type: String,
		required: false,
	},
	name: {
		type: String,
		required: false,
	},
	mobile: {
		type: Number,
		required: [true, 'Mobile number is required'],
	},
	age: {
		type: Number,
		required: false,
	},
	password: {
		type: String,
		required: [true, ' Password is required'],
		select: false,
	},
	city: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'City',
		default: null,
	},
	state: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'State',
		default: null,
	},
	country: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Country',
		default: null,
	},
	pincode: {
		type: Number,
		required: false,
	},
	pin: {
		type: Number,
		required: false,
	},
	gender: {
		type: String,
		required: false,
	},
	qualification: {
		type: String,
		required: false,
		enum: userGlobalData.userQualifications,
	},
	// TODO: make it date format
	dob: {
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
	aadhar_card: {
		type: Number,
		required: false,
	},
	blood_gr: {
		type: String,
		required: false,
	},
	religion: {
		type: String,
		required: false,
	},
	caste: {
		type: String,
		required: false,
	},
	mother_tounge: {
		type: String,
		required: false,
	},
	marital_status: {
		type: String,
		required: false,
		enum: [
			'Single',
			'Married',
			'Divorced',
			'Widowed',
			'Widower',
			'Widow',
			'',
			'Unmarried',
		],
	},
	experience: {
		type: String,
		required: false,
	},
	experience_list: {
		type: [
			{
				institution_name: {
					type: String,
					required: false,
				},
				served_as: {
					type: String,
					required: false,
				},
				joining_date: {
					type: Date,
					required: false,
				},
				reliving_date: {
					type: Date,
					required: false,
				},
				served_for: {
					type: Number,
					required: false,
				},
				experience_certificate: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
	level: {
		type: String,
		required: false,
	},
	leaderShip_Exp: {
		type: String,
		required: false,
	},
	cv: {
		type: String,
		required: false,
	},
	ten_details: {
		type: {
			school: {
				type: String,
				required: false,
			},
			Board: {
				type: String,
				required: false,
			},
			percentage: {
				type: Number,
				require: false,
			},
			year_of_passing: {
				type: Number,
				required: false,
			},
			Attach_doc: {
				type: String,
				required: false,
			},
		},
	},
	twelve_details: {
		type: {
			school: {
				type: String,
				required: false,
			},
			Board: {
				type: String,
				required: false,
			},
			percentage: {
				type: Number,
				require: false,
			},
			year_of_passing: {
				type: Number,
				required: false,
			},
			Attach_doc: {
				type: String,
				required: false,
			},
		},
	},
	graduation_details: {
		type: {
			school: {
				type: String,
				required: false,
			},
			Board: {
				type: String,
				required: false,
			},
			percentage: {
				type: Number,
				require: false,
			},
			year_of_passing: {
				type: Number,
				required: false,
			},
			Attach_doc: {
				type: String,
				required: false,
			},
		},
	},
	other_education: {
		type: {
			school: {
				type: String,
				required: false,
			},
			Board: {
				type: String,
				required: false,
			},
			percentage: {
				type: Number,
				require: false,
			},
			year_of_passing: {
				type: Number,
				required: false,
			},
			attach_doc: {
				type: String,
				required: false,
			},
		},
	},
	masters_details: {
		type: {
			school: {
				type: String,
				required: false,
			},
			Board: {
				type: String,
				required: false,
			},
			percentage: {
				type: Number,
				require: false,
			},
			year_of_passing: {
				type: Number,
				required: false,
			},
			Attach_doc: {
				type: String,
				required: false,
			},
		},
	},
	other_degrees: {
		type: Array,
		required: false,
	},
	certifications: {
		type: Array,
		required: false,
	},
	extra_achievement: {
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
	repository: [
		{
			id: String,
			repository_type: String,
		},
	],
	attendanceStats: {
		present: Number,
		absent: Number,
		late: Number,
		excused: Number,
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

userSchema.pre('save', async function (next) {
	if (this.isModified('password') && !(this.password === '000')) {
		this.password = await passwordUtil.getHash(this.password);
	}
	next();
});

userSchema.methods.comparePassword = function (password) {
	return bcrypt.compare(password, this.password);
};

userSchema.plugin(mongoose_delete, { overrideMethods: 'all' });
userSchema.plugin(mongoose_block);

const User = mongoose.model('User', userSchema);

module.exports = User;
