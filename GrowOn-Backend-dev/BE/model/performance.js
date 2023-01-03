const mongoose = require('mongoose');
const moment = require('moment');

const utcDate = moment.utc().toDate();

const performanceSchema = mongoose.Schema({
	id: mongoose.Schema.Types.ObjectId,
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'User',
	},
	student_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Student',
		required: true,
	},
	date: {
		type: Date,
		default: Date.now,
		required: false,
	},
	feed_type: {
		type: String,
		required: false,
	},
	feed: {
		type: String,
		required: false,
	},
	award_badge: {
		type: String,
		required: false,
	},
	award_badge_image: {
		type: String,
		required: false,
	},
	created_By: {
		type: Date,
		default: utcDate,
	},
	updated_By: {
		type: Date,
		default: Date.now,
	},
	repository: {
		class_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Class',
			default: null,
			required: false,
		},
		school_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			default: null,
			required: false,
		},
	},
});

const performance = mongoose.model('performance', performanceSchema);

module.exports = performance;
