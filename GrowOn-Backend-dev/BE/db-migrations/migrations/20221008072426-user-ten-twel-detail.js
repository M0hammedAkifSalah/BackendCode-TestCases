/* eslint-disable no-param-reassign */
const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const users = await db.collection('users').find({}).toArray();

		const operations = users.map(usr => {
			const {
				ten_details: tenDetails = null,
				twelve_details: twelveDetails = null,
				graduation_details: graduationDetails = null,
				masters_details: mastersDetails = null,
				other_education: otherEducation = null,
			} = usr;

			function makeNumber(val = 0) {
				val = Number(val);
				return Number.isNaN(val) || val === 0 ? null : val;
			}

			function makeString(val = '') {
				const isNumber = !Number.isNaN(Number(val)) && Number(val) !== 0;

				if (isNumber) {
					return '';
				}

				if (typeof val === 'string') {
					return val;
				}

				return '';
			}

			function format(detailObj = null) {
				const defaultVal = {
					school: '',
					Board: '',
					percentage: null,
					year_of_passing: null,
				};

				if (
					!detailObj ||
					Array.isArray(detailObj) ||
					typeof detailObj === 'string' ||
					typeof detailObj !== 'object'
				) {
					return defaultVal;
				}

				const percentage = makeNumber(detailObj.percentage);
				const year_of_passing = makeNumber(detailObj.year_of_passing);
				const school = makeString(detailObj.school);
				const Board = makeString(detailObj.Board);

				return {
					percentage,
					year_of_passing,
					school,
					Board,
				};
			}

			return db.collection('users').updateOne(
				{
					_id: usr._id,
				},
				{
					$set: {
						ten_details: format(tenDetails),
						twelve_details: format(twelveDetails),
						graduation_details: format(graduationDetails),
						masters_details: format(mastersDetails),
						other_education: format(otherEducation),
					},
				}
			);
		});

		return Promise.allSettled(operations);
	},

	async down() {
		return Promise.all('ok');
	},
};
