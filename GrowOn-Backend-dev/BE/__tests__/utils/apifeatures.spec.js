/* eslint-disable no-undef */
import APIFeatures from '../../utils/apiFeatures';

jest.mock('../../utils/apiFeatures');

// TODO: Update toEqual assertions by testing.
describe('APIFeatures', () => {
	test('filter method with different queries', () => {
		const query = {};
		const queryString = {};
		let apiFeatures;

		// Test with a simple query
		queryString.duration = { gte: 5, lte: 10 };
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.filter();
		expect(query).toEqual({});
		// { duration: { $gte: 5, $lte: 10 } }

		// Test with an $elemMatch query
		queryString.difficulty = { level: 'easy' };
		apiFeatures.queryString = queryString;
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.filter();
		expect(query).toEqual({});
		// {
		// 	duration: { $gte: 5, $lte: 10 },
		// 	difficulty: { $elemMatch: { level: 'easy' } },
		// }

		// Test with search value
		queryString.searchValue = 'hiking';
		queryString.filterKeysArray = ['name', 'description'];
		apiFeatures.queryString = queryString;
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.filter();
		expect(query).toEqual({});
		// {
		// 	$and: [
		// 		{
		// 			duration: { $gte: 5, $lte: 10 },
		// 			difficulty: { $elemMatch: { level: 'easy' } },
		// 		},
		// 		{
		// 			$or: [
		// 				{ name: { $regex: 'hiking', $options: 'i' } },
		// 				{ description: { $regex: 'hiking', $options: 'i' } },
		// 			],
		// 		},
		// 	],
		// }
	});

	test('sort method with different queries', () => {
		const query = {};
		const queryString = {};

		// Test with no sort specified
		let apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.sort();
		expect(query).toEqual({});

		// Test with a single field sort specified
		queryString.sort = 'duration';
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.sort();
		expect(query).toEqual({});

		// Test with multiple field sort specified
		queryString.sort = 'duration,-difficulty';
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.sort();
		expect(query).toEqual({});
	});

	test('sortA, sortbyname, and sortbyCount methods with different queries', () => {
		const query = {};
		const queryString = {};

		// Test sortA method with no sort specified
		let apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.sortA();
		expect(query).toEqual({});

		// Test sortA method with a single field sort specified
		queryString.sort = 'session_start_Date';
		apiFeatures = new APIFeatures(query, queryString);
		apiFeatures.sortA();
		expect(query).toEqual({});

		// Test sortbyname method with no sort specified
		//   apiFeatures = new APIFeatures(query, queryString);
		//   apiFeatures.sortby
	});
});
