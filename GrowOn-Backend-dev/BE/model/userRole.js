const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	profile_type: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role',
		default: null,
	},
	isSubmitForm: {
		type: Boolean,
		required: false,
	},
	isDeleteForm: {
		type: Boolean,
		required: false,
	},
	urlString: {
		type: String,
		default: 'mongodb+srv://admin:1234@cluster0.vnxyi.mongodb.net/',
	},
	sequenceNumber: {
		type: Number,
		required: [true, 'sequence number is required'],
	},
});

const UserRole = mongoose.model('UserRole', userSchema);
module.exports = UserRole;
