/* eslint-disable no-undef */
import SuccessResponse from '../../utils/successResponse';

describe('successResponse unit tests', () => {
	test('SuccessResponse returns the expected output with no arguments', () => {
		const expectedResult = {
			isSuccess: true,
			data: null,
			records: 0,
			message: 'Completed',
		};
		expect(SuccessResponse()).toEqual(expectedResult);
	});
	test('SuccessResponse returns the expected output with data and records arguments', () => {
		const expectedResult = {
			isSuccess: true,
			data: [1, 2, 3],
			records: 3,
			message: 'Completed',
		};
		expect(SuccessResponse([1, 2, 3], 3)).toEqual(expectedResult);
	});

	test('SuccessResponse returns the expected output with data and message arguments', () => {
		const expectedResult = {
			isSuccess: true,
			data: { name: 'John' },
			records: 0,
			message: 'Success',
		};
		expect(SuccessResponse({ name: 'John' }, 0, 'Success')).toEqual(
			expectedResult
		);
	});

	test('SuccessResponse returns the expected output with all arguments', () => {
		const expectedResult = {
			isSuccess: true,
			data: 'Hello',
			records: 1,
			message: 'Hello message',
		};
		expect(SuccessResponse('Hello', 1, 'Hello message')).toEqual(
			expectedResult
		);
	});
});
