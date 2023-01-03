/* eslint-disable no-undef */
import UserAttendance from '../../model/userAttendance';

describe('userAttendance Model Validation test', () => {
	test('teacherId field is required and of type ObjectId', () => {
		const userAttendance = new UserAttendance({});
		const error = userAttendance.validateSync();
		expect(error.errors.teacherId.message).toEqual('teacher id is required');

		userAttendance.teacherId = 'invalid';
		const error2 = userAttendance.validateSync();
		expect(error2.errors.teacherId.message).toEqual(
			'Cast to ObjectId failed for value "invalid" (type string) at path "teacherId"'
		);
	});
	test('schoolId field is required and of type ObjectId', () => {
		const userAttendance = new UserAttendance({});
		const error = userAttendance.validateSync();
		expect(error.errors.schoolId.message).toEqual('School id is required');

		userAttendance.schoolId = 'invalid';
		const error2 = userAttendance.validateSync();
		expect(error2.errors.schoolId.message).toEqual(
			'Cast to ObjectId failed for value "invalid" (type string) at path "schoolId"'
		);
	});
	test('status field is required and is a valid value in the statusesEnum array', () => {
		const userAttendance = new UserAttendance({});
		const error = userAttendance.validateSync();
		expect(error.errors.status.message).toEqual('Path `status` is required.');

		userAttendance.status = 'INVALID';
		const error2 = userAttendance.validateSync();
		expect(error2.errors.status.message).toEqual(
			'`INVALID` is not a valid enum value for path `status`.'
		);
	});

	test('it should check if the date object', () => {
		const userAttendance = new UserAttendance({});
		expect(userAttendance.date).toBeInstanceOf(Date);
		expect(userAttendance.date).toEqual(new Date());
	});

	test('workingHours field is of type Number and has a default value of 0', () => {
		const userAttendance = new UserAttendance({});
		expect(userAttendance.workingHours).toEqual(expect.any(Number));
		expect(userAttendance.workingHours).toEqual(0);
	});
});
