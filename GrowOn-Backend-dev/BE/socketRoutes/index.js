const UserModel = require('../model/user');
const StudentModel = require('../model/student');

const assignmentDoubt = require('./assignmentdoubt');

const onConnection = async (io, socket) => {
	const { assignment_id, student_id, teacher_id } = socket.handshake.query;

	socket.join(assignment_id);
	let currentUser = null;
	let currentUserType = null;

	if (student_id) {
		currentUser = await StudentModel.findOne(
			{ _id: student_id },
			{ _id: 1, name: 1, profile_image: 1, gender: 1 }
		).lean();
		currentUserType = 'STUDENT';
	} else {
		currentUser = await UserModel.findOne(
			{ _id: teacher_id },
			{ _id: 1, name: 1, profile_image: 1, gender: 1 }
		).lean();
		currentUserType = 'TEACHER';
	}

	socket.currentUser = currentUser;
	socket.currentUserType = currentUserType;

	assignmentDoubt(io, socket);

	socket.on('disconnect', async () => {});
};

module.exports = onConnection;
