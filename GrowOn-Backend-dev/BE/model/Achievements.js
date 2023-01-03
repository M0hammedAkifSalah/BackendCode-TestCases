const mongoose = require('mongoose');

const AchievementSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	title: {
		type: String,
		required: false,
	},
	teacher_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	class_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Class',
		required: false,
	},
	description: {
		type: String,
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

const Achievement = mongoose.model('Achievement', AchievementSchema);

module.exports = Achievement;
