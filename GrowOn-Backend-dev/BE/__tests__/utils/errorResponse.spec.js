/* eslint-disable no-undef */
import ErrorResponse from '../../utils/errorResponse';

describe('ErrorResponse', () => {
	it('should create an error with a message and a status code', () => {
		const error = new ErrorResponse('Invalid email', 400);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('Invalid email');
		expect(error.statusCode).toBe(400);
		expect(error.status).toBe('fail');
		expect(error.isOperational).toBe(true);
	});

	it('should create an error with a message and a non-4xx status code', () => {
		const error = new ErrorResponse('Server error', 500);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('Server error');
		expect(error.statusCode).toBe(500);
		expect(error.status).toBe('error');
		expect(error.isOperational).toBe(true);
	});
});
