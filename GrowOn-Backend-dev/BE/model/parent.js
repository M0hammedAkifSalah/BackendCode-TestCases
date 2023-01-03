const mongoose = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const bcrypt = require('bcrypt');
const mongoose_block = require('../middleware/skipBlockedUser');

const passwordUtil = require('../utils/password');

const parentSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	deleted: {
		type: Boolean,
		required: false,
		default: false,
	},
	DeviceToken: {
		type: String,
		required: false,
	},
	username: {
		type: String,
		required: [true, 'username is required'],
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
		default: 'parent',
	},
	profileStatus: {
		type: String,
		default: 'APPROVED',
		enum: ['APPROVED', 'PENDING', 'BLOCKED'],
		required: false,
	},
	name: {
		type: String,
		// TODO: make it require when model refactor
		required: [false, 'name is required'],
	},
	parentType: {
		type: String,
		enum: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'],
		// TODO: make it require when model refactor
		required: [false, 'parent type is required'],
	},
	profile_image: {
		type: String,
		required: false,
	},
	password: {
		type: String,
		required: false,
		select: false,
	},
	guardian: {
		type: String,
		required: false,
	},
	f_occupation: {
		type: String,
		required: false,
	},
	m_occupation: {
		type: String,
		required: false,
	},
	g_occupation: {
		type: String,
		required: false,
	},
	father_name: {
		type: String,
		required: false,
	},
	f_contact_number: {
		type: String,
		required: false,
	},
	activeStatus: {
		type: Boolean,
		required: false,
		default: true,
	},
	mobile_to_reg_student: {
		type: String,
		required: false,
	},
	f_email: {
		type: String,
		required: false,
	},
	f_qualification: {
		type: String,
		required: false,
	},
	f_aadhar_no: {
		type: String,
		required: false,
	},
	language_proficiency: {
		type: Array,
		required: false,
	},
	mother_name: {
		type: String,
		required: false,
	},
	m_contact_number: {
		type: String,
		required: false,
	},
	m_mobile_to_reg_student: {
		type: String,
		required: false,
	},
	m_email: {
		type: String,
		required: false,
	},
	m_qualification: {
		type: String,
		required: false,
	},
	m_aadhar_no: {
		type: String,
		required: false,
	},
	m_language_proficiency: {
		type: Array,
		required: false,
	},

	guardian_name: {
		type: String,
		required: false,
	},
	guardian_mobile: {
		type: String,
		required: false,
	},
	guardian_mobile_to_reg_student: {
		type: String,
		required: false,
	},
	g_email: {
		type: String,
		required: false,
	},
	g_qualification: {
		type: String,
		required: false,
	},
	g_aadhar: {
		type: String,
		required: false,
	},
	g_language_proficiency: {
		type: Array,
		required: false,
	},
	children: {
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Student',
			},
		],
		default: [],
	},
	repository: {
		type: Array,
		required: false,
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

parentSchema.pre('save', async function (next) {
	if (this.isModified('password') && this.password) {
		this.password = await passwordUtil.getHash(this.password);
	}

	next();
});

parentSchema.methods.comparePassword = function (password) {
	return bcrypt.compare(password, this.password);
};

parentSchema.plugin(mongoose_delete, { overrideMethods: 'all' });
parentSchema.plugin(mongoose_block);

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;
