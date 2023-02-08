const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('fast-csv');
const { Readable } = require('stream');

const excel = require('excel4node');
const ActivityModel = require('../model/activity');
const StudentModel = require('../model/student');
const ActualQuestionModel = require('../model/actualQuestions');
const ScheduleModel = require('../model/schedule_class');
const rewardModel = require('../model/reward');
const SessionModel = require('../model/session');
const InnovationModel = require('../model/innovations');
const PerformanceModel = require('../model/performance');
const AnswerModel = require('../model/question_answer');
const GroupModel = require('../model/group');
const AttedanceModel = require('../model/attendance');
const BookMarkModel = require('../model/bookmark');
const SchoolModel = require('../model/school');
const UserModel = require('../model/user');
const ParentModel = require('../model/parent');
const RoleModel = require('../model/role');
const ClassModel = require('../model/class');

const APIFeatures = require('../utils/apiFeatures');
const checkLimitAndPage = require('../utils/checkLimitAndPage');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const passwordUtil = require('../utils/password');
const SuccessResponse = require('../utils/successResponse');
const Student = require('../model/student');

const getAllCollections = async () => {
	const collections = await mongoose.connection.db.listCollections().toArray();
	return collections;
};

exports.search = async (req, res, next) => {
	try {
		const { searchValue } = req.body;
		const { filterKeysArray } = req.body;
		const findObj = {};
		const searchArray = [];
		for (const ele of filterKeysArray) {
			const element = {
				[ele]: { $regex: searchValue, $options: 'i' },
			};
			searchArray.push(element);
		}
		if (searchArray && searchArray.length) {
			findObj.$or = searchArray;
		}

		await StudentModel.find(findObj, (err, data) => {
			if (err) {
				res.status(400).json({
					data: err,
				});
			} else {
				res.status(201).json({
					length: data.length,
					data,
				});
			}
		});
	} catch (error) {
		console.log(error);
	}
};
/**
 * Atlas search for students by using username and name with school_id (Secondary).
 * @param  {string} searchVal
 * @param  {ObjectId} school_id
 * @description Check searchVal to differentiate for the search field ie. username/name.
 * @returns results, Matched students for the searchVal as array.
 */
exports.searchStudent = catchAsync(async (req, res, next) => {
	let total = 0;
	const { searchVal, school_id, page, limit } = req.body;
	const limitInt = limit ? parseInt(limit) : 10;
	const skip = page ? parseInt(page - 1) * limitInt : 0;
	let path = 'username';

	if (!searchVal) {
		return res
			.status(400)
			.json(new ErrorResponse('PLease enter search value', 400));
	}
	if (Number.isNaN(+searchVal)) {
		path = 'name';
	}

	const queryObj = {
		index: 'studentBasicInfo',
		compound: {
			must: [
				{
					autocomplete: {
						query: searchVal,
						path,
					},
				},
			],
		},
		count: {
			type: 'total',
		},
	};
	if (school_id) {
		queryObj.compound.filter = {
			equals: {
				path: 'school_id',
				value: mongoose.Types.ObjectId(school_id),
			},
		};
	}
	const aggregate = [
		{
			$search: queryObj,
		},
		{
			$addFields: {
				meta: '$$SEARCH_META',
			},
		},
		{
			$skip: skip,
		},
		{
			$limit: limit,
		},
		{
			$lookup: {
				from: 'classes',
				localField: 'class',
				foreignField: '_id',
				as: 'class',
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: 'section',
				foreignField: '_id',
				as: 'section',
			},
		},
		{
			$project: {
				name: 1,
				className: {
					$first: '$class.name',
				},
				sectionName: {
					$first: '$section.name',
				},
				count: '$meta.count.total',
			},
		},
	];

	const results = await StudentModel.aggregate(aggregate);
	if (results.length) {
		total = results[0].count;
	}
	res.status(200).json(SuccessResponse(results, total, 'Fetched SuccessFully'));
});

exports.Create = catchAsync(async (req, res, next) => {
	let parentId;
	let idflag = false;

	const studentRole = await RoleModel.findOne({ role_name: 'student' });
	const parentRole = await RoleModel.findOne({ role_name: 'parent' });

	if (!studentRole || !parentRole) {
		return next(new ErrorResponse('Role not found', 400));
	}

	if (req.body.p_username) {
		const parent = await ParentModel.find({ username: req.body.p_username });
		if (parent.length) {
			parentId = parent[0]._id;
			idflag = true;
		} else {
			parentId = new mongoose.Types.ObjectId();
		}
	}
	const studentModell = new StudentModel({
		_id: new mongoose.Types.ObjectId(),
		activeStatus: true,
		username: req.body.username,
		password: req.body.password,
		pin: req.body.password,
		profile_type: 'Student',
		role: studentRole._id,
		school_id: req.body.school_id,
		branch_id: req.body.branch_id,
		country_id: req.body.country,
		state_id: req.body.state,
		city_id: req.body.city,
		pincode: req.body.pincode,
		name: req.body.name,
		religion: req.body.religion,
		contact_number: req.body.contact_number,
		dob: req.body.dob,
		gender: req.body.gender,
		email: req.body.email,
		admission_no: req.body.admission_no,
		address: req.body.address,
		aadhar: req.body.aadhar,
		sts_no: req.body.sts_no,
		rte_student: req.body.rte_student,
		caste: req.body.caste,
		mother_tongue: req.body.mother_tongue,
		blood_gr: req.body.blood_gr,
		mode_of_transp: req.body.mode_of_transp,
		medical_cond: req.body.medical_cond,
		wear_glasses: req.body.wear_glasses,
		class: req.body.class,
		section: req.body.section,
		subject: req.body.subjects,
		parent_id: parentId,
		repository: req.body.repository,
		createdBy: req.body.createdBy,
		updatedBy: req.body.updatedBy,
		profile_image: req.body.profile_image,
		passport_image: req.body.passport_image,
		hobbies: req.body.hobbies,
		about_me: req.body.about_me,
	});

	const vehiObj = {
		activeStatus: true,
		_id: parentId,
		username: req.body.p_username,
		password: req.body.p_password,
		profile_type: 'Parent',
		role: parentRole._id,
		guardian: req.body.guardian,
		f_occupation: req.body.f_occupation,
		m_occupation: req.body.m_occupation,
		g_occupation: req.body.g_occupation,
		father_name: req.body.father_name,
		f_contact_number: req.body.f_contact_number,
		mobile_to_reg_student: req.body.mobile_to_reg_student,
		f_email: req.body.f_email,
		f_qualification: req.body.f_qualification,
		f_aadhar_no: req.body.f_aadhar_no,
		language_proficiency: req.body.language_proficiency,
		mother_name: req.body.mother_name,
		m_contact_number: req.body.m_contact_number,
		m_mobile_to_reg_student: req.body.m_mobile_to_reg_student,
		m_email: req.body.email,
		m_qualification: req.body.m_qualification,
		m_aadhar_no: req.body.m_aadhar_no,
		m_language_proficiency: req.body.m_language_proficiency,
		guardian_name: req.body.guardian_name,
		guardian_mobile: req.body.guardian_mobile,
		guardian_mobile_to_reg_student: req.body.guardian_mobile_to_reg_student,
		g_email: req.body.g_email,
		g_qualification: req.body.g_qualification,
		g_aadhar: req.body.g_aadhar,
		g_language_proficiency: req.body.g_language_proficiency,
		studentModel_id: [],
		repository: req.body.repository,
		profile_image: req.body.p_profile_image,
	};
	let primaryParentKey;
	let primaryParentNumber;

	switch (req.body.guardian) {
		case 'father':
			primaryParentKey = 'f_contact_number';
			primaryParentNumber = req.body.f_contact_number;
			break;
		case 'mother':
			primaryParentKey = 'm_contact_number';
			primaryParentNumber = req.body.m_contact_number;
			break;
		default:
			primaryParentKey = 'guardian_mobile';
			primaryParentNumber = req.body.guardian_mobile;
			break;
	}

	ParentModel.find({
		$and: [
			{ guardian: req.body.guardian },
			{ [primaryParentKey]: primaryParentNumber },
		],
	})
		.exec()
		.then(user => {
			if (user.length >= 10) {
				return res.status(806).json({
					data: 'student Exists',
				});
			}
			studentModell
				.save()
				.then(result => {
					if (result._id) {
						if (idflag == false) {
							vehiObj.driver_id = result._id;
							vehiObj.studentModel_id.push(result._id);
							const vehi = new ParentModel(vehiObj);
							vehi
								.save()
								.then(() => {
									res.status(201).json({
										message: 'student created successfully',
										data: result,
									});
								})
								.catch(err => {
									console.log(err);
									res.status(411).json({
										data: err,
									});
								});
						} else {
							res.status(201).json({
								message: 'student created successfully',
								data: result,
							});
						}
					} else {
						res.status(411).json({
							data: result,
						});
					}
				})
				.catch(err => {
					res.status(411).json({
						data: err,
					});
				});
		});
});

exports.enroll = catchAsync(async (req, res, next) => {
	const { body } = req;
	const studentRole = await RoleModel.findOne({ role_name: 'student' });
	const parentRole = await RoleModel.findOne({ role_name: 'parent' });

	if (!studentRole || !parentRole) {
		return next(new ErrorResponse('Role not found', 400));
	}

	let parentId = new mongoose.Types.ObjectId();
	const studentId = body._id || new mongoose.Types.ObjectId();
	// Get parent id from UserDB else create new
	if (body.p_username) {
		const parent = await ParentModel.findOne({
			username: body.p_username,
		});

		if (parent) {
			parentId = parent._id;
		}
	}

	let primaryParentKey;
	let primaryParentNumber;
	let pNameKey;
	let parentType;

	// Figureout guardian
	switch (body.guardian) {
		case 'father':
			primaryParentKey = 'f_contact_number';
			primaryParentNumber = body.f_contact_number;
			pNameKey = 'father_name';
			parentType = 'FATHER';

			break;
		case 'mother':
			primaryParentKey = 'm_contact_number';
			primaryParentNumber = body.m_contact_number;
			pNameKey = 'mother_name';
			parentType = 'MOTHER';
			break;
		default:
			primaryParentKey = 'guardian_mobile';
			primaryParentNumber = body.guardian_mobile;
			pNameKey = 'guardian_name';
			parentType = 'GUARDIAN';
			break;
	}

	const parentObj = {
		...body,
		activeStatus: true,
		profile_type: 'Parent',
		role: parentRole._id,
		username: body.p_username,
		guardian: body.guardian,
		[pNameKey]: body.p_name,
		parentType,
		name: body.p_name,
	};

	const foundParents = await ParentModel.find({
		$and: [
			{ guardian: body.guardian },
			{ [primaryParentKey]: primaryParentNumber },
		],
	});

	if (foundParents.length >= 10) {
		throw new Error('Parent length is > 10');
	}

	const savedStudent = await StudentModel.updateOne(
		{ _id: studentId },
		{
			...body,
			username: body.p_username,
			activeStatus: true,
			profile_type: 'Student',
			role: studentRole._id,
			parent_id: parentId,
			deleted: false,
		},
		{ upsert: true, new: true, runValidators: true }
	);

	if (!savedStudent) {
		throw new Error('Failed to save student');
	}

	body._id = savedStudent._id;

	const updatedParent = await ParentModel.updateOne(
		{ _id: parentId },
		{ ...parentObj, $push: { children: studentId } },
		{ upsert: true, new: true, runValidators: true }
	);

	if (!updatedParent) {
		throw new Error('error creating parent');
	}

	const statusCode = 201;

	return res
		.status(statusCode)
		.json(SuccessResponse(null, 1, 'Created Successfully'));
});

exports.CreateMany = async (req, res, next) => {
	const createdUsers = [];
	const unCreatedUsers = [];

	const studentRole = await RoleModel.findOne({ role_name: 'student' });
	const parentRole = await RoleModel.findOne({ role_name: 'parent' });

	if (!studentRole || !parentRole) {
		return next(new ErrorResponse('Role not found', 400));
	}

	for (const stud of req.body.student_list) {
		try {
			let parentId = new mongoose.Types.ObjectId();
			const studentId = stud._id || new mongoose.Types.ObjectId();
			// Get parent id from UserDB else create new
			if (stud.p_username) {
				const parent = await ParentModel.findOne({
					username: stud.p_username,
				});

				if (parent) {
					parentId = parent._id;
				}
			}

			let primaryParentKey;
			let primaryParentNumber;
			let pNameKey;
			let parentType;

			// Figureout guardian
			switch (stud.guardian) {
				case 'father':
					primaryParentKey = 'f_contact_number';
					primaryParentNumber = stud.f_contact_number;
					pNameKey = 'father_name';
					parentType = 'FATHER';

					break;
				case 'mother':
					primaryParentKey = 'm_contact_number';
					primaryParentNumber = stud.m_contact_number;
					pNameKey = 'mother_name';
					parentType = 'MOTHER';
					break;
				default:
					primaryParentKey = 'guardian_mobile';
					primaryParentNumber = stud.guardian_mobile;
					pNameKey = 'guardian_name';
					parentType = 'GUARDIAN';
					break;
			}

			const parentObj = {
				...stud,
				activeStatus: true,
				profile_type: 'Parent',
				role: parentRole._id,
				username: stud.p_username,
				guardian: stud.guardian,
				[pNameKey]: stud.p_name,
				parentType,
				name: stud.p_name,
			};

			const foundParents = await ParentModel.find({
				$and: [
					{ guardian: stud.guardian },
					{ [primaryParentKey]: primaryParentNumber },
				],
			});

			if (foundParents.length >= 10) {
				throw new Error('Parent length is > 10');
			}

			const savedStudent = await StudentModel.updateOne(
				{ _id: studentId },
				{
					...stud,
					activeStatus: true,
					profile_type: 'Student',
					role: studentRole._id,
					parent_id: parentId,
					deleted: false,
				},
				{ upsert: true, new: true, runValidators: true }
			);

			if (!savedStudent) {
				throw new Error('Failed to save student');
			}

			stud._id = savedStudent._id;

			const updatedParent = await ParentModel.updateOne(
				{ _id: parentId },
				{ ...parentObj, $push: { children: savedStudent._id } },
				{ upsert: true, new: true, runValidators: true }
			);

			if (!updatedParent) {
				throw new Error('error creating parent');
			}

			createdUsers.push(savedStudent);
		} catch (err) {
			unCreatedUsers.push({
				...stud,
				error: err.message || 'something went wrong',
			});
		}
	}

	let statusCode = 201;
	if (unCreatedUsers.length) {
		statusCode = 400;
	}

	return res.status(statusCode).json({ createdUsers, unCreatedUsers });
};

exports.deleteStudent = async (req, res, next) => {
	const deletedData = await StudentModel.delete({
		school_id: req.body.schoolId,
	});

	res.status(200).json({
		data: deletedData,
	});
};

exports.deleteAllClassStudents = async (req, res, next) => {
	const deletedData = await StudentModel.delete({
		school_id: req.body.schoolId,
		class: req.body.classId,
	});

	res.status(200).json({
		statusCode: 200,
		message: 'deleted all student from this class',
		data: deletedData,
	});
};

exports.deleteAllSectionStudents = async (req, res, next) => {
	const deletedData = await StudentModel.delete({
		school_id: req.body.schoolId,
		class: req.body.classId,
		section: req.body.sectionId,
	});

	res.status(200).json({
		statusCode: 200,
		message: 'deleted all student from this section',
		data: deletedData,
	});
};

exports.GetWithParentDetalis = async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find({})
			.select('-createdAt -updatedAt')
			.populate(
				'parent_id',
				'father_name profile_image f_contact_number username'
			)
			.populate('school_id', '_id schoolName school_code')
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name'),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			if (responeData._id) {
				req.body = { 'assignTo.student_id': responeData._id };
				const activity = new APIFeatures(ActivityModel.find({}), req.body)
					.filter()
					.sort()
					.limitFields()
					.paginate();
				const activityData = await activity.query;
				const penData = activityData.filter(x => x.status == 'pending');
				const comleteData = activityData.length - penData.length;
				const avgData = (comleteData / activityData.length) * 100;
				if (!avgData) {
					responeData.studentProgress = 0;
				} else {
					responeData.studentProgress = avgData;
				}
			}
			//

			mainObj.push(responeData);
		}
		res.status(200).json({
			records: mainObj.length,
			data: mainObj,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
};

exports.getAllstudentwithparent = async (req, res, next) => {
	try {
		const aa = await getAllCollections();
		mongoose.connection.close();

		const mongooseCon = await mongoose.connect(
			'mongodb+srv://admin:1234@cluster0.u1a2b.mongodb.net/myFirstDatabase'
		);
		res.status(200).json({
			data: 'succussfully',
		});
	} catch (err) {
		console.log('err', err);
		res.status(200).json({
			data: err,
		});
	}
};

async function progressByStudentId(studentid) {
	try {
		const obj = [];
		let LivePool = 0;
		let Announcement = 0;
		let Event = 0;
		let CheckList = 0;
		let Assignment = 0;
		let total = 0;
		let totalNum = 0;

		const allStudentActivities = await ActivityModel.find({
			assignTo: { $elemMatch: { student_id: studentid } },
		});
		const allActivities = JSON.parse(JSON.stringify(allStudentActivities));

		const totalLivePoll = allActivities.filter(
			({ activity_type }) => activity_type === 'LivePoll'
		).length;

		const totalAnnouncement = allActivities.filter(
			({ activity_type }) => activity_type === 'Announcement'
		).length;

		const totalEvent = allActivities.filter(
			({ activity_type }) => activity_type === 'Event'
		).length;

		const totalCheckList = allActivities.filter(
			({ activity_type }) => activity_type === 'Check List'
		).length;

		const totalAssignment = allActivities.filter(
			({ activity_type }) => activity_type === 'Assignment'
		).length;

		const studentId = mongoose.Types.ObjectId(studentid);
		const activityAggregation = await ActivityModel.aggregate([
			{
				$match: {
					$or: [
						{
							selected_livepool: {
								$elemMatch: {
									selected_by: studentId,
								},
							},
						},
						{
							acknowledge_by: {
								$elemMatch: {
									acknowledge_by: studentId,
								},
							},
						},
						{
							going: studentId,
						},
						{
							selected_checkList: {
								$elemMatch: {
									selected_by: studentId,
								},
							},
						},
						{
							submited_by: {
								$elemMatch: {
									student_id: studentId,
								},
							},
						},
					],
				},
			},
			{
				$group: {
					_id: '$activity_type',
					num: {
						$sum: 1,
					},
				},
			},
		]);

		const activityData = {};
		activityAggregation.forEach(v => {
			activityData[v._id] = v.num;
		});

		LivePool = activityData.livePool || 0;
		Announcement = activityData.Announcement || 0;
		Event = activityData.Event || 0;
		CheckList = activityData['Check List'] || 0;
		Assignment = activityData.Assignment || 0;

		obj.push({
			livepool: {
				completed: LivePool,
				total: totalLivePoll,
				average:
					LivePool > 0 && totalLivePoll > 0
						? (LivePool / totalLivePoll) * 100
						: LivePool,
			},
		});

		obj.push({
			Announcement: {
				completed: Announcement,
				total: totalAnnouncement,
				average:
					Announcement > 0 && totalAnnouncement > 0
						? (Announcement / totalAnnouncement) * 100
						: Announcement,
			},
		});

		obj.push({
			Event: {
				completed: Event,
				total: totalEvent,
				average:
					Event > 0 && totalEvent > 0 ? (Event / totalEvent) * 100 : Event,
			},
		});

		obj.push({
			Assignment: {
				completed: Assignment,
				total: totalAssignment,
				average:
					Assignment > 0 && totalAssignment > 0
						? (Assignment / totalAssignment) * 100
						: Assignment,
			},
		});

		obj.push({
			CheckList: {
				completed: CheckList,
				total: totalCheckList,
				average:
					CheckList > 0 && totalCheckList > 0
						? (CheckList / totalCheckList) * 100
						: CheckList,
			},
		});

		total =
			totalLivePoll +
			totalAnnouncement +
			totalEvent +
			totalAssignment +
			totalCheckList;

		totalNum =
			obj[0].livepool.completed +
			obj[1].Announcement.completed +
			obj[2].Event.completed +
			obj[3].Assignment.completed +
			obj[4].CheckList.completed;

		const totalAvg =
			obj[0].livepool.average +
			obj[1].Announcement.average +
			obj[2].Event.average +
			obj[3].Assignment.average +
			obj[4].CheckList.average;

		obj.push({
			Total: {
				completed: totalNum,
				total,
				average: total > 0 ? totalAvg / obj.length : total,
			},
		});

		return obj;
	} catch (err) {
		return null;
	}
}

exports.Get = async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find({})
			.populate(
				'parent_id',
				'father_name profile_image f_contact_number username'
			)
			.populate('school_id', '_id schoolName school_code')
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name')
			.select(
				'-createdAt -updatedAt -country_id -state_id -city_id -pincode -religion -dob -gender -email -address -aadhar -sts_no -rte_student -caste -mother_tongue -blood_gr -mode_of_transp -medical_cond -wear_glasses'
			),
		req.query
	)
		.filter()
		.sortbyname()
		.limitFields()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			if (responeData._id) {
				req.body = { 'assignTo.student_id': responeData._id };
				const progress = await progressByStudentId(responeData._id);
				responeData.studentProgress = progress[5].Total.average;
			}
			mainObj.push(responeData);
		}
		return res.status(200).json({
			count: mainObj.length,
			data: mainObj,
		});
	}

	res.status(401).json({
		data: 'No Data Found',
	});
};

exports.GetAllStudents = async (req, res, next) => {
	try {
		checkLimitAndPage(req);
		const features = new APIFeatures(
			StudentModel.find({})
				.populate(
					'parent_id',
					'father_name profile_image f_contact_number username'
				)
				.populate('school_id', '_id schoolName school_code')
				.populate('country_id', '_id country_name')
				.populate('state_id', '_id state_name')
				.populate('city_id', '_id city_name')
				.populate('class subject section', '_id name')
				.select(
					'-createdAt -updatedAt -country_id -state_id -city_id -pincode -religion -dob -gender -email -address -aadhar -sts_no -rte_student -caste -mother_tongue -blood_gr -mode_of_transp -medical_cond -wear_glasses'
				),
			req.body
		)
			.filter()
			.sortbyname()
			.limitFields()
			.paginate();
		// .searchValue();
		const schoolId = req.body.school_id;
		const sectionId = req.body.section;
		let totalStudentsInSection = 0;
		let totalStudentsInClass = 0;

		const getAllStudent = await features.query;
		if (getAllStudent) {
			const mainObj = [];
			const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
			for (const responeData of responeData1) {
				if (responeData.section && responeData.section.length > 22) {
					if (schoolId && sectionId && !totalStudentsInSection)
						totalStudentsInSection = await StudentModel.countDocuments({
							school_id: responeData.school_id._id,
							section: responeData.section._id,
						});
					responeData.totalStudentsInSection = totalStudentsInSection;
				} else responeData.sectionName = 'no section name';
				totalStudentsInClass = await StudentModel.countDocuments({
					school_id: responeData.school_id._id,
					section: responeData.section._id,
					class: responeData.class._id,
				});
				responeData.totalStudentsInClass = totalStudentsInClass;
				if (responeData._id) {
					req.body = { 'assignTo.student_id': responeData._id };
					const progress = await progressByStudentId(responeData._id);
					responeData.studentProgress = progress[5].Total.average;
				}
				mainObj.push(responeData);
			}
			return res.status(200).json({
				data: mainObj,
			});
		}
		res.status(401).json({
			data: 'No Data Found',
		});
	} catch (error) {
		console.log('error', error);
		res.status(401).json({
			status: 401,
			data: error.message,
		});
	}
};
async function parentNumberValidation(guardianName) {
	if (guardianName === 'father') {
		return 'f_contact_number';
	}
	if (guardianName === 'mother') {
		return 'm_contact_number';
	}
	if (guardianName === 'guardian') {
		return 'guardian_mobile';
	}
}
async function knownKey(getAllStudent, mobile) {
	let key;
	if (getAllStudent[0].f_contact_number === mobile.toString()) {
		return (key = 'f_contact_number');
	}
	if (getAllStudent[0].m_contact_number === mobile.toString()) {
		return (key = 'm_contact_number');
	}
	if (getAllStudent[0].guardian_mobile === mobile.toString()) {
		return (key = 'guardian_mobile');
	}
}

exports.parentNumberValidation = async (req, res, next) => {
	const { mobile } = req.body;
	const { guardian } = req.body;

	const getAllStudent = await ParentModel.find({
		$or: [
			{ f_contact_number: mobile },
			{ m_contact_number: mobile },
			{ guardian_mobile: mobile },
		],
	}).select('-createdAt -updatedAt');
	if (getAllStudent.length) {
		const field = await parentNumberValidation(guardian);
		const key = await knownKey(getAllStudent, mobile);
		if (field === key) {
			const student = await StudentModel.find({
				parent_id: getAllStudent[0]._id,
			}).select('-createdAt -updatedAt');
			if (student.length <= 10) {
				res.status(200).json({
					status: 'success',
				});
			} else {
				res.status(200).json({
					status: 'error',
				});
			}
		} else {
			res.status(200).json({
				status: `already exists with gender${getAllStudent[0].profile_type}`,
			});
		}
	} else {
		res.status(200).json({
			status: 'success',
		});
	}
};

exports.getBySectionId = async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find({}).select(
			'_id section name class username school_id parent_id profile_image '
		),
		req.body
	)
		.filter()
		.sortbyname();
	// .paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		res.status(200).json({
			count: responeData1.length,
			data: responeData1,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
};

exports.GetAllStudentIds = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			StudentModel.find({}).select('-createdAt -updatedAt'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();

		const getAllStudent = await features.query;
		if (getAllStudent) {
			const mainObj = [];
			const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
			for (const responeData of responeData1) {
				mainObj.push(responeData._id);
			}
			res.status(200).json({
				data: mainObj,
			});
		} else {
			res.status(401).json({
				data: 'No Data Found',
			});
		}
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.exceldownload = catchAsync(async (req, res, next) => {
	const { schoolId } = req.body;
	const workbook = new excel.Workbook();
	const school = await SchoolModel.findById(mongoose.Types.ObjectId(schoolId));
	const worksheet = workbook.addWorksheet(`${school.schoolName}`);
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('NAME').style(style);
	worksheet.cell(1, 2).string('MOBILE').style(style);
	worksheet.cell(1, 3).string('CLASS').style(style);
	worksheet.cell(1, 4).string('SECTION').style(style);
	worksheet.cell(1, 5).string('GENDER').style(style);
	worksheet.cell(1, 6).string('SCHOOL').style(style);
	const students = await StudentModel.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
			},
		},
		{
			$project: {
				_id: 0,
				name: 1,
				gender: 1,
				username: 1,
				section: 1,
				class: 1,
				parent_id: 1,
				school_id: 1,
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					classId: '$class',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$$classId', '$_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
							sequence_number: 1,
						},
					},
				],
				as: 'class',
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$section',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$$sectionId', '$_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'section',
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school: '$school_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$$school', '$_id'],
							},
						},
					},
					{
						$project: {
							schoolName: 1,
						},
					},
				],
				as: 'school',
			},
		},
		{
			$unwind: '$school',
		},
		{
			$unwind: '$class',
		},
		{
			$unwind: '$section',
		},
		{
			$project: {
				class: '$class.name',
				section: '$section.name',
				name: 1,
				mobile: '$username',
				gender: 1,
				school: '$school.schoolName',
				sequence_number: '$class.sequence_number',
			},
		},
		{
			$sort: {
				sequence_number: 1,
			},
		},
	]);
	let row = 2;
	let col = 1;
	students.forEach(async stud => {
		worksheet.cell(row, col).string(stud.name);
		worksheet.cell(row, col + 1).string(stud.mobile);
		worksheet.cell(row, col + 2).string(stud.class);
		worksheet.cell(row, col + 3).string(stud.section);
		worksheet.cell(row, col + 4).string(stud.gender);
		worksheet.cell(row, col + 5).string(stud.school);
		row += 1;
		col = 1;
	});

	// workbook.write('STUDENT_LIST.xlsx');

	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(SuccessResponse(data, data.length, 'fetched'));
});

exports.excelworksheet = catchAsync(async (req, res, next) => {
	const { schools, class_id } = req.body;
	const workbook = new excel.Workbook();
	for (const ele of schools) {
		const school = await SchoolModel.findById(mongoose.Types.ObjectId(ele));
		const worksheet = workbook.addWorksheet(`${school.schoolName}`);
		const style = workbook.createStyle({
			font: {
				bold: true,
				color: '#000000',
				size: 12,
			},
			numberFormat: '$#,##0.00; ($#,##0.00); -',
		});
		worksheet.cell(1, 1).string('NAME').style(style);
		worksheet.cell(1, 2).string('MOBILE').style(style);
		worksheet.cell(1, 3).string('CLASS').style(style);
		worksheet.cell(1, 4).string('SECTION').style(style);
		worksheet.cell(1, 5).string('GENDER').style(style);
		worksheet.cell(1, 6).string('PARENT').style(style);
		const students = await StudentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(ele),
					class: mongoose.Types.ObjectId(class_id),
				},
			},
			{
				$project: {
					_id: 0,
					name: 1,
					gender: 1,
					username: 1,
					section: 1,
					class: 1,
					parent_id: 1,
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						classId: '$class',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$$classId', '$_id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'class',
				},
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						sectionId: '$section',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$$sectionId', '$_id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'section',
				},
			},
			{
				$lookup: {
					from: 'parents',
					let: {
						parentId: '$parent_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$$parentId', '$_id'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'parent',
				},
			},
			{
				$unwind: '$parent',
			},
			{
				$unwind: '$class',
			},
			{
				$unwind: '$section',
			},
			{
				$project: {
					class: '$class.name',
					section: '$section.name',
					name: 1,
					mobile: '$username',
					gender: 1,
					parent: '$parent.name',
				},
			},
		]);
		let row = 2;
		let col = 1;
		students.forEach(async stud => {
			worksheet.cell(row, col).string(stud.name);
			worksheet.cell(row, col + 1).string(stud.mobile);
			worksheet.cell(row, col + 2).string(stud.class);
			worksheet.cell(row, col + 3).string(stud.section);
			worksheet.cell(row, col + 4).string(stud.gender);
			worksheet.cell(row, col + 5).string(stud.parent);
			row += 1;
			col = 1;
		});
	}
	workbook.write('STUDENT_LIST.xlsx');

	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res.status(200).json(SuccessResponse(data, data.length, 'fetched'));
});

exports.updateDailyCoins = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const date = new Date();
	const rewards = {
		coins: 0,
		dailyCoins: 5,
		isClaimed: true,
		date,
	};
	const foundStudent = await StudentModel.findById(id);
	let { rewards: reward, coin } = foundStudent;
	coin = coin + reward.coins + reward.dailyCoins;
	const updatedReward = await StudentModel.findOneAndUpdate(
		{ _id: id },
		{
			coin,
			rewards,
		},
		{
			new: true,
		}
	);
	res
		.status(200)
		.json(
			SuccessResponse(
				updatedReward,
				updatedReward.length,
				'Updated SuccessFully'
			)
		);
});

exports.getDailyCoins = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const foundStudent = await StudentModel.findById(id).select('rewards');
	let coin = 0;
	if (foundStudent.rewards) {
		coin = foundStudent.rewards.coins;
	}
	res.status(200).json({ message: 'fetched', data: { coin } });
});

exports.getStudentsRewards = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const { rewards } = await StudentModel.findOne({ _id: id }, { rewards: 1 });
	const { isClaimed, coins, date, dailyCoins } = rewards;
	if (date < today && isClaimed == true) {
		rewards.isClaimed = false;
	}
	res.status(200).json(SuccessResponse(rewards, 1, 'Fetched SuccessFully'));
});

exports.deleteMapping = catchAsync(async (req, res, next) => {
	const { student_id } = req.body;
	const activity_payload = {
		$pull: {
			assignTo: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	};
	const actualQuestions_payload = {
		$pull: {
			assignTo: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	};
	const attendance_payload = {
		$pull: {
			attendanceDetails: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	};
	const group_payload = {
		students: mongoose.Types.ObjectId(student_id),
	};
	const Parent_payload = {
		children: mongoose.Types.ObjectId(student_id),
	};
	const reward_payload = {
		'student_details.student_id': mongoose.Types.ObjectId(student_id),
	};
	const schedule_payload = {
		$pull: {
			assign_To: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	};
	const session_payload = {
		$pull: {
			student_join_session: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	};
	await ActivityModel.updateMany(
		{
			'assignTo.student_id': mongoose.Types.ObjectId(student_id),
		},
		activity_payload
	);
	await ActualQuestionModel.updateMany(
		{
			'assignTo.student_id': mongoose.Types.ObjectId(student_id),
		},
		actualQuestions_payload
	);
	await AttedanceModel.updateMany(
		{ 'attendanceDetails.student_id': mongoose.Types.ObjectId(student_id) },
		attendance_payload
	);
	await BookMarkModel.deleteMany({
		student_id: mongoose.Types.ObjectId(student_id),
	});
	await GroupModel.updateMany(group_payload, {
		$pull: group_payload,
	});
	await InnovationModel.deleteMany({
		submitted_by: mongoose.Types.ObjectId(student_id),
	});
	await ParentModel.updateOne(Parent_payload, {
		$pull: Parent_payload,
	});
	await PerformanceModel.deleteMany({
		student_id: mongoose.Types.ObjectId(student_id),
	});
	await AnswerModel.deleteMany({
		'student_details.student_id': mongoose.Types.ObjectId(student_id),
	});
	await rewardModel.updateMany(reward_payload, {
		$pull: {
			student_details: {
				student_id: mongoose.Types.ObjectId(student_id),
			},
		},
	});
	await ScheduleModel.updateMany(
		{
			'assign_To.student_id': mongoose.Types.ObjectId(student_id),
		},
		schedule_payload
	);
	await SessionModel.updateMany(
		{
			'student_join_session.student_id': mongoose.Types.ObjectId(student_id),
		},
		session_payload
	);
	await StudentModel.deleteOne({ _id: mongoose.Types.ObjectId(student_id) });
	res.status(200).json({
		success: true,
		message: 'Deleted Successfully',
	});
});

exports.GetDashoardData = async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find({})
			.populate(
				'parent_id',
				'father_name profile_image f_contact_number username'
			)
			.populate('school_id', '_id schoolName school_code')
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name'),
		req.query
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			mainObj.push(responeData);
		}

		res.status(200).json({
			status: 'success',
			result: mainObj.length,
			data: mainObj,
		});
	}
};
exports.GetDashoardDataPost = async (req, res, next) => {
	checkLimitAndPage(req);
	const features = new APIFeatures(
		StudentModel.find({}, {}, { withProfileStatus: 'ALL' })
			.populate(
				'parent_id',
				'father_name profile_image f_contact_number username'
			)
			.populate({
				path: 'school_id',
				select: '_id schoolName school_code',
				populate: {
					path: 'branch',
					select: '_id name',
				},
			})
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name')
			.populate('role', 'role_name display_name'),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const getAllStudent = await features.query;
	res.status(200).json({
		status: 'success',
		result: getAllStudent.length,
		data: getAllStudent,
	});
};

exports.GetDashoardDataCount = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(StudentModel.find({}, {}), req.body)
		.filter()
		.count();

	const allStudCount = await features.query;

	res.status(200).json({
		status: 'success',
		result: allStudCount,
	});
});

exports.BulkUpdate = async (req, res, next) => {
	try {
		if (!req.files) {
			return res.status(400).send('No files were uploaded.');
		}
		const authorFile = req.files.file;
		const updatedUsers = [];
		const notUpdatedUsers = [];
		Readable.from(authorFile.data)
			.pipe(
				csv.parse({
					headers: true,
					ignoreEmpty: true,
				})
			)
			.on('data', async row => {
				if (row.contact_number) {
					const username = row.contact_number;
					const canArr1 = row.f_methods_1.split(';');
					const canArr2 = row.f_methods_2.split(';');
					const canArr3 = row.f_methods_3.split(';');
					const canArr4 = row.m_methods_1.split(';');
					const canArr5 = row.m_methods_2.split(';');
					const canArr6 = row.m_methods_3.split(';');
					row.language_proficiency = [
						{
							languageOne: {
								languageName: row.f_language_1,
								read: canArr1.includes('Read') ? 'Yes' : 'No',
								write: canArr1.includes('Write') ? 'Yes' : 'No',
								speak: canArr1.includes('Speak') ? 'Yes' : 'No',
							},
							languageTwo: {
								languageName: row.f_language_1,
								read: canArr2.includes('Read') ? 'Yes' : 'No',
								write: canArr2.includes('Write') ? 'Yes' : 'No',
								speak: canArr2.includes('Speak') ? 'Yes' : 'No',
							},
							languageThree: {
								languageName: row.f_language_1,
								read: canArr3.includes('Read') ? 'Yes' : 'No',
								write: canArr3.includes('Write') ? 'Yes' : 'No',
								speak: canArr3.includes('Speak') ? 'Yes' : 'No',
							},
						},
					];
					row.m_language_proficiency = [
						{
							languageOne: {
								languageName: row.f_language_1,
								read: canArr4.includes('Read') ? 'Yes' : 'No',
								write: canArr4.includes('Write') ? 'Yes' : 'No',
								speak: canArr4.includes('Speak') ? 'Yes' : 'No',
							},
							languageTwo: {
								languageName: row.f_language_1,
								read: canArr5.includes('Read') ? 'Yes' : 'No',
								write: canArr5.includes('Write') ? 'Yes' : 'No',
								speak: canArr5.includes('Speak') ? 'Yes' : 'No',
							},
							languageThree: {
								languageName: row.f_language_1,
								read: canArr6.includes('Read') ? 'Yes' : 'No',
								write: canArr6.includes('Write') ? 'Yes' : 'No',
								speak: canArr6.includes('Speak') ? 'Yes' : 'No',
							},
						},
					];
					const class_details = await ClassModel.findOne({
						name: row.class,
					}).select('_id');

					const StudentData = await StudentModel.findOne({
						username,
						class: class_details._id,
					}).select('_id parent_id');
					delete row.class;
					delete row.contact_number;
					delete row.school_id;
					delete row.f_language_1;
					delete row.f_language_2;
					delete row.f_language_3;
					delete row.f_methods_1;
					delete row.f_methods_2;
					delete row.f_methods_3;
					delete row.m_language_1;
					delete row.m_language_2;
					delete row.m_language_3;
					delete row.m_methods_1;
					delete row.m_methods_2;
					delete row.m_methods_3;
					if (!StudentData) {
						notUpdatedUsers.push(row.name.toString());
					} else {
						row._id = StudentData._id;
						row.parent_id = StudentData.parent_id;
						await StudentModel.findByIdAndUpdate(row._id, {
							$set: {
								name: row.name,
								gender: row.gender,
								address: row.address,
								email: row.email,
								city_id: row.city_id,
								state_id: row.state_id,
								country_id: row.country_id,
								pincode: row.pincode,
								dob: row.dob,
								aadhar: row.aadhar,
								sts_no: row.sts_no,
								rte_student: row.rte_student,
								caste: row.caste,
								religion: row.religion,
								mother_tongue: row.mother_tongue,
								blood_gr: row.blood_gr,
								mode_of_transp: row.mode_of_transp,
								medical_cond: row.medical_cond,
								wear_glasses: row.wear_glasses,
								about_me: row.about_me,
								hobbies: row.hobbies,
							},
						});
						await ParentModel.findByIdAndUpdate(row.parent_id, {
							$set: {
								father_name: row.father_name,
								mother_name: row.mother_name,
								f_contact_number: row.f_contact_number,
								m_contact_number: row.m_contact_number,
								f_email: row.f_email,
								m_email: row.m_email,
								f_occupation: row.f_occupation,
								m_occupation: row.m_occupation,
								f_qualification: row.f_qualification,
								m_qualification: row.m_qualification,
								f_aadhar_no: row.f_aadhar_no,
								m_aadhar_no: row.m_aadhar_no,
								language_proficiency: row.language_proficiency,
								m_language_proficiency: row.m_language_proficiency,
							},
						});
					}
				} else {
					console.log(row.name);
				}
			})
			.on('end', () => {
				console.log({
					length: notUpdatedUsers.length,
					data: notUpdatedUsers,
				});
				res.status(200).json({
					status: 'success',
					length: notUpdatedUsers.length,
					data: notUpdatedUsers,
				});
			})
			.on('error', error => {
				console.log(error.message);
			});
	} catch (err) {
		console.log(err.message);
	}
};

exports.getById = async (req, res, next) => {
	const { id } = req.params;
	const getStudent = await StudentModel.findById(id)
		.populate(
			'parent_id',
			'father_name profile_image f_contact_number username'
		)
		.populate('school_id', '_id schoolName school_code')
		.populate('country_id', '_id country_name')
		.populate('state_id', '_id state_name')
		.populate('city_id', '_id city_name')
		.populate('class subject section', '_id name')
		.populate({
			path: 'school_id',
			select: '_id schoolName school_code schoolImage',
			populate: { path: 'institute', select: 'name profile_image' },
		});
	if (getStudent) {
		const responeData = getStudent.toObject({ getters: true, virtuals: false });
		if (responeData._id) {
			const studentId = mongoose.Types.ObjectId(responeData._id);

			const studentProgress = await ActivityModel.aggregate([
				{
					$match: { 'assignTo.student_id': studentId },
				},
				{
					$project: {
						assignTo: {
							$filter: {
								input: '$assignTo',
								as: 'item',
								cond: {
									$eq: ['$$item.student_id', studentId],
								},
							},
						},
					},
				},
				{
					$group: {
						_id: { $first: '$assignTo.student_id' },
						total: { $sum: 1 },
						completed: {
							$sum: {
								$cond: [
									{
										$not: [
											{
												$in: [
													{ $first: '$assignTo.status' },
													['Pending', 'Partially Pending'],
												],
											},
										],
									},
									1,
									0,
								],
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						progress: {
							$multiply: [{ $divide: ['$completed', '$total'] }, 100],
						},
					},
				},
			]);
			if (studentProgress && studentProgress.length > 0) {
				responeData.studentProgress = studentProgress[0].progress;
			} else {
				responeData.studentProgress = 0;
			}
		}
		res.status(200).json({
			data: [responeData],
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
};

exports.updateById = catchAsync(async (req, res, next) => {
	const user = await StudentModel.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
	});
	if (user) {
		res.status(200).json({
			status: 'success',
			data: user,
		});
	} else {
		res.status(200).json({
			status: 'data not updated',
		});
	}
});
exports.login = catchAsync(async (req, res, next) => {
	if (!req.body.password) {
		return next(new ErrorResponse('Please enter password', 400));
	}

	const student = await StudentModel.findOne({
		$and: [
			{
				_id: req.body.username,
			},
			{ activeStatus: true },
		],
	})
		.select('+password')
		.populate('School class');

	if (!student) {
		return next(new ErrorResponse('User Not found', 404));
	}

	if (student.profileStatus !== 'APPROVED') {
		return next(
			new ErrorResponse(`User is in ${student.profileStatus} state`, 403)
		);
	}

	let isMatch = null;

	if (student.password === req.body.password) {
		isMatch = true;
		// hash password if it isnt hashed.
		// remove this in future.
		student.password = req.body.password;
		student.markModified('password');
		await student.save();
	} else {
		isMatch = await student.comparePassword(req.body.password);
	}

	if (!isMatch) {
		return next(new ErrorResponse('Invalid Password', 401));
	}

	const token = await passwordUtil.genJwtToken(student._id);

	res.status(200).json({
		message: 'Auth successful',
		token,
		user_info: student,
	});
});

exports.find = async (req, res, next) => {
	try {
		const mainObj = [];
		StudentModel.find({
			username: req.body.username,
		})
			.select('+password')
			.populate('parent_id', '+password')
			.populate('class section ', '_id name')
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate({
				path: 'school_id',
				select: '_id schoolName school_code schoolImage',
				populate: { path: 'institute', select: 'name profile_image' },
			})
			.exec()
			.then(async student => {
				if (student.length < 1) {
					return res.status(401).json({
						status: 401,
						message: 'Student does Not Exist',
					});
				}
				for (const ele of student) {
					if (ele.password && ele.password.length) {
						ele.password = 'yes';
					}
					if (
						ele.parent_id &&
						ele.parent_id.password &&
						ele.parent_id.password.length
					) {
						ele.parent_id.password = 'yes';
					}
				}
				return res.status(200).json({
					user_info: student,
				});
			})
			.catch(err => {
				console.log(err);
				res.status(500).json({
					error: err.message,
				});
			});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.UpdatePassword = catchAsync(async (req, res, next) => {
	let user = await StudentModel.findOne({ _id: req.body.id });

	if (!user) {
		return next(new ErrorResponse('User does not exist', 404));
	}
	user.pin = req.body.password;
	user.password = req.body.password;
	user = await user.save();

	return res.status(200).json({
		status: 'success',
	});
});

/// //////////////// update hobbies ///////
exports.UpdateStudentData = async (req, res, next) => {
	try {
		const { id } = req.params;
		await StudentModel.findByIdAndUpdate(id, {
			about_me: req.body.about_me,
			hobbies: req.body.hobbies,
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.UpdateStudentClassID = async (req, res, next) => {
	try {
		const { id } = req.body;
		const sudentData = await StudentModel.updateMany(
			{ class: id },
			{
				class: req.body.newClassId,
			}
		);
		res.status(200).json({
			status: 'success',
			dataa: sudentData,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};
/// //////////////// update image ///////
exports.profile_image = async (req, res, next) => {
	try {
		const { id } = req.params;
		await StudentModel.findByIdAndUpdate(id, {
			profile_image: req.body.profile_image,
		});
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.student_details_count = async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find()
			.populate(
				'parent_id',
				'father_name profile_image f_contact_number username'
			)
			.populate('school_id', '_id schoolName school_code')
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name'),
		req.params
	)
		.filter()
		.sort()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			if (responeData._id) {
				req.body = { 'assignTo.student_id': responeData._id };

				const activity = new APIFeatures(ActivityModel.find({}), req.body)
					.filter()
					.sort()
					.limitFields()
					.paginate();
				const activityData = await activity.query;
				const penData = activityData.filter(x => x.status == 'pending');
				const comleteData = activityData.length - penData.length;
				const avgData = (comleteData / activityData.length) * 100;
				if (!avgData) {
					responeData.studentProgress = 0;
				} else {
					responeData.studentProgress = avgData;
				}
			}
			mainObj.push(responeData);
		}
		//
		res.status(200).json({
			count: mainObj.length,
			data: mainObj,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
};

exports.student_details = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		StudentModel.find()
			.populate('parent_id', '-password')
			.populate('school_id', '_id schoolName school_code')
			.populate('country_id', '_id country_name')
			.populate('branch_id', '_id name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name'),
		req.params
	)
		.filter()
		.sort()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			if (responeData._id) {
				req.body = { 'assignTo.student_id': responeData._id };
				/// /////////////////////////////////////////////////////////////////////////////
				const activity = new APIFeatures(ActivityModel.find({}), req.body)
					.filter()
					.sort()
					.limitFields()
					.paginate();
				const activityData = await activity.query;

				const penData = activityData.filter(x => x.status == 'pending');
				const comleteData = activityData.length - penData.length;
				const avgData = (comleteData / activityData.length) * 100;
				if (!avgData) {
					responeData.studentProgress = 0;
				} else {
					responeData.studentProgress = avgData;
				}
			}
			mainObj.push(responeData);
		}
		//
		res.status(200).json({
			data: mainObj,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
});

exports.student_details_post = catchAsync(async (req, res, next) => {
	checkLimitAndPage(req);
	const payload = {
		deleted: false,
		school_id: req.params.school_id,
		...req.body,
	};
	const features = new APIFeatures(
		StudentModel.find()
			.populate('parent_id', '-password')
			.populate({
				path: 'school_id',
				select: '_id schoolName school_code',
				populate: {
					path: 'branch',
					select: '_id name',
				},
			})
			.populate('country_id', '_id country_name')
			.populate('state_id', '_id state_name')
			.populate('city_id', '_id city_name')
			.populate('class subject section', '_id name'),
		{ ...payload }
	)
		.filter()
		.sort()
		.paginate();

	const getAllStudent = await features.query;
	if (getAllStudent) {
		const mainObj = [];
		const responeData1 = JSON.parse(JSON.stringify(getAllStudent));
		for (const responeData of responeData1) {
			// if (!(responeData.parent_id === null)) {
			// 	const guardianName = responeData.parent_id.guardian;
			// 	switch (guardianName) {
			// 		case 'father':
			// 			delete responeData.parent_id.mother_name;
			// 			delete responeData.parent_id.m_contact_number;
			// 			delete responeData.parent_id.guardian_name;
			// 			delete responeData.parent_id.guardian_mobile;
			// 			break;
			// 		case 'mother':
			// 			delete responeData.parent_id.father_name;
			// 			delete responeData.parent_id.f_contact_number;
			// 			delete responeData.parent_id.guardian_name;
			// 			delete responeData.parent_id.guardian_mobile;
			// 			break;
			// 		case 'guardian':
			// 			delete responeData.parent_id.mother_name;
			// 			delete responeData.parent_id.m_contact_number;
			// 			delete responeData.parent_id.father_name;
			// 			delete responeData.parent_id.f_contact_number;
			// 			break;
			// 		default:
			// 			break;
			// 	}
			// }
			if (responeData._id) {
				req.body = { 'assignTo.student_id': responeData._id };
				/// /////////////////////////////////////////////////////////////////////////////
				const activity = new APIFeatures(ActivityModel.find({}), req.body)
					.filter()
					.sort()
					.limitFields()
					.paginate();
				const activityData = await activity.query;

				const penData = activityData.filter(x => x.status == 'pending');
				const comleteData = activityData.length - penData.length;
				// const teacherData =await teacherModel.find().populate('profile_type secondary_profile_type');
				const avgData = (comleteData / activityData.length) * 100;
				if (!avgData) {
					responeData.studentProgress = 0;
				} else {
					responeData.studentProgress = avgData;
				}
			}
			mainObj.push(responeData);
		}
		//
		res.status(200).json({
			data: mainObj,
			count: mainObj.length,
		});
	} else {
		res.status(401).json({
			data: 'No Data Found',
		});
	}
});

exports.student_details_count_post = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(StudentModel.find({}), req.body)
		.filter()
		.count();

	const studCount = await features.query;

	res.status(200).json({
		count: studCount,
	});
});

exports.countBySchool = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(StudentModel.find({}), req.query)
		.filter()
		.count();

	const studCount = await features.query;

	res.status(200).json({
		count: studCount,
	});
});

exports.updateDeviceToken = async (req, res, next) => {
	StudentModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			DeviceToken: req.body.device_token,
		}
	)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: 'Updated',
				});
			} else {
				res.status(500).json({
					message: 'fail to update',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err.message,
			});
		});
};
/// /////////////// update student /////////////////

exports.UpdateStudentDetails = async (req, res, next) => {
	const studentObj = {
		school_id: req.body.school_id,
		branch_id: req.body.branch_id,
		name: req.body.name,
		profile_image: req.body.profile_image,
		contact_number: req.body.contact_number,
		username: req.body.mobile_to_reg_student,
		religion: req.body.religion,
		dob: req.body.dob,
		gender: req.body.gender,
		email: req.body.email,
		country_id: req.body.country,
		pincode: req.body.pincode,
		state_id: req.body.state,
		city_id: req.body.city,
		address: req.body.address,
		admission_no: req.body.admission_no,
		aadhar: req.body.aadhar,
		sts_no: req.body.sts_no,
		rte_student: req.body.rte_student,
		caste: req.body.caste,
		mother_tongue: req.body.mother_tongue,
		blood_gr: req.body.blood_gr,
		mode_of_transp: req.body.mode_of_transp,
		medical_cond: req.body.medical_cond,
		wear_glasses: req.body.wear_glasses,
		class: req.body.class,
		section: req.body.section,
		subject: req.body.subject,
	};
	const vehi = {
		// username: req.body.guardian == 'father' ? req.body.f_contact_number : req.body.guardian == 'mother' ? req.body.m_contact_number : req.body.guardian_mobile,
		guardian: req.body.guardian,
		f_occupation: req.body.f_occupation,
		m_occupation: req.body.m_occupation,
		g_occupation: req.body.g_occupation,
		father_name: req.body.father_name,
		f_contact_number: req.body.f_contact_number,
		mobile_to_reg_student: req.body.mobile_to_reg_student,
		f_email: req.body.f_email,
		f_qualification: req.body.f_qualification,
		f_aadhar_no: req.body.f_aadhar_no,
		language_proficiency: req.body.language_proficiency,
		mother_name: req.body.mother_name,
		username: req.body.mobile_to_reg_student,
		m_contact_number: req.body.m_contact_number,
		m_mobile_to_reg_student: req.body.m_mobile_to_reg_student,
		m_email: req.body.m_email,
		m_qualification: req.body.m_qualification,
		m_aadhar_no: req.body.m_aadhar_no,
		m_language_proficiency: req.body.m_language_proficiency,
		guardian_name: req.body.guardian_name,
		guardian_mobile: req.body.guardian_mobile,
		guardian_mobile_to_reg_student: req.body.guardian_mobile_to_reg_student,
		g_email: req.body.g_email,
		g_qualification: req.body.g_qualification,
		g_aadhar: req.body.g_aadhar,
		g_language_proficiency: req.body.g_language_proficiency,
	};

	const studUpdated = await StudentModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		studentObj
	);

	ParentModel.findOneAndUpdate(
		{
			_id: studUpdated.parent_id,
		},
		vehi
	)
		.exec()
		.then(async v => {
			if (v) {
				res.status(200).json({
					data: 'Updated',
				});
			} else {
				res.status(500).json({
					data: v,
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err.message,
			});
		});
};
/// //////////////////////////////////////////Bulk Upload /////////////////////////////////
exports.BulkUpload = async (req, res, next) => {
	console.log('-------------------', req.files);
	const fileRows = [];
	csv
		.parseFile(req.file.path)
		.on('data', data => {
			fileRows.push(data); // push each row
			console.log('fileRows', fileRows);
		})
		.on('end', () => {
			console.log(fileRows);
			fs.unlinkSync(req.file.path); // remove temp file
			// process "fileRows" and respond
		});
};
exports.UpdateactiveStatus = async (req, res, next) => {
	StudentModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			activeStatus: req.body.activeStatus,
		}
	)
		.exec()
		.then(chapter => {
			if (chapter) {
				res.status(200).json({
					message: 'Updated',
				});
			} else {
				res.status(500).json({
					message: 'fail to update',
				});
			}
		})
		.catch(err => {
			res.status(500).json({
				error: err,
			});
		});
};

exports.addActiveStatusInUsers = async (req, res, next) => {
	const userData = await UserModel.find();
	// const promise = [];
	let userCounter = 0;
	for (const user of userData) {
		const uu = JSON.parse(JSON.stringify(user));
		// eslint-disable-next-line no-prototype-builtins
		if (!uu.hasOwnProperty('activeStatus')) {
			userCounter += 1;
			await UserModel.findByIdAndUpdate(user.id, { activeStatus: true });
		}
	}
	let studentCounter = 0;
	const studentData = await StudentModel.find();
	for (const user of studentData) {
		const uu = JSON.parse(JSON.stringify(user));
		// eslint-disable-next-line no-prototype-builtins
		if (!uu.hasOwnProperty('activeStatus')) {
			studentCounter += 1;
			await StudentModel.findByIdAndUpdate(user.id, { activeStatus: true });
		}
	}

	let parentCounter = 0;
	const parentData = await ParentModel.find();
	for (const user of parentData) {
		const uu = JSON.parse(JSON.stringify(user));
		// eslint-disable-next-line no-prototype-builtins
		if (!uu.hasOwnProperty('activeStatus')) {
			parentCounter += 1;
			await ParentModel.findByIdAndUpdate(user.id, { activeStatus: true });
		}
	}
	res.status(200).json({
		data: 'success',
		userCounter,
		studentCounter,
		parentCounter,
	});
};

exports.studentBySection = catchAsync(async (req, res, next) => {
	const { sectionId } = req.params;
	const students = await StudentModel.aggregate([
		{
			$match: {
				section: mongoose.Types.ObjectId(sectionId),
			},
		},
		{
			$project: {
				_id: 1,
				profile_image: 1,
				class: 1,
				name: 1,
				section: 1,
				school_id: 1,
				assigned: '$assignment.assigned',
				completed: '$assignment.completed',
			},
		},
		{
			$lookup: {
				from: 'assignments',
				let: {
					studId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$studId', '$assignTo.student_id'],
							},
						},
					},
					{
						$limit: 7,
					},
					{
						$sort: {
							startDate: -1,
						},
					},
					{
						$project: {
							assignTo: {
								$filter: {
									input: '$assignTo',
									as: 'item',
									cond: {
										$eq: ['$$item.student_id', '$$studId'],
									},
								},
							},
						},
					},
					{
						$unwind: '$assignTo',
					},
					{
						$group: {
							_id: '$assignTo.student_id',
							status: {
								$push: '$assignTo.status',
							},
						},
					},
				],
				as: 'assignments',
			},
		},
		{
			$project: {
				_id: 1,
				profile_image: 1,
				class: 1,
				name: 1,
				section: 1,
				school_id: 1,
				assigned: 1,
				completed: 1,
				assignments: {
					$first: '$assignments.status',
				},
			},
		},
	]);
	if (!students.length) {
		return next(
			res.status(404).json(new ErrorResponse('No Students Found', 404))
		);
	}
	res
		.status(200)
		.json(SuccessResponse(students, students.length, 'Fetched students'));
});

exports.deleteSectionFromStudents = async (req, res, next) => {
	const studentData = await StudentModel.find({
		$and: [
			{ section: req.body.section },
			{ 'repository.id': req.body.schoolId },
		],
	});
	for (const user of studentData) {
		await StudentModel.findByIdAndUpdate(user.id, { section: null });
	}

	res.status(200).json({
		data: 'success',
	});
};
