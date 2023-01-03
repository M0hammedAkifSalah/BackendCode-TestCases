const {
	Schema,
	Schema: {
		Types: { ObjectId },
	},
	model,
} = require('mongoose');

const CoinSchema = new Schema(
	{
		userId: { type: ObjectId, required: true },
		userType: {
			type: String,
			enum: ['STUDENT', 'TEACHER'],
			required: true,
		},
		week: { type: Number, required: true },
		year: { type: Number, required: true },
		weeklyCoins: { type: Number, default: 0 },
		dailyCoins: { type: Number, default: 0 },
		weekDays: {
			type: [
				{
					day: { type: Number, required: true },
					coins: { type: Number, required: true },
				},
			],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

const CoinModel = model('Coin', CoinSchema);

module.exports = CoinModel;
