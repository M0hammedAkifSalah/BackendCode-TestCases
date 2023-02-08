/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
import ErrorResponse from '../../utils/errorResponse';
import SuccessResponse from '../../utils/successResponse';
import APIFeatures from '../../utils/apiFeatures';
import MCQPaper from '../../model/questionPaper';
import {
	getAllPaper,
	create,
	getById,
	updateById,
	deleteById,
	assignToStudents,
	evaluate,
} from '../../controller/questionPaper';

jest.useFakeTimers();
jest.setTimeout(10000);

jest.mock('../../utils/APIFeatures', () =>
	jest.fn().mockImplementation(() => ({
		filter: () => mockGetAll(),
	}))
);
jest.mock('../../utils/errorResponse');
jest.mock('../../utils/successResponse');
jest.mock('../../model/questionPaper');

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

const requestMockCreate = () => ({
	body: {
		_id: '1234567890',
		title: 'title of paper',
		totalMarks: 4,
		questionCount: 2,
		questions: [
			{
				question: 'this is question 1',
				options: ['option1', 'option2', 'option3', 'option4'],
				answer: 2,
				marks: 2,
			},
			{
				question: 'this is question 2',
				options: ['option1', 'option2', 'option3', 'option4'],
				answer: 3,
				marks: 2,
			},
		],
	},
});
const responseMockCreate = () => ({
	title: 'title of paper',
	totalMarks: 10,
	questionCount: 2,
	questions: [
		{
			question: 'this is question 1',
			options: [
				{
					option: 'option1',
					marks: 5,
					isCorrect: true,
				},
				{
					option: 'option2',
					marks: 0,
					isCorrect: false,
				},
				{
					option: 'option3',
					marks: 0,
					isCorrect: false,
				},
				{
					option: 'option4',
					marks: 0,
					isCorrect: false,
				},
			],
		},
		{
			question: 'this is question 2',
			options: [
				{
					option: 'option1',
					marks: 5,
					isCorrect: true,
				},
				{
					option: 'option2',
					marks: 0,
					isCorrect: false,
				},
				{
					option: 'option3',
					marks: 0,
					isCorrect: false,
				},
				{
					option: 'option4',
					marks: 0,
					isCorrect: false,
				},
			],
		},
	],
	assignedBy: null,
	assignedTo: null,
});
const responseMockAssign = () => ({
	_id: '63b90ab6149c072240968f01',
	title: 'title of paper',
	totalMarks: 4,
	questionCount: 2,
	assignedBy: '63b90ab6149c072240968f01',
	questions: [
		{
			question: 'this is question 1',
			options: ['option1', 'option2', 'option3', 'option4'],
			answer: 2,
			marks: 2,
		},
		{
			question: 'this is question 2',
			options: ['option1', 'option2', 'option3', 'option4'],
			answer: 3,
			marks: 2,
		},
	],

	assignedTo: [
		{
			student: '63b90ab6149c072240968f02',
			class: '63b90ab6149c072240968f03',
			section: '63b90ab6149c072240968f04',
		},
		{
			student: '63b90ab6149c072240968f05',
			class: '63b90ab6149c072240968f06',
			section: '63b90ab6149c072240968f07',
		},
	],
});

describe('question paper controller methods', () => {
	describe('create controller method', () => {
		it('should return invalid input error', async () => {
			const req = (mockRequest().body = {
				body: {
					_id: '1234567890',
					title: 'title of paper',
					totalMarks: 4,
					questions: [
						{
							question: 'this is question 1',
							options: ['option1', 'option2', 'option3', 'option4'],
							answer: 2,
							marks: 2,
						},
						{
							question: 'this is question 2',
							options: ['option1', 'option2', 'option3', 'option4'],
							answer: 3,
							marks: 2,
						},
					],
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(422);
			expect(ErrorResponse).toHaveBeenCalledWith(
				'input validation failed',
				422
			);
		});
		it('should return record created message', async () => {
			jest
				.spyOn(MCQPaper, 'create')
				.mockResolvedValueOnce(responseMockCreate());
			const req = (mockRequest().body = requestMockCreate());
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(SuccessResponse).toHaveBeenCalledWith(
				responseMockCreate(),
				1,
				'Paper created successfully'
			);
		});
	});
	describe('getById controller ', () => {
		it('should return no mcqpaper found error', async () => {
			jest.spyOn(MCQPaper, 'findById').mockResolvedValueOnce(null);

			// Set up the request object and call the method being tested
			const req = (mockRequest().params = {
				params: {},
			});
			const res = mockResponse();
			await getById(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('No MCQPaper Found', 404);
		});

		it('should get a multiple choice paper by its ID and return it', async () => {
			// Set up the mock for the findById() method
			jest
				.spyOn(MCQPaper, 'findById')
				.mockResolvedValueOnce(responseMockCreate());

			// Set up the request object and call the method being tested
			const req = (mockRequest().params = {
				params: {
					id: '1234567890',
				},
			});
			const res = mockResponse();
			await getById(req, res, mockNext);
			// Assert that the findById() method was called with the correct ID
			expect(MCQPaper.findById).toHaveBeenCalledWith('1234567890');
			// Assert that the status() and json() methods were called correctly
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalled();
			expect(SuccessResponse).toHaveBeenCalledWith(
				responseMockCreate(),
				1,
				'Fetched SuccessFully'
			);
		});
	});
	describe('updateById controller ', () => {
		it('should return no mcqpaper found error', async () => {
			jest.spyOn(MCQPaper, 'findByIdAndUpdate').mockResolvedValueOnce(null);

			// Set up the request object and call the method being tested
			const req = (mockRequest().params = {
				params: {},
			});
			const res = mockResponse();
			await updateById(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('No MCQPaper Found', 404);
		});

		it('should update a multiple choice paper by its ID and return it', async () => {
			// Set up the mock for the findById() method
			jest
				.spyOn(MCQPaper, 'findByIdAndUpdate')
				.mockResolvedValueOnce(responseMockCreate());

			// Set up the request object and call the method being tested
			const req = (mockRequest().body = {
				params: {
					id: '1234567890',
				},
				body: {
					questionCount: 5,
				},
			});
			const res = mockResponse();
			await updateById(req, res, mockNext);
			// Assert that the findById() method was called with the correct ID
			expect(MCQPaper.findByIdAndUpdate).toHaveBeenCalledWith(
				'1234567890',
				{ questionCount: 5 },
				{
					new: true,
				}
			);
			// Assert that the status() and json() methods were called correctly
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalled();
			expect(SuccessResponse).toHaveBeenCalledWith(
				responseMockCreate(),
				1,
				'updated SuccessFully'
			);
		});
	});
	describe('deleteById controller ', () => {
		it('should return no mcqpaper found error', async () => {
			jest.spyOn(MCQPaper, 'findByIdAndDelete').mockResolvedValueOnce(null);

			// Set up the request object and call the method being tested
			const req = (mockRequest().params = {
				params: {},
			});
			const res = mockResponse();
			await deleteById(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('No MCQPaper Found', 404);
		});
		it('should update a multiple choice paper by its ID and return it', async () => {
			jest
				.spyOn(MCQPaper, 'findByIdAndDelete')
				.mockResolvedValueOnce(responseMockCreate());

			const req = (mockRequest().params = {
				params: {
					id: '1234567890',
				},
			});
			const res = mockResponse();
			await deleteById(req, res, mockNext);
			// Assert that the findById() method was called with the correct ID
			expect(MCQPaper.findByIdAndDelete).toHaveBeenCalledWith('1234567890');
			// Assert that the status() and json() methods were called correctly
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalled();
			expect(SuccessResponse).toHaveBeenCalledWith(
				null,
				0,
				'Deleted SuccessFully'
			);
		});
	});
	describe('assign the mcq paper controller', () => {
		it('should return invalid question paper id error', async () => {
			jest.spyOn(MCQPaper, 'findById').mockResolvedValueOnce(null);
			const req = (mockRequest().body = {
				params: {
					id: '63b90ab6149c072240968f01',
				},
				body: {
					teacherId: '63b90ab6149c072240968f01',
					studentList: [
						{
							student: '63b90ab6149c072240968f02',
							class: '63b90ab6149c072240968f03',
							section: '63b90ab6149c072240968f04',
						},
						{
							student: '63b90ab6149c072240968f05',
							class: '63b90ab6149c072240968f06',
							section: '63b90ab6149c072240968f07',
						},
					],
				},
			});
			const res = mockResponse();
			await assignToStudents(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(422);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('No MCQ Paper Found', 422);
		});
		it('should return studentList empty error', async () => {
			const req = (mockRequest().body = {
				params: {
					id: '63b90ab6149c072240968f01',
				},
				body: {
					studentList: [],
				},
			});
			const res = mockResponse();
			await assignToStudents(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(422);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'The studentList should not be empty',
				422
			);
		});
		it('should assign the mcq Paper to students', async () => {
			jest.spyOn(MCQPaper, 'findById').mockResolvedValueOnce({
				_id: '63b90ab6149c072240968f01',
				title: 'title of paper',
				totalMarks: 4,
				questionCount: 2,
				questions: [
					{
						question: 'this is question 1',
						options: ['option1', 'option2', 'option3', 'option4'],
						answer: 2,
						marks: 2,
					},
					{
						question: 'this is question 2',
						options: ['option1', 'option2', 'option3', 'option4'],
						answer: 3,
						marks: 2,
					},
				],
			});
			jest
				.spyOn(MCQPaper, 'updateOne')
				.mockResolvedValueOnce(responseMockAssign());
			const req = (mockRequest().body = {
				params: {
					id: '63b90ab6149c072240968f01',
				},
				body: {
					teacherId: '63b90ab6149c072240968f01',
					studentList: [
						{
							student: '63b90ab6149c072240968f02',
							class: '63b90ab6149c072240968f03',
							section: '63b90ab6149c072240968f04',
						},
						{
							student: '63b90ab6149c072240968f05',
							class: '63b90ab6149c072240968f06',
							section: '63b90ab6149c072240968f07',
						},
					],
				},
			});
			const res = mockResponse();
			await assignToStudents(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalled();
			expect(SuccessResponse).toHaveBeenLastCalledWith(
				responseMockAssign(),
				1,
				'Assigned successfully'
			);
		});
	});
	describe('evaluate the submitted answers controller', () => {
		it('should return an error if studentId or assessmentId is not provided', async () => {
			const req = (mockRequest().body = {
				body: {
					assessmentId: 'abc',
					answerList: [],
				},
			});
			const res = mockResponse();
			await evaluate(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(422);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'studentId and assessmentId are required',
				422
			);
		});

		it('should return an error if answerList is empty', async () => {
			const req = (mockRequest().body = {
				body: {
					studentId: '123',
					assessmentId: 'abc',
					answerList: [],
				},
			});
			const res = mockResponse();
			await evaluate(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(422);
			expect(mockNext).toHaveBeenCalled();
			expect(res.json).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'answerList cannot be empty',
				422
			);
		});

		it('should update the marksObtained for the student if a match is found', async () => {
			const req = (mockRequest().body = {
				body: {
					studentId: '123',
					assessmentId: 'abc',
					answerList: [2],
				},
			});
			const res = mockResponse();
			jest.spyOn(MCQPaper, 'findById').mockResolvedValueOnce({
				questions: [
					{
						student: '123',
						answer: 2,
						marks: 5,
					},
				],
			});
			jest.spyOn(MCQPaper, 'updateOne').mockResolvedValue({ nModified: 1 });
			await evaluate(req, res, mockNext);
			expect(MCQPaper.findById).toHaveBeenCalledWith('abc');
			expect(MCQPaper.updateOne).toHaveBeenCalledWith(
				{
					_id: 'abc',
					'questions.student': '123',
				},
				{
					$set: {
						'questions.$.marksObtained': 5,
					},
				}
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalled();
			expect(SuccessResponse).toHaveBeenCalledWith(
				{ nModified: 1 },
				1,
				'Updated SuccessFully'
			);
		});
	});
});
