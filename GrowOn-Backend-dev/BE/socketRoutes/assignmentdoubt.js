const mongoose = require('mongoose');

const AssignmentModel = require('../model/assignment');
const AssignmentDoubtModel = require('../model/assignmentDoubt');

const depositCoin = require('../helper/depositCoin');

// socket usage function
async function getUserSocket(io, currentUserType, user_id) {
	const connectedUsers = await io.fetchSockets();

	const socketIds = [];

	connectedUsers.forEach(usr => {
		if (
			currentUserType === 'TEACHER' &&
			usr.handshake.query.teacher_id == user_id
		) {
			socketIds.push(usr.id);
		}
		if (
			currentUserType === 'STUDENT' &&
			usr.handshake.query.student_id == user_id
		) {
			socketIds.push(usr.id);
		}
	});

	return socketIds;
}

module.exports = (io, socket) => {
	const { currentUserType, currentUser } = socket;
	const { assignment_id, student_id } = socket.handshake.query;

	// Get all assignment doubts
	socket.on('assignmentdoubt:get-all', async (_, callback) => {
		const foundAssignment = await AssignmentModel.findOne({
			_id: assignment_id,
		})
			.select('doubts_id teacher_id')
			.populate('teacher_id', 'name profile_image')
			.lean();

		if (!foundAssignment) {
			// throw new Error('Assignment not found');
			callback({ message: 'Assignment not found', data: null });
			return;
		}

		const foundDoubts = await AssignmentDoubtModel.findOne(
			{
				$or: [{ _id: foundAssignment.doubts_id }, { assignment_id }],
			},
			{
				_id: 1,
				commonDoubts: 1,
				doubts:
					currentUserType === 'STUDENT'
						? {
								$filter: {
									input: '$doubts',
									as: 'item',
									cond: {
										$eq: [
											'$$item.student_id',
											mongoose.Types.ObjectId(student_id),
										],
									},
								},
						  }
						: 1,
			}
		)
			.populate(
				'doubts.student_id doubts.messages.student_id doubts.messages.teacher_id',
				'_id name profile_image gender'
			)
			.populate(
				'commonDoubts.messages.student_id commonDoubts.messages.teacher_id',
				'_id name profile_image gender'
			)
			.lean();

		if (!foundDoubts) {
			callback({ message: 'Record not found', data: null });
			return;
		}

		foundDoubts.teacher_id = foundAssignment.teacher_id;

		callback({ message: 'Fetched Successfully', data: foundDoubts });
	});

	socket.on(
		'assignmentdoubt:add',
		// eslint-disable-next-line no-shadow
		async ({ student_id, type, text, image, audio, video, file, isCommon }) => {
			try {
				const foundAssignment = await AssignmentModel.findOne(
					{ _id: assignment_id },
					{ doubts_id: 1, teacher_id: 1 }
				);

				const messageObj = {
					_id: mongoose.Types.ObjectId(),
					type,
					text,
					image,
					audio,
					video,
					file,
					student_id: currentUserType === 'STUDENT' ? currentUser._id : null,
					teacher_id: currentUserType === 'TEACHER' ? currentUser._id : null,
				};

				let foundDoubts = await AssignmentDoubtModel.findOne(
					{
						$or: [{ _id: foundAssignment.doubts_id }, { assignment_id }],
					},
					{ _id: 1, doubts: 1, commonDoubts: 1 }
				);

				if (!foundDoubts) {
					foundDoubts = await AssignmentDoubtModel.create({
						assignment_id,
						doubts: [],
					});
				}
				let doubtObjIdx = -1;
				if (isCommon) {
					foundDoubts.commonDoubts.messages.push(messageObj);
				} else {
					doubtObjIdx = foundDoubts.doubts.findIndex(
						obj => obj.student_id == student_id
					);

					if (doubtObjIdx < 0) {
						foundDoubts.doubts.push({
							_id: mongoose.Types.ObjectId(),
							student_id,
							messages: [messageObj],
						});

						try {
							await depositCoin(1, foundAssignment.teacher_id, 'TEACHER');
							await depositCoin(1, student_id, 'STUDENT');
						} catch (error) {
							console.error(error);
						}

						doubtObjIdx = foundDoubts.doubts.length - 1;
					} else {
						foundDoubts.doubts[doubtObjIdx].messages.push(messageObj);
					}
				}

				await foundDoubts.save();

				await foundDoubts
					.populate('doubts.student_id', 'name profile_image')
					.execPopulate();
				foundDoubts = JSON.parse(JSON.stringify(foundDoubts));
				let recieverId = foundAssignment.teacher_id.toString();
				let receiverProfileType = 'TEACHER';
				if (currentUserType === 'TEACHER') {
					recieverId = student_id;
					receiverProfileType = 'STUDENT';
				}
				const foundDoubtObj = foundDoubts;
				let payload;
				if (isCommon) {
					payload = {
						isCommon: true,
						data: {
							messages: {
								...foundDoubtObj.commonDoubts.messages[
									foundDoubtObj.commonDoubts.messages.length - 1
								],
								student_id:
									currentUserType === 'STUDENT'
										? JSON.parse(JSON.stringify(currentUser))
										: null,
								teacher_id:
									currentUserType === 'TEACHER'
										? JSON.parse(JSON.stringify(currentUser))
										: null,
							},
						},
					};
					io.to(assignment_id).emit('assignmentdoubt:on-add', payload);
				} else {
					payload = {
						isCommon: false,
						data: {
							...foundDoubtObj.doubts[doubtObjIdx],
							messages: {
								...foundDoubtObj.doubts[doubtObjIdx].messages[
									foundDoubtObj.doubts[doubtObjIdx].messages.length - 1
								],
								student_id: currentUserType === 'STUDENT' ? currentUser : null,
								teacher_id: currentUserType === 'TEACHER' ? currentUser : null,
							},
						},
					};
					socket.emit('assignmentdoubt:on-add', payload);

					const usrSocketIds = await getUserSocket(
						io,
						receiverProfileType,
						recieverId
					);

					if (usrSocketIds && usrSocketIds.length) {
						io.to(usrSocketIds).emit('assignmentdoubt:on-add', payload);
					}
				}

				if (!foundAssignment.doubts_id) {
					foundAssignment.doubts_id = foundDoubts._id;
					await foundAssignment.save();
				}
			} catch (e) {
				if (e) {
					if (e.message) {
						socket.emit('error', e?.message);
					} else {
						socket.emit('error', e);
					}
				}
			}
		}
	);

	socket.on('assignmentdoubt:clear', async (_, callback) => {
		try {
			const foundAssignment = await AssignmentModel.findOne(
				{ _id: assignment_id },
				{ doubts_id: 1, teacher_id: 1 }
			);

			if (!foundAssignment) {
				throw Error('Assignment not Found');
			}

			const foundDoubts = await AssignmentDoubtModel.findOne(
				{
					$or: [{ _id: foundAssignment.doubts_id }, { assignment_id }],
				},
				{ _id: 1, doubts: 1 }
			);

			if (!foundDoubts) {
				throw Error('Doubts not Found');
			}

			if (currentUserType !== 'STUDENT') {
				throw Error('Not a Student');
			}

			const doubtObjIdx = foundDoubts.doubts.findIndex(
				obj => obj.student_id == student_id
			);

			if (doubtObjIdx < 0) {
				throw Error('Doubt not found');
			}

			foundDoubts.doubts[doubtObjIdx].isCleared = true;

			await foundDoubts.save();
			await foundDoubts
				.populate('doubts.student_id', 'name profile_image')
				.populate('doubts.messages.student_id', 'name profile_image')
				.populate('doubts.messages.teacher_id', 'name profile_image')
				.execPopulate();

			socket.emit('assignmentdoubt:on-add', {
				status: 'ok',
				message: 'Marked cleared',
				data: foundDoubts.doubts[doubtObjIdx],
			});
			const usrSocketIds = await getUserSocket(
				io,
				'TEACHER',
				foundAssignment.teacher_id
			);

			if (usrSocketIds && usrSocketIds.length) {
				io.to(usrSocketIds).emit('assignmentdoubt:on-add', {
					status: 'ok',
					message: 'Marked cleared',
					data: foundDoubts.doubts[doubtObjIdx],
				});
			}

			callback({
				status: 'ok',
				message: 'Marked cleared',
				data: foundDoubts.doubts[doubtObjIdx],
			});

			try {
				await depositCoin(2, currentUser._id, 'STUDENT');
				await depositCoin(2, foundAssignment.teacher_id, 'TEACHER');
			} catch (err) {
				console.error(err);
			}
		} catch (e) {
			if (e) {
				if (e.message) {
					socket.emit('error', e?.message);
				} else {
					socket.emit('error', e);
				}
			}
		}
	});
};
