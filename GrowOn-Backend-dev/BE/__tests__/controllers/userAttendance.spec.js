/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
import {
	getAll,
	create,
	getAllAttendance,
	updateAllAttendance,
	verifyLocation,
	getById,
	updateById,
	deleteById,
	userMonthlyReport,
} from '../../controller/userAttendance';
import ErrorResponse from '../../utils/errorResponse';
import SuccessResponse from '../../utils/successResponse';
import APIFeatures from '../../utils/apiFeatures';
import SchoolModel from '../../model/school';
import UserAttendance from '../../model/userAttendance';
import UserModel from '../../model/user';
import userAttendanceReport from '../../model/userAttendanceReport';

jest.useFakeTimers();

jest.setTimeout(10000);

const mockGetAll = () => [
	{
		_id: '63a0288ce0a6e15e07b96a17',
		date: '12-21-2022',
		schoolId: '6233335feec609c379b97b7c',
		teacherId: '62333c7a333f39c372823239',
		isApproved: true,
		lastWeek: [
			'NOT_MARKED',
			'NOT_MARKED',
			'NOT_MARKED',
			'NOT_MARKED',
			'NOT_MARKED',
			'NOT_MARKED',
			'PRESENT',
		],
		status: 'PRESENT',
	},
];
jest.mock('../../utils/APIFeatures', () =>
	jest.fn().mockImplementation(() => ({
		filter: () => mockGetAll(),
	}))
);
jest.mock('../../utils/errorResponse');
jest.mock('../../utils/successResponse');
jest.mock('../../model/user');
jest.mock('../../model/userAttendanceReport');

beforeEach(() => {
	jest.clearAllMocks();
});

const mockRequest = () => ({
	body: {},
	Headers: {},
	params: {},
	query: {},
});
const mockResponse = () => ({
	status: jest.fn().mockReturnThis(),
	json: jest.fn().mockReturnThis(),
});
const mockNext = jest.fn();

describe('UserAttendance Controller', () => {
	describe('GetAll controller method', () => {
		it('should return a list of users', async () => {
			const req = {
				query: {
					limit: 10,
					page: 1,
				},
			};
			const res = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn(),
			};

			const spy = jest.spyOn(APIFeatures.prototype, 'constructor');

			await getAll(req, res, mockNext);
			expect(spy).toHaveBeenCalledWith(UserAttendance.find(), req.query);
		});
	});
	describe('create controller method', () => {
		it('should field validation error', async () => {
			const req = (mockRequest().body = {
				body: {
					teacherId: '63a0288ce0a6e15e07b96a17',
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'schoolId and teacherId are required',
				422
			);
		});
		it('should return error if no login time', async () => {
			jest.spyOn(SchoolModel, 'findOne').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce(() => ({
					loginTime: null,
				})),
			}));
			const req = (mockRequest().body = {
				body: {
					teacherId: '63a0288ce0a6e15e07b96a17',
					schoolId: '63a0288ce0a6e15e07b96a17',
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'School must have loginTime',
				204
			);
		});
		it('should return create a new attendance', async () => {
			jest.spyOn(SchoolModel, 'findOne').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce({ loginTime: 1671788918728 }),
			}));
			jest.spyOn(UserAttendance.prototype, 'save').mockResolvedValueOnce(true);
			const req = (mockRequest().body = {
				body: {
					teacherId: '63a0288ce0a6e15e07b96a17',
					schoolId: '63a0288ce0a6e15e07b96a17',
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalled();
		});
	});
	describe('getAllAttendance controller method', () => {
		it('should return error if fields are missing', async () => {
			const req = (mockRequest().query = {
				query: {
					schoolId: '63a586651040d215342bcafc',
				},
			});
			const res = mockResponse();
			await getAllAttendance(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'schoolId and date are required',
				422
			);
		});
		it('should return error if no users exists', async () => {
			jest.spyOn(UserAttendance, 'find').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce(() => ({})),
			}));
			jest.spyOn(UserModel, 'find').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce(() => ({
					data: '',
					length: 0,
				})),
			}));
			const req = (mockRequest().query = {
				query: {
					schoolId: '63a586651040d215342bcafc',
					date: '12/21/2022',
				},
			});
			const res = mockResponse();
			await getAllAttendance(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('No users found', 204);
			expect(UserModel.find).toHaveBeenCalledWith(
				{ school_id: '63a586651040d215342bcafc' },
				{ _id: 1, attendanceStats: 1, name: 1, profile_image: 1 }
			);
		});
		it('should return users', async () => {
			jest
				.spyOn(UserAttendance, 'find')
				.mockImplementationOnce(() => ({
					lean: jest.fn().mockResolvedValueOnce(() => ({})),
				}))
				.mockImplementationOnce(() => ({
					sort: jest.fn().mockImplementationOnce(() => ({
						lean: jest.fn().mockResolvedValueOnce(() => ({
							data: '',
						})),
					})),
				}));
			jest.spyOn(UserModel, 'find').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce([
					{
						_id: '62333c7a333f39c372823239',
					},
				]),
			}));
			const req = (mockRequest().query = {
				query: {
					schoolId: '63a586651040d215342bcafc',
					date: '12/21/2022',
				},
			});
			const res = mockResponse();
			await getAllAttendance(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(UserModel.find).toHaveBeenCalledWith(
				{ school_id: '63a586651040d215342bcafc' },
				{ _id: 1, attendanceStats: 1, name: 1, profile_image: 1 }
			);
			expect(SuccessResponse).toHaveBeenCalledWith(
				[
					{
						_id: '62333c7a333f39c372823239',
						lastWeek: [
							'NOT_MARKED',
							'NOT_MARKED',
							'NOT_MARKED',
							'NOT_MARKED',
							'NOT_MARKED',
							'NOT_MARKED',
							'NOT_MARKED',
						],
						status: 'NOT_MARKED',
					},
				],
				1,
				'Fetched User'
			);
		});
	});
	describe('updateAllAttendance controller method', () => {
		it('should return 422 error', async () => {
			const req = (mockRequest().body = {
				body: {
					schoolId: '62333c7a333f39c372823239',
					// date: '12/16/2022',
					userList: [],
				},
			});
			const res = mockResponse();
			await updateAllAttendance(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(422);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'schoolId, userList, and date is required',
				422
			);
		});
		it('should throw invalid date error', async () => {
			const req = (mockRequest().body = {
				body: {
					schoolId: '62333c7a333f39c372823239',
					date: '16/16/2022',
					userList: [],
				},
			});
			const res = mockResponse();
			await updateAllAttendance(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('Invalid date format', 400);
		});
		it('should throw success response', async () => {
			const req = (mockRequest().body = {
				body: {
					schoolId: '62333c7a333f39c372823239',
					date: '12/16/2022',
					userList: [
						{
							teacherId: '62333c7a333f39c372823239',
							status: 'ABSENT',
						},
					],
				},
			});
			const res = mockResponse();
			jest.spyOn(UserAttendance, 'aggregate').mockResolvedValueOnce([]);
			jest.spyOn(UserAttendance, 'updateOne').mockResolvedValueOnce(true);
			jest.spyOn(userAttendanceReport, 'findOne').mockResolvedValueOnce(null);
			jest.spyOn(userAttendanceReport, 'create').mockResolvedValueOnce({
				teacherId: '62333c7a333f39c372823239',
				schoolId: '62333c7a333f39c372823239',
				month: 12,
				year: 2022,
				days: [],
			});
			jest
				.spyOn(userAttendanceReport.prototype, 'save')
				.mockImplementationOnce();

			// jest.spyOn(userAttendanceReport, 'updateOne').mockResolvedValueOnce(true);
			await updateAllAttendance(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalledWith(
				null,
				1,
				'Marked Attendance'
			);
		});
	});
	describe('getById controller method', () => {
		it('should return no attendance found error', async () => {
			jest.spyOn(UserAttendance, 'findById').mockResolvedValueOnce(null);
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
			});
			const res = mockResponse();
			await getById(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('No Attendance Found', 404);
		});
		it('should return attendance found record', async () => {
			jest.spyOn(UserAttendance, 'findById').mockResolvedValueOnce({
				_id: '62333c7a333f39c372823239',
				teacherId: '62333c7a333f39c372823239',
				status: 'PRESENT',
			});
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
			});
			const res = mockResponse();
			await getById(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalledWith(
				{
					_id: '62333c7a333f39c372823239',
					teacherId: '62333c7a333f39c372823239',
					status: 'PRESENT',
				},
				1,
				'Fetched SuccessFully'
			);
		});
	});
	describe('updateById controller method', () => {
		it('should return no attendance found error', async () => {
			jest
				.spyOn(UserAttendance, 'findByIdAndUpdate')
				.mockResolvedValueOnce(null);
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
			});
			const res = mockResponse();
			await updateById(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('No Attendance Found', 404);
		});
		it('should return updated attendance record', async () => {
			jest.spyOn(UserAttendance, 'findByIdAndUpdate').mockResolvedValueOnce({
				_id: '62333c7a333f39c372823239',
				teacherId: '62333c7a333f39c372823239',
				status: 'PRESENT',
			});
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
				body: {
					status: 'PRESENT',
				},
			});
			const res = mockResponse();
			await updateById(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalledWith(
				{
					_id: '62333c7a333f39c372823239',
					teacherId: '62333c7a333f39c372823239',
					status: 'PRESENT',
				},
				1,
				'updated SuccessFully'
			);
		});
	});
	describe('deleteById controller method', () => {
		it('should return no attendance found error', async () => {
			jest
				.spyOn(UserAttendance, 'findByIdAndDelete')
				.mockResolvedValueOnce(null);
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
			});
			const res = mockResponse();
			await deleteById(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('No Attendance Found', 404);
		});
		it('should return updated attendance record', async () => {
			jest.spyOn(UserAttendance, 'findByIdAndDelete').mockResolvedValueOnce({
				_id: '62333c7a333f39c372823239',
				teacherId: '62333c7a333f39c372823239',
				status: 'PRESENT',
			});
			const req = (mockRequest().params = {
				params: {
					id: '62333c7a333f39c372823239',
				},
			});
			const res = mockResponse();
			await deleteById(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalledWith(
				null,
				0,
				'Deleted SuccessFully'
			);
		});
	});
	describe('userMonthlyReport controller method', () => {
		it('should return attendance report not found error', async () => {
			jest
				.spyOn(userAttendanceReport, 'findOne')
				.mockImplementationOnce(() => ({
					lean: jest.fn().mockResolvedValueOnce(null),
				}));
			const req = (mockRequest().query = {
				query: {
					teacherId: '62333c7a333f39c372823239',
					date: '12/16/2022',
				},
			});
			const res = mockResponse();
			await userMonthlyReport(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toBeCalledTimes(1);
			expect(SuccessResponse).toHaveBeenCalledWith(
				null,
				0,
				'No Attendance Found'
			);
		});
		it('should return monthly array report', async () => {
			jest
				.spyOn(userAttendanceReport, 'findOne')
				.mockImplementationOnce(() => ({
					lean: jest.fn().mockResolvedValueOnce({}),
				}));
			jest.spyOn(UserAttendance, 'findOne').mockResolvedValueOnce({});
			const req = (mockRequest().query = {
				query: {
					teacherId: '62333c7a333f39c372823239',
					date: '12/16/2022',
				},
			});
			const res = mockResponse();
			await userMonthlyReport(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toBeCalledTimes(1);
			expect(SuccessResponse).toBeCalledTimes(1);
		});
	});
	describe('verify location controller method', () => {
		it('should return user must logged in error', async () => {
			const req = (mockRequest().body = {
				user: {},
				body: {
					longitude: 0.11,
					latitute: 0.11,
				},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('User must logged in', 401);
		});
		it('should return log and lat missing error', async () => {
			const req = (mockRequest().body = {
				user: { _id: '62333c7a333f39c372823239' },
				body: {},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Longitude & Latitude is required',
				400
			);
		});
		it('should return school not registered error', async () => {
			jest.spyOn(SchoolModel, 'findOne').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce(null),
			}));
			const req = (mockRequest().body = {
				user: { _id: '62333c7a333f39c372823239' },
				body: {
					longitude: 0.12,
					latitude: 0.23,
				},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'No school registed for this user',
				404
			);
		});
		it('should return no location pinned error', async () => {
			jest.spyOn(SchoolModel, 'findOne').mockImplementationOnce(() => ({
				lean: jest.fn().mockResolvedValueOnce({
					location: {
						radius: null,
					},
				}),
			}));
			const req = (mockRequest().body = {
				user: { _id: '62333c7a333f39c372823239' },
				body: {
					longitude: 0.12,
					latitude: 0.23,
				},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Radius is not specified',
				400
			);
		});
		it('should return not in location error', async () => {
			jest
				.spyOn(SchoolModel, 'findOne')
				.mockImplementationOnce(() => ({
					lean: jest.fn().mockResolvedValueOnce({
						location: {
							radius: 1,
						},
					}),
				}))
				.mockResolvedValueOnce(null);
			const req = (mockRequest().body = {
				user: { _id: '62333c7a333f39c372823239' },
				body: {
					longitude: 0.12,
					latitude: 0.23,
				},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(mockNext).toBeCalledTimes(1);
			expect(ErrorResponse).toHaveBeenCalledWith('Not in location', 403);
		});
		it('should return in location response', async () => {
			jest
				.spyOn(SchoolModel, 'findOne')
				.mockImplementationOnce(() => ({
					lean: jest.fn().mockResolvedValueOnce({
						location: {
							radius: 1,
						},
					}),
				}))
				.mockResolvedValueOnce({});
			const req = (mockRequest().body = {
				user: { _id: '62333c7a333f39c372823239' },
				body: {
					longitude: 0.12,
					latitude: 0.23,
				},
			});
			const res = mockResponse();
			await verifyLocation(req, res, mockNext);
			expect(res.json).toBeCalledTimes(1);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith('success', 1, 'In location');
		});
	});
});
