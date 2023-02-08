const mongoose = require('mongoose');
const { findById } = require('../model/questionPaper');
const MCQPaper = require('../model/questionPaper');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

/**
 * GetAll the MCQ paper records by querying
 * @param {object} req.query
 * @returns {array} features with all MCQ paper records.
 */
exports.getAllPaper = catchAsync(async (req, res, next) => {
	let features = new APIFeatures(MCQPaper.find(), req.query)
		.filter()
		.limitFields()
		.paginate();
	features = await features.query;
	if (features.length === 0) {
		return next(new ErrorResponse('No MCQPaper found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(features, features.length, 'Fetched Successfully'));
});

/**
 * Creates a new MCQ paper.
 *
 * @description This function creates a new MCQ paper based on the data provided in the request body.
 * If input validation fails, it throws an error response. If the paper is successfully created,
 * it returns the created paper along with a success message.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {function} next - The next middleware function in the request-response cycle.
 *
 * @throws {ErrorResponse} If input validation fails.
 *
 * @returns {Object} The created MCQ paper.
 * @returns {number} The status code.
 * @returns {string} The success message.
 */
exports.create = catchAsync(async (req, res, next) => {
	const { body } = req;
	const inputValidation =
		!body.title || !body.questionCount || !body.totalMarks || !body.questions;
	if (inputValidation) {
		return next(
			res.status(422).json(new ErrorResponse('input validation failed', 422))
		);
	}
	const Data = await MCQPaper.create({
		_id: mongoose.Types.ObjectId(),
		title: body.title,
		questionCount: body.questionCount,
		totalMarks: body.totalMarks,
		questions: body.questions,
	});
	return res
		.status(201)
		.json(SuccessResponse(Data, 1, 'Paper created successfully'));
});

/**
 * Fetches a Record for the given id.
 * @param {ObjectId} id
 *
 * @throws {ErrorResponse} If no document matches.
 *
 * @returns {object} foundPaper with found object.
 * @returns {number} The status code.
 * @returns {string} The success message.
 */
exports.getById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const foundPaper = await MCQPaper.findById(id);
	if (!foundPaper) {
		return next(new ErrorResponse('No MCQPaper Found', 404));
	}
	res.status(200).json(SuccessResponse(foundPaper, 1, 'Fetched SuccessFully'));
});

/**
 * Updates a Record for the given id.
 * @param {ObjectId} id
 * @param {object} req.body
 * @returns {object} foundPaper with updated object.
 */
exports.updateById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const foundPaper = await MCQPaper.findByIdAndUpdate(id, req.body, {
		new: true,
	});
	if (!foundPaper) {
		return next(new ErrorResponse('No MCQPaper Found', 404));
	}
	res.status(200).json(SuccessResponse(foundPaper, 1, 'updated SuccessFully'));
});

/**
 * Deletes a Record for the given id.
 * @param {ObjectId} id
 * @returns {null} foundPaper with found object.
 */
exports.deleteById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const foundPaper = await MCQPaper.findByIdAndDelete(id);
	if (!foundPaper) {
		return next(new ErrorResponse('No MCQPaper Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 0, 'Deleted SuccessFully'));
});

/**
 * Assigns the given MCQ paper to a list of students.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {function} next - The next middleware function in the request-response cycle.
 * @param {string} req.params.id - The id of the MCQ paper to be assigned.
 * @param {string[]} req.body.studentList - The list of student ids to which the MCQ paper is to be assigned.
 * @param {string} req.body.teacherId - The id of the teacher who is assigning the MCQ paper.
 *
 * @throws {ErrorResponse} If the studentList is empty.
 * @throws {ErrorResponse} If no MCQ paper is found with the given id.
 *
 * @returns {Object} The updated MCQ paper object and a success message.
 *
 * @todo Add firebase notification code for the assigned students.
 */

exports.assignToStudents = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { studentList, teacherId } = req.body;
	if (studentList.length === 0) {
		return next(
			res
				.status(422)
				.json(new ErrorResponse('The studentList should not be empty', 422))
		);
	}
	const foundPaper = await MCQPaper.findById(id);
	if (!foundPaper) {
		return next(
			res.status(422).json(new ErrorResponse('No MCQ Paper Found', 422))
		);
	}
	foundPaper.assignedTo = studentList;
	foundPaper.assignedBy = teacherId;
	await MCQPaper.updateOne({ _id: id }, foundPaper);
	// TODO: Need to Add firebase notification code for the assigned students.
	res.status(201).json(SuccessResponse(foundPaper, 1, 'Assigned successfully'));
});

/**
 * @function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function} next - Express next middleware function
 *
 * @route POST /api/v1/evaluate
 * @param {string} studentId - ID of student
 * @param {string} assessmentId - ID of assessment
 * @param {Array} answerList - List of answers submitted by student
 *
 * @returns {Object} - Returns the updated assessment object
 * @throws {ErrorResponse} - If studentId or assessmentId is not provided
 * @throws {ErrorResponse} - If answerList is empty
 * @throws {ErrorResponse} - If assessment is not updated
 */

exports.evaluate = catchAsync(async (req, res, next) => {
	const { studentId, assessmentId, answerList } = req.body;
	if (!studentId || !assessmentId) {
		return next(
			res
				.status(422)
				.json(new ErrorResponse('studentId and assessmentId are required', 422))
		);
	}
	if (answerList.length === 0) {
		return next(
			res.status(422).json(new ErrorResponse('answerList cannot be empty', 422))
		);
	}
	let foundAssessment = await MCQPaper.findById(assessmentId);
	const { questions } = foundAssessment;
	let marksObtained = 0;
	for (let i = 0; i < questions.length; i++) {
		if (answerList[i] === questions[i].answer) {
			marksObtained += questions[i].marks;
		}
	}
	foundAssessment = await MCQPaper.updateOne(
		{ _id: assessmentId, 'questions.student': studentId },
		{
			$set: {
				'questions.$.marksObtained': marksObtained,
			},
		}
	);
	if (foundAssessment.nModified === 0) {
		return next(res.status(400).json(new ErrorResponse('Not Updated', 400)));
	}
	res
		.status(200)
		.json(SuccessResponse(foundAssessment, 1, 'Updated SuccessFully'));
});
