/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
import jwt from 'jsonwebtoken';
import protect from '../../middleware/protect';
import ErrorResponse from '../../utils/errorResponse';
import redisClient from '../../config/redisClient';
import User from '../../model/user';

jest.setTimeout(10000);

const mockRequest = () => ({
	path: '',
	Headers: {},
});
const mockResponse = () => ({
	status: jest.fn().mockReturnThis(),
	json: jest.fn().mockReturnThis(),
});
const mockNext = jest.fn();
jest.mock('../../model/user');
jest.mock('../../utils/errorResponse');
jest.mock('../../config/redisClient', () => ({
	get: jest.fn(),
}));

describe('Protect MiddleWare', () => {
	it('should return next for allowed path', async () => {
		const req = (mockRequest().path = { path: '/api/v1/city' });
		const res = mockResponse();
		await protect(req, res, mockNext);
		expect(mockNext).toBeCalledTimes(1);
	});
	it('should return not authorized when no authorization header is passed', async () => {
		const req = (mockRequest().body = {
			path: '/api/v1/city/get',
			headers: {},
		});
		const message = 'Not authorized';
		const code = 401;
		const res = mockResponse();
		await protect(req, res, mockNext);
		expect.assertions(3);
		expect(mockNext).toBeCalledTimes(1);
		expect(ErrorResponse).toBeCalledTimes(1);
		expect(ErrorResponse).toHaveBeenCalledWith(message, code);
	});
	it('should return not authorized when no token is passed', async () => {
		const req = (mockRequest().body = {
			path: '/api/v1/city/get',
			headers: {
				authorization: 'bearer',
			},
		});
		const message = 'Not authorized';
		const code = 401;
		const res = mockResponse();
		await protect(req, res, mockNext);
		expect.assertions(3);
		expect(mockNext).toBeCalledTimes(1);
		expect(ErrorResponse).toBeCalledTimes(1);
		expect(ErrorResponse).toHaveBeenCalledWith(message, code);
	});
	it('should return Invalid token when invalid token is passed', async () => {
		jest.spyOn(jwt, 'verify').mockImplementationOnce(false);
		const req = (mockRequest().body = {
			path: '/api/v1/city/get',
			headers: {
				authorization: 'bearer jwt_token',
			},
		});
		const message = 'Invalid token';
		const code = 401;
		const res = mockResponse();
		await protect(req, res, mockNext);
		expect.assertions(3);
		expect(mockNext).toBeCalledTimes(1);
		expect(ErrorResponse).toBeCalledTimes(1);
		expect(ErrorResponse).toHaveBeenCalledWith(message, code);
	});
	it('should return the user-info when the info is cached', async () => {
		jest.spyOn(jwt, 'verify').mockImplementationOnce(() => ({
			id: 'user_id',
		}));
		jest.spyOn(redisClient, 'get').mockImplementationOnce(true);
		const Rediskey = `auth:user:user_id`;
		const req = (mockRequest().body = {
			path: '/api/v1/city/get',
			headers: {
				authorization: 'bearer jwt_token',
			},
		});
		const res = mockResponse();
		await protect(req, res, mockNext);
		expect(mockNext).toBeCalledTimes(1);
		expect(redisClient.get).toHaveBeenCalledWith(Rediskey);
	});
	// it('should return invalid token if no user found', async () => {
	// 	jest.spyOn(jwt, 'verify').mockImplementationOnce(() => ({
	// 		id: 'user_id',
	// 	}));
	// 	jest.spyOn(redisClient, 'get').mockImplementationOnce(false);
	// 	jest.spyOn(User, 'findById').mockImplementationOnce(false);

	// 	const Rediskey = 'auth:user:user_id';
	// 	const req = (mockRequest().body = {
	// 		path: '/api/v1/city/get',
	// 		headers: {
	// 			authorization: 'bearer jwt_token',
	// 		},
	// 	});
	// 	const res = mockResponse();
	// 	await protect(req, res, mockNext);
	// 	expect(mockNext).toBeCalledTimes(1);
	// 	expect(redisClient.get).toHaveBeenCalledWith(Rediskey);
	// 	expect(ErrorResponse).toHaveBeenCalledWith('Invalid token', 401);
	// });
	// it('should return profile is blocked if user is blocked', async () => {
	// 	jest.spyOn(jwt, 'verify').mockImplementationOnce(() => ({
	// 		id: 'user_id',
	// 	}));
	// 	jest.spyOn(redisClient, 'get').mockImplementationOnce(false);
	// 	jest.spyOn(User, 'findById').mockImplementationOnce({
	// 		profileStatus: 'PENDING',
	// 	});

	// 	const Rediskey = 'auth:user:user_id';
	// 	const req = (mockRequest().body = {
	// 		path: '/api/v1/city/get',
	// 		headers: {
	// 			authorization: 'bearer jwt_token',
	// 		},
	// 	});
	// 	const res = mockResponse();
	// 	await protect(req, res, mockNext);
	// 	expect(mockNext).toBeCalledTimes(1);
	// 	expect(redisClient.get).toHaveBeenCalledWith(Rediskey);
	// 	expect(ErrorResponse).toHaveBeenCalledWith('Profile is blocked', 403);
	// });
});
