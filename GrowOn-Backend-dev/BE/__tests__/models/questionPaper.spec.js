/* eslint-disable no-undef */
import QuestionPaper from '../../model/questionPaper';

describe('questionPaper Model Validation test', () => {
	test('title field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.title.message).toEqual('title is required');
	});
	test('questionCount field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.questionCount.message).toEqual(
			'questionCount is required'
		);
	});
	test('totalMarks field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.totalMarks.message).toEqual('totalMarks is required');
	});
	test('question field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.question.message).toEqual('question is required');
	});
	test('options field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.options.message).toEqual('options is required');
	});
	test('answer field is required', () => {
		const questionPaper = new QuestionPaper({});
		const error = questionPaper.validateSync();
		expect(error.errors.answer.message).toEqual('answer is required');
	});
});
