// not in use
const mongoose = require('mongoose');

const SkillSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
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
	skill: {
		type: Array,
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

const Skill = mongoose.model('Skill', SkillSchema);

module.exports = Skill;
