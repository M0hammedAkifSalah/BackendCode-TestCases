const moment = require('moment');

const UserModel = require('../model/user');
const StudentModel = require('../model/student');
const CoinModel = require('../model/coin');

module.exports = (coinCount, userId, userType) =>
	new Promise((resolve, reject) => {
		(async () => {
			try {
				const week = moment().week();
				const year = moment().year();
				const dayOfWeek = moment().day() + 1;

				let foundCoinLog = await CoinModel.findOne({
					userId,
					userType,
					week,
					year,
				});

				if (!foundCoinLog) {
					foundCoinLog = await CoinModel.create({
						userId,
						userType,
						week,
						year,
						weekDays: [],
					});
				}

				const weekDayIdx = foundCoinLog.weekDays.findIndex(
					({ day }) => day == dayOfWeek
				);

				if (weekDayIdx < 0) {
					foundCoinLog.weekDays.push({ day: dayOfWeek, coins: coinCount });
				} else {
					foundCoinLog.weekDays[weekDayIdx].coins += coinCount;
				}

				await foundCoinLog.save();

				switch (userType) {
					case 'TEACHER':
						await UserModel.updateOne(
							{ _id: userId },
							{ $inc: { 'rewards.coins': coinCount } }
						);
						break;
					case 'STUDENT':
						await StudentModel.updateOne(
							{ _id: userId },
							{ $inc: { 'rewards.coins': coinCount } }
						);
						break;
					default:
						break;
				}

				resolve('ok');
			} catch (err) {
				reject(err);
			}
		})();
	});
