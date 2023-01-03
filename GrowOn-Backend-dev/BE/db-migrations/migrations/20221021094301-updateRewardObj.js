/* eslint-disable no-dupe-keys */
// const { parseTwoDigitYear } = require('moment');
// const mongoose = require('mongoose');

module.exports = {
	async up(db) {
		const Users = await db.collection('users').find({}).toArray();
		let count = 0;
		let isClaimed = true;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const operations = Users.map(e => {
			let { coins, dailyCoins, date } = e.rewards;
			const { _id } = e;
			if (date < today) {
				isClaimed = false;
			}
			coins = coins || 0;
			dailyCoins = 5;
			count += 1;
			const rewards = {
				coins,
				dailyCoins,
				isClaimed,
				date,
			};
			return db.collection('users').updateOne(
				{ _id },
				{
					$set: {
						rewards,
					},
				}
			);
		});
		return Promise.all(operations);
	},

	async down(db) {
		return Promise.all('ok');
	},
};
