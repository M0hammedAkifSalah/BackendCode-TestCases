const mongoose = require('mongoose');

const rewardSchema = mongoose.Schema({
	id: mongoose.Schema.Types.ObjectId,
	activity_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Activity',
		required: true,
	},
	innovations_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Innovation',
	},
	test_details: {
		test_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'actualQuestion',
		},
		answer: {
			type: [
				{
					qestion_no: {
						type: Number,
					},
					correctOrNot: {
						type: String,
					},
				},
			],
			default: [],
		},
	},
	student_details: {
		type: [
			{
				student_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Student',
				},
				coin: {
					type: Number,
					required: true,
				},
				extra_coin: {
					type: Number,
					required: true,
				},
				reason: {
					type: String,
					required: false,
				},
				reward_given: {
					type: String,
					required: false,
				},
				status: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
	teacher_details: {
		type: [
			{
				teacher_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				coin: {
					type: Number,
					required: true,
				},
				extra_coin: {
					type: Number,
					required: true,
				},
				reason: {
					type: String,
					required: false,
				},
				reward_given: {
					type: String,
					required: false,
				},
			},
		],
		default: [],
	},
});

const reward = mongoose.model('reward', rewardSchema);

module.exports = reward;
