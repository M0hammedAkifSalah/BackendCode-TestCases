/* eslint-disable no-unused-expressions */
/* eslint-disable new-cap */
const mongoose = require('mongoose');
const SchoolModel = require('../model/school');
const City = require('../model/city');
const Country = require('../model/country');
const State = require('../model/state');
const Board = require('../model/board');
const activityModel = require('../model/activity');
const APIFeatures = require('../utils/apiFeatures');
const Stype = require('../model/stype');
const classModel = require('../model/class');
const sectionModel = require('../model/section');
const RoleModel = require('../model/role');

const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const CatchAsync = require('../utils/catchAsync');
const redisClient = require('../config/redisClient');

const StudentModel = require('../model/student');

const syllabusModel = require('../model/syllabus');
const boardModel = require('../model/board');
const BranchModel = require('../model/branch');
const subjectModel = require('../model/subject');
const Student = require('../model/student');
const parent = require('../model/parent');
const userModel = require('../model/user');
const OrderModel = require('../model/order');
const catchAsync = require('../utils/catchAsync');
const successResponse = require('../utils/successResponse');

exports.GetDemoSchool = catchAsync(async (req, res, next) => {
	const { DEMO_SCHOOL_ID: schoolId } = process.env;

	if (!schoolId) {
		return next(new ErrorResponse('School ID is not defined', 500));
	}

	const school = await SchoolModel.findById(schoolId).lean();

	if (!school) return next(new ErrorResponse('No Demo school found', 404));

	res.status(200).json(SuccessResponse(school, 1));
});

exports.getAllSchool = catchAsync(async (req, res) => {
	let schoolsQuery;
	if (req.query.populateClassList) {
		schoolsQuery = new APIFeatures(
			SchoolModel.find({})
				.populate('institute', 'name profile_image')
				.populate('classList', '_id name')
				.populate({
					path: 'branch',
					populate: {
						path: 'city state country',
						select: 'city_name state_name country_name',
					},
					select: '-createdAt -updatedAt',
				})
				.lean(),
			req.body
		)
			.filter()
			.paginate()
			.sort();
	} else {
		schoolsQuery = new APIFeatures(
			SchoolModel.find({})
				.populate('institute', 'name profile_image')
				.populate({
					path: 'branch',
					populate: {
						path: 'city state country',
						select: 'city_name state_name country_name',
					},
					select: '-createdAt -updatedAt',
				})
				.lean(),
			req.query
		)
			.filter()
			.paginate()
			.sort();
	}
	const schools = await schoolsQuery.query;

	return res.json(successResponse(schools, schools.length));
});

exports.getSchoolsByState = CatchAsync(async (req, res, next) => {
	const schools = await SchoolModel.find({ state: req.params.id })
		.populate('city', 'city_name')
		.populate('institute', 'name profile_image')
		.populate({
			path: 'branch',
			populate: {
				path: 'city state country',
				select: 'city_name state_name country_name',
			},
			select: '-createdAt -updatedAt',
		})
		.select('schoolName school_Code');

	if (!schools) {
		return next(
			new ErrorResponse(`Schools not found for id ${req.params.id}`, 404)
		);
	}

	return res.status(200).json(SuccessResponse(schools, schools.length));
});

exports.newUpdate = async (req, res) => {
	try {
		const updatedData = [];
		const schools = await SchoolModel.find();
		const responeData = JSON.parse(JSON.stringify(schools));
		for (const element of responeData) {
			const result = await SchoolModel.findByIdAndUpdate(element._id, {
				newUpdate: req.body.newUpdate,
			});
			updatedData.push(result);
		}
		res.status(200).json({
			message: 'Version updated Successfully',
			records: updatedData.length,
		});
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

exports.getAllDataWithSchoolID = async (req, res) => {
	try {
		const obj = [];
		let isDataPresent = false;
		const schoolId = req.params.id;
		const getSchool = await SchoolModel.findById(req.params.id)
			.populate('classList institute', '_id name')
			.populate({
				path: 'branch',
				populate: {
					path: 'city state country',
					select: 'city_name state_name country_name',
				},
				select: '-createdAt -updatedAt',
			})
			.populate('institute', 'name profile_image')
			.select(
				' -subjectList -syllabusLis -__v -repository -createdAt -updatedAt'
			);
		if (getSchool) {
			for (const classId of getSchool.classList) {
				let mappedBoardData;
				let mappedSyllabusData;
				const mappedSubjectData = [];
				const subjectList = [];
				const body = {
					'repository.id': schoolId,
					'repository.mapDetails.classId': classId._id.toString(),
				};
				const boardData = await boardModel.find(body);
				if (boardData) {
					for (const board of boardData) {
						mappedBoardData = board;
					}
				}
				const syllabusData = await syllabusModel.find(body);
				if (syllabusData) {
					for (const syllabus of syllabusData) {
						mappedSyllabusData = syllabus;
					}
				}
				const subjectData = await subjectModel.find(body);
				if (subjectData) {
					for (const subject of subjectData) {
						mappedSubjectData.push(subject);
					}
				}

				if (mappedSubjectData && mappedSubjectData.length) {
					isDataPresent = true;
					for (const subj of mappedSubjectData) {
						const list = {
							subjectId: subj._id,
							subjectName: subj.name,
						};
						subjectList.push(list);
					}
				}

				const allData = {
					classId: classId._id,
					className: classId.name,
					boardId: mappedBoardData ? mappedBoardData._id : '',
					boardName: mappedBoardData ? mappedBoardData.name : '',
					syllabusId: mappedSyllabusData ? mappedSyllabusData._id : '',
					syllabusName: mappedSyllabusData ? mappedSyllabusData.name : '',
					subjectList,
				};
				obj.push(allData);
			}
		}

		res.status(200).json({
			message: 'success',
			status: 200,
			result: isDataPresent ? obj.length : 0,
			data: isDataPresent ? obj : [],
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.deleteAllMappingData = async (req, res) => {
	try {
		const obj = [];
		const schoolId = req.params.id;
		let getSchool = await SchoolModel.findById(req.params.id).select(
			' -subjectList -syllabusLis -__v -repository -createdAt -updatedAt'
		);
		if (getSchool) {
			getSchool = [getSchool];
			for (const ele of getSchool) {
				for (const classId of ele.classList) {
					const className = await classModel.findById(classId);
					const boardData = await boardModel.find({
						$and: [
							{ 'repository.id': schoolId },
							{ 'repository.mapDetails.classId': classId },
						],
					});
					for (const board of boardData) {
						const schoolData = board.repository.filter(
							ele2 => ele2.id === schoolId
						);
						if (schoolData && schoolData.length) {
							const classData = schoolData[0].mapDetails.filter(
								ele3 => ele3.classId === classId
							);
							schoolData[0].mapDetails = schoolData[0].mapDetails.filter(
								ele4 => ele4.classId != classId
							);
							if (classData && classData.length)
								await boardModel.findByIdAndUpdate(board._id, board);
						}
					}

					const syllabusData = await syllabusModel.find({
						$and: [
							{ 'repository.id': schoolId },
							{ 'repository.mapDetails.classId': classId },
						],
					});
					for (const syllabus of syllabusData) {
						const schoolData = syllabus.repository.filter(
							ele1 => ele1.id === schoolId
						);
						if (schoolData && schoolData.length) {
							const classData = schoolData[0].mapDetails.filter(
								ele1 => ele1.classId === classId
							);
							schoolData[0].mapDetails = schoolData[0].mapDetails.filter(
								ele1 => ele1.classId != classId
							);
							if (classData && classData.length)
								await syllabusModel.findByIdAndUpdate(syllabus._id, syllabus);
						}
					}
					const subjectData = await subjectModel.find({
						$and: [
							{ 'repository.id': schoolId },
							{ 'repository.mapDetails.classId': classId },
						],
					});
					for (const subject of subjectData) {
						const schoolData = subject.repository.filter(
							ele1 => ele.id === schoolId
						);
						if (schoolData && schoolData.length) {
							const classData = schoolData[0].mapDetails.filter(
								ele1 => (ele.classId = classId)
							);
							schoolData[0].mapDetails = schoolData[0].mapDetails.filter(
								ele1 => ele.classId != classId
							);
							if (classData && classData.length)
								await subjectModel.findByIdAndUpdate(subject._id, subject);
						}
					}
				}
			}
		}

		res.status(200).json({
			message: 'Mapped data deleted successfully',
			status: 200,
			data: null,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};
exports.getSchool = async (req, res) => {
	try {
		const getSchool = await SchoolModel.findById(req.params.id)
			.populate('country state city', 'country_name state_name city_name')
			.populate('institute', 'name profile_image')
			.populate({
				path: 'branch',
				populate: {
					path: 'city state country',
					select: 'city_name state_name country_name',
				},
				select: '-createdAt -updatedAt',
			})
			.populate(
				'classList',
				'_id name author description sequence_number createdBy'
			)
			.populate('sType', '_id stype');
		const responeData = JSON.parse(JSON.stringify(getSchool));
		if (responeData) {
			if (responeData.classList) {
				const obj = [];
				for (const element1 of responeData.classList) {
					const sessionList = [];
					if (element1) {
						const sectionName = await sectionModel.find({
							$and: [
								{ 'repository.id': req.params.id },
								{ class_id: element1._id },
							],
						});
						for (const sName of sectionName) {
							const studentCount = await Student.find({
								$and: [
									{ school_id: req.params.id },
									{ class: element1._id },
									{ section: sName._id },
								],
							});
							sessionList.push({
								name: sName.name,
								id: sName._id,
								studentCount: studentCount.length,
							});
						}
						obj.push({
							classId: element1._id,
							className: element1.name,
							author: element1.author,
							sequence_number: element1.sequence_number,
							description: element1.description,
							createdBy: element1.createdBy,
							section: sessionList,
						});
						responeData.classList = obj;
					}
				}
			}
			if (responeData._id) {
				const activityLength = await activityModel
					.find({ 'assignTo.school_id': responeData._id })
					.countDocuments();

				const activityPendingLength = await activityModel
					.find({
						'assignTo.school_id': responeData._id,
						status: { $regex: 'pending', $options: 'i' },
					})
					.countDocuments();

				const completeLength = activityLength - activityPendingLength;
				const avgData = (completeLength / activityLength) * 100;
				if (!avgData) {
					responeData.studentProgress = 0;
				} else {
					responeData.studentProgress = avgData;
				}
				responeData.classList = responeData.classList.sort(
					(a, b) => a.sequence_number - b.sequence_number
				);
			}

			for (let i = 0; i < responeData.classList.length; i++) {
				delete responeData.classList[i].sequence_number;
			}

			res.json({
				status: 200,
				data: [responeData],
			});
		} else {
			res.json({
				error: false,
				statuscode: 404,
				message: 'NO data found for this id',
				data: responeData,
			});
		}
	} catch (err) {
		res.json({
			status: 404,
			message: err.message,
		});
	}
};
// TODO: Need to manage attendance and assignment records.
/**
 * @param {array} studentList.
 */
exports.newPromote = catchAsync(async (req, res, next) => {
	const { studentList = [] } = req.body;
	if (studentList.length === 0) {
		res.status(422).json(new ErrorResponse('studentList is empty', 422));
	}
	const studentToUpdate = [];
	for (const student of studentList) {
		studentToUpdate.push({
			updateOne: {
				filter: { _id: mongoose.Types.ObjectId(student.id) },
				update: {
					$set: {
						class: mongoose.Types.ObjectId(student.class),
						section: mongoose.Types.ObjectId(student.section),
					},
				},
			},
		});
	}
	try {
		const updatedStudents = await StudentModel.bulkWrite(studentToUpdate);
		res
			.status(200)
			.json(
				SuccessResponse(null, updatedStudents.nModified, 'Updated SuccessFully')
			);
	} catch (err) {
		res.status(500).json(new ErrorResponse(err.message, 500));
	}
});
exports.promoteStudent = async (req, res) => {
	const { oldClass, newClass, isClass = true } = req.body;
	const { id } = req.params;
	if (!oldClass || !newClass) {
		return res
			.status(422)
			.json(new ErrorResponse('oldClass, newClass fields are required', 422));
	}
	let matchQuery = {
		school_id: id,
		class: oldClass,
	};
	let setPayload = { $set: { class: newClass } };
	if (!isClass) {
		matchQuery = {
			school_id: id,
			section: oldClass,
		};
		setPayload = { $set: { section: newClass } };
	}
	try {
		const result = await StudentModel.updateMany(matchQuery, setPayload);
		if (result.nModified === 0) {
			return res
				.status(404)
				.json(new ErrorResponse('No Students were Updated', 404));
		}
		res.status(200).json({
			message: 'Student Promoted',
			recordsModified: result.nModified,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err.message,
		});
	}
};
exports.sectionWiseProgress = async (req, res) => {
	try {
		const progress = await Student.aggregate([
			{
				$match: { school_id: mongoose.Types.ObjectId(req.body.school_id) },
			},
			{
				$group: {
					_id: {
						section: '$section',
						class: '$class',
					},
					assignmentAssigned: { $sum: '$assignment.assigned' },
					assignmentCompleted: { $sum: '$assignment.completed' },

					livepollAssigned: { $sum: '$livepoll.assigned' },
					livepollCompleted: { $sum: '$livepoll.completed' },

					checklistAssigned: { $sum: '$checklist.assigned' },
					checklistCompleted: { $sum: '$checklist.completed' },

					eventAssigned: { $sum: '$event.assigned' },
					eventCompleted: { $sum: '$event.completed' },

					announcementAssigned: { $sum: '$announcement.assigned' },
					announcementCompleted: { $sum: '$announcement.completed' },
				},
			},
		]);
		for (const ele of progress) {
			const assigned =
				ele.assignmentAssigned +
				ele.livepollAssigned +
				ele.checklistAssigned +
				ele.eventAssigned +
				ele.announcementAssigned;
			const completed =
				ele.assignmentCompleted +
				ele.livepollCompleted +
				ele.checklistCompleted +
				ele.eventCompleted +
				ele.announcementCompleted;
			const avg = !assigned ? 0 : (completed / assigned) * 100;
			ele.SectionProgress = avg;
		}
		res.status(201).json({
			status: 201,
			data: progress,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.createSchool = async (req, res) => {
	try {
		const newSchool = await SchoolModel.create(req.body);

		res.status(201).json({
			status: 201,
			data: {
				class: newSchool,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.getSchoolAndUpdateClassList = async (req, res) => {
	try {
		const schoolData = await SchoolModel.find();
		let updatedData = null;
		const obj = [];
		for (const element of schoolData) {
			element.classList.length = 0;
			updatedData = await SchoolModel.updateMany(
				{ _id: element._id },
				{
					classList: obj,
				}
			);
		}
		res.json({
			status: 200,
			results: schoolData.length,
			data: updatedData,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.updateSchool = async (req, res) => {
	try {
		let schoolUpdate = {};
		const schoolOldData = await SchoolModel.findById(req.params.id).populate(
			'institute',
			'name profile_image'
		);
		if (schoolOldData) {
			let { classList } = req.body;
			classList = classList.concat(
				schoolOldData.classList.map(val => val.toString())
			);
			classList = classList.filter(
				(value, index, array) => array.indexOf(value) === index
			);
			schoolOldData.classList = classList;
			schoolUpdate = await SchoolModel.findByIdAndUpdate(
				req.params.id,
				schoolOldData,
				{
					new: true,
					runValidators: true,
				}
			);
		}
		res.status(201).json({
			status: 'success',
			data: {
				schoolUpdate,
			},
		});
	} catch (err) {
		console.log('err', err);
		res.json({
			status: 404,
			message: err.message,
		});
	}
};

exports.UpdateLocationCoordinates = catchAsync(async (req, res, next) => {
	const { longitude, latitude, radius, startTime, loginTime, logoutTime } =
		req.body;

	if (!longitude || !latitude || !radius)
		return next(new ErrorResponse('Longitude & Latitude is required', 400));

	const foundSchool = await SchoolModel.findOne(
		{ _id: req.params.id },
		{ _id: 1, location: 1 }
	);

	if (!foundSchool) {
		return next(new ErrorResponse('School not found', 404));
	}

	foundSchool.location = {
		type: 'Point',
		coordinates: [longitude, latitude],
		radius,
	};
	foundSchool.startTime = startTime;
	foundSchool.loginTime = loginTime;
	foundSchool.logoutTime = logoutTime;

	await foundSchool.save();

	return res
		.status(201)
		.json(successResponse(foundSchool, 1, 'Successfully set the location'));
});

exports.updatePayment = async (req, res) => {
	try {
		const startdate = new Date(req.body.activateDate);
		startdate.setDate(startdate.getDate() + 30);
		const schoolUpdate = await SchoolModel.findByIdAndUpdate(
			req.params.id,
			{
				payment: {
					activeStatus: true,
					activateDate: req.body.activateDate,
					dueDate: startdate,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		res.status(201).json({
			status: 'success',
			data: {
				schoolUpdate,
			},
		});
	} catch (err) {
		console.log('err', err);
		res.json({
			status: 404,
			message: err.message,
		});
	}
};
exports.deteleSchool = async (req, res) => {
	try {
		await SchoolModel.findByIdAndDelete(req.params.id);
		res.json({
			status: 201,
			message: 'School deleted Successfully',
			data: null,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

function sumSameKeysInArr(inpData) {
	const data = inpData;
	Object.keys(data).forEach(key => {
		data[key] = data[key].reduce((acc, curr) => {
			if (curr.name === '') {
				curr.name = 'Unspecified';
			}
			const existing = acc.find(obj => obj.name === curr.name);
			if (!existing) {
				acc.push(curr);
			} else {
				existing.count += curr.count;
			}
			return acc;
		}, []);
	});
	return data;
}

exports.GetSchoolStats = catchAsync(async (req, res, next) => {
	const schoolId = req.params.id;
	const roleIds = await RoleModel.find({
		$or: [
			{ role_name: 'principal' },
			{ role_name: 'teacher' },
			{ role_name: 'management' },
		],
	}).select('_id role_name');
	const cacheKey = `school:stats:${schoolId}`;
	const cachedData = await redisClient.GET(cacheKey);

	let responseData = null;
	if (cachedData) {
		responseData = JSON.parse(cachedData);
	} else {
		const studStats = await StudentModel.aggregate([
			{
				$match: {
					school_id: mongoose.Types.ObjectId(schoolId),
				},
			},
			{
				$group: {
					_id: {
						school_id: '$school_id',
						gender: '$gender',
						blood_gr: '$blood_gr',
						mother_tongue: '$mother_tongue',
						mode_of_transp: '$mode_of_transp',
						medical_cond: '$medical_cond',
						wear_glasses: '$wear_glasses',
					},
					total: {
						$sum: 1,
					},
				},
			},
			{
				$group: {
					_id: '$_id.school_id',
					gender: {
						$push: {
							name: {
								$ifNull: ['$_id.gender', 'Unspecified'],
							},
							count: '$total',
						},
					},
					bloodGroup: {
						$push: {
							name: {
								$ifNull: ['$_id.blood_gr', 'Unspecified'],
							},
							count: '$total',
						},
					},
					motherTongue: {
						$push: {
							name: {
								$ifNull: ['$_id.mother_tongue', 'Unspecified'],
							},
							count: '$total',
						},
					},
					modeOfTransp: {
						$push: {
							name: {
								$ifNull: ['$_id.mode_of_transp', 'Unspecified'],
							},
							count: '$total',
						},
					},
					medicalCond: {
						$push: {
							name: {
								$ifNull: ['$_id.medical_cond', 'Unspecified'],
							},
							count: '$total',
						},
					},
					wearGlasses: {
						$push: {
							name: {
								$ifNull: ['$_id.wear_glasses', 'Unspecified'],
							},
							count: '$total',
						},
					},
				},
			},
		]);

		// const parentStats = await StudentModel.aggregate([
		// 	{
		// 		$match: {
		// 			school_id: mongoose.Types.ObjectId('6285dea9e5eff0eb57fc21ee'),
		// 		},
		// 	},
		// 	{
		// 		$group: {
		// 			_id: '$parent_id',
		// 			school_id: {
		// 				$first: '$school_id',
		// 			},
		// 		},
		// 	},
		// 	{
		// 		$lookup: {
		// 			from: 'parents',
		// 			localField: '_id',
		// 			foreignField: '_id',
		// 			as: 'parent',
		// 		},
		// 	},
		// 	{
		// 		$unwind: {
		// 			path: '$parent',
		// 		},
		// 	},
		// 	{
		// 		$group: {
		// 			_id: {
		// 				school_id: '$school_id',
		// 				f_occupation: '$parent.f_occupation',
		// 				m_occupation: '$parent.m_occupation',
		// 				g_occupation: '$parent.g_occupation',
		// 				f_qualification: '$parent.f_qualification',
		// 				m_qualification: '$parent.m_qualification',
		// 				g_qualification: '$parent.g_qualification',
		// 			},
		// 			total: {
		// 				$sum: 1,
		// 			},
		// 		},
		// 	},
		// 	{
		// 		$group: {
		// 			_id: '$_id.school_id',
		// 			f_occupation: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.f_occupation', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 			m_occupation: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.m_occupation', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 			g_occupation: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.g_occupation', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 			f_qualification: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.f_qualification', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 			m_qualification: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.m_qualification', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 			g_qualification: {
		// 				$push: {
		// 					name: {
		// 						$ifNull: ['$_id.g_qualification', 'Unspecified'],
		// 					},
		// 					count: '$total',
		// 				},
		// 			},
		// 		},
		// 	},
		// ]);

		const getRandomNum = max => {
			const min = 1;
			return Math.floor(Math.random() * (max - min + 1)) + min;
		};

		// TODO: Query real data after refactoring the parent model
		const parentStats = {
			Language_proficiency: [
				{
					name: 'Hindi',
					count: getRandomNum(20),
				},
				{
					name: 'English',
					count: getRandomNum(20),
				},
				{
					name: 'Kannada',
					count: getRandomNum(20),
				},
				{
					name: 'Unspecified',
					count: getRandomNum(50),
				},
			],
			occupation: [
				{
					name: 'Teacher',
					count: getRandomNum(20),
				},
				{
					name: 'Engineer',
					count: getRandomNum(20),
				},
				{
					name: 'Other',
					count: getRandomNum(20),
				},
				{
					name: 'Unspecified',
					count: getRandomNum(50),
				},
			],
			qualification: [
				{
					name: 'primary',
					count: getRandomNum(20),
				},
				{
					name: 'secondary',
					count: getRandomNum(20),
				},
				{
					name: 'higher secondary',
					count: getRandomNum(20),
				},
				{
					name: 'graduate',
					count: getRandomNum(20),
				},
				{
					name: 'post graduate',
					count: getRandomNum(20),
				},
				{
					name: 'other',
					count: getRandomNum(20),
				},
				{
					name: 'Unspecified',
					count: getRandomNum(50),
				},
			],
		};

		const userAggrQuery = [
			{
				$match: {
					school_id: mongoose.Types.ObjectId(schoolId),
				},
			},
			{
				$group: {
					_id: {
						school_id: '$school_id',
						religion: '$religion',
						blood_gr: '$blood_gr',
						mother_tongue: '$mother_tongue',
						marital_status: '$marital_status',
						qualification: '$qualification',
						experience: '$experience',
					},
					total: {
						$sum: 1,
					},
				},
			},
			{
				$group: {
					_id: '$_id.school_id',
					religion: {
						$push: {
							name: {
								$ifNull: ['$_id.religion', 'Unspecified'],
							},
							count: '$total',
						},
					},
					bloodGroup: {
						$push: {
							name: {
								$ifNull: ['$_id.blood_gr', 'Unspecified'],
							},
							count: '$total',
						},
					},
					motherTongue: {
						$push: {
							name: {
								$ifNull: ['$_id.mother_tongue', 'Unspecified'],
							},
							count: '$total',
						},
					},
					maritalStatus: {
						$push: {
							name: {
								$ifNull: ['$_id.marital_status', 'Unspecified'],
							},
							count: '$total',
						},
					},
					qualification: {
						$push: {
							name: {
								$ifNull: ['$_id.qualification', 'Unspecified'],
							},
							count: '$total',
						},
					},
					experience: {
						$push: {
							name: {
								$ifNull: ['$_id.experience', 'Unspecified'],
							},
							count: '$total',
						},
					},
				},
			},
		];

		const teacherAggrQuery = [...userAggrQuery];
		teacherAggrQuery[0].$match.role = mongoose.Types.ObjectId(
			roleIds.find(role => role.role_name === 'teacher')._id
		);
		const teacherStats = await userModel.aggregate(teacherAggrQuery);

		const managementAggrQuery = [...userAggrQuery];
		managementAggrQuery[0].$match.role = mongoose.Types.ObjectId(
			roleIds.find(role => role.role_name === 'management')._id
		);
		const managementStats = await userModel.aggregate(managementAggrQuery);

		const principalAggrQuery = [...userAggrQuery];
		principalAggrQuery[0].$match.role = mongoose.Types.ObjectId(
			roleIds.find(role => role.role_name === 'principal')._id
		);
		const princpalStats = await userModel.aggregate(principalAggrQuery);

		if (studStats.length) {
			delete studStats[0]._id;
		}
		if (teacherStats.length) {
			delete teacherStats[0]._id;
		}
		if (managementStats.length) {
			delete managementStats[0]._id;
		}
		if (princpalStats.length) {
			delete princpalStats[0]._id;
		}

		responseData = {
			student: sumSameKeysInArr({ ...studStats[0] }),
			parent: parentStats,
			teacher: sumSameKeysInArr({ ...teacherStats[0] }),
			management: sumSameKeysInArr({ ...managementStats[0] }),
			principal: sumSameKeysInArr({ ...princpalStats[0] }),
		};

		await redisClient.SET(cacheKey, JSON.stringify(responseData), {
			EX: 12 * 60 * 60,
		});
	}

	res.status(200).json(successResponse({ ...responseData }));
});

exports.orderSchool = async (req, res) => {
	try {
		const schoolData = await SchoolModel.findById(req.params.id)
			.populate({
				path: 'payment.orders',
			})
			.select('payment schoolName _id');
		const responeData = JSON.parse(JSON.stringify(schoolData));
		if (responeData.payment.orders && responeData.payment.orders.length > 0) {
			responeData.payment.orders.sort(
				(a, b) => new Date(a.created_at) - new Date(b.created_at)
			);
			let flag = false;
			for (const ele of responeData.payment.orders) {
				if (ele.status == 'created' && flag == false) {
					ele.canPay = true;
					flag = true;
				}
			}
		}
		res.json({
			status: 200,
			data: responeData,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.deleteSchoolData = async (req, res) => {
	try {
		await SchoolModel.findByIdAndDelete(req.params.id);
		const userData = await userModel.delete({ school_id: req.params.id });
		const studentData1 = await Student.find({ school_id: req.params.id });
		const responeData1 = JSON.parse(JSON.stringify(studentData1));

		const studentData = await Student.delete({ school_id: req.params.id });

		res.status(200).json({
			status: 201,
			message:
				'School deleted Successfully Along with Students Teachers and Principal',
			studentData,
			userData,
		});
	} catch (err) {
		res.status(404).json({
			status: 404,
			message: err,
		});
	}
};

exports.UpdatebranchCity = async (req, res, next) => {
	console.log('update id');
	try {
		const updatebranchCity = await SchoolModel.find();
		const cityList = await City.find().select(
			'-repository -state_id -createdAt -updatedAt -__v'
		);
		const stateList = await State.find().select(
			'-repository -country_id -createdAt -updatedAt -__v'
		);
		const countryList = await Country.find().select(
			'-repository -file_upload -createdAt -updatedAt -__v'
		);
		const boardList = await Board.find().select(
			'-repository -createdBy -updatedBy -description -createdAt -updatedAt -__v'
		);
		const stypeList = await Stype.find().select(' -createdAt -updatedAt -__v');
		for (const elmentcity of updatebranchCity) {
			if (elmentcity.city) {
				for (const city of cityList) {
					if (elmentcity.city == city.city_name) {
						elmentcity.city = city._id;
					}
					elmentcity.branch.forEach(element => {
						if (element) {
							if (element.city == city.city_name) {
								element.city = city._id;
							}
						}
					});
				}
			}
			if (elmentcity.state) {
				for (const state of stateList) {
					if (elmentcity.state == state.state_name) {
						elmentcity.state = state._id;
					}
					elmentcity.branch.forEach(element => {
						if (element) {
							if (element.state == state.state_name) {
								element.state = state._id;
							}
						}
					});
				}
			}
			if (elmentcity.country) {
				for (const country of countryList) {
					if (elmentcity.country == country.state_name) {
						elmentcity.country = country._id;
					}
					elmentcity.branch.forEach(element => {
						if (element) {
							if (element.country == country.state_name) {
								element.country = country._id;
							}
						}
					});
				}
			}
			if (elmentcity.board) {
				for (const board of boardList) {
					if (elmentcity.board == board.name) {
						elmentcity.board = board._id;
					}
				}
			}
			if (elmentcity.sType) {
				for (const stype of stypeList) {
					if (elmentcity.sType == stype.stype) {
						elmentcity.sType = stype._id;
					}
				}
			}
		}
		for (const element of updatebranchCity) {
			const newdata = await SchoolModel.updateOne(
				{ _id: element._id },
				element
			);
		}

		res.status(200).json({
			status: 'success',
			data: updatebranchCity,
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.getSchoolClassAndSection = catchAsync(async (req, res) => {
	const getSchool = await SchoolModel.find({ studSignup: true }).select('_id');
	const schools = getSchool.map(ele => ele.id);
	const school = await sectionModel.aggregate([
		{
			$match: {
				'repository.0.id': {
					$in: schools,
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					class_id: '$class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$class_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'class_id',
			},
		},
		{
			$unwind: {
				path: '$class_id',
				includeArrayIndex: 'string',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$unwind: {
				path: '$repository',
				includeArrayIndex: 'string',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					school_id: {
						$toObjectId: '$repository.id',
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$school_id'],
							},
						},
					},
					{
						$project: {
							schoolImage: 1,
							schoolName: 1,
							school_code: 1,
						},
					},
				],
				as: 'class_id.school_id',
			},
		},
		{
			$unwind: {
				path: '$class_id.school_id',
				includeArrayIndex: 'string',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$class_id',
				sections: {
					$push: {
						_id: '$_id',
						name: '$name',
					},
				},
			},
		},
		{
			$group: {
				_id: '$_id.school_id',
				classes: {
					$push: {
						_id: '$_id._id',
						name: '$_id.name',
						sections: '$sections',
					},
				},
			},
		},
		{
			$match: {
				_id: {
					$ne: null,
				},
			},
		},
	]);
	return res.json(successResponse(school, school.length));
});

exports.getSchoolAllData = async (req, res) => {
	try {
		const mainObj = [];
		const getSchool = await SchoolModel.find()
			.populate('institute', 'name profile_image')
			.populate('city state country', 'city_name state_name country_name')
			.populate('classList', 'name')
			.populate({
				path: 'branch',
				populate: {
					path: 'city state country',
					select: 'city_name state_name country_name',
				},
				select: '-createdAt -updatedAt',
			})
			.populate({
				path: 'payment.orders',
			})
			.select(
				' -subjectList -syllabusLis -__v -repository -createdAt -updatedAt'
			);
		if (getSchool) {
			// const city = '';
			// const country = '';
			// const state = '';
			const responeData1 = JSON.parse(JSON.stringify(getSchool));
			for (const responeData of responeData1) {
				if (
					responeData.payment.orders &&
					responeData.payment.orders.length > 0
				) {
					responeData.payment.orders.sort(
						(a, b) => new Date(a.created_at) - new Date(b.created_at)
					);
					let flag = false;
					for (const ele of responeData.payment.orders) {
						if (ele.status == 'created' && flag == false) {
							responeData.payment.status = true;
							flag = true;
						}
					}
				}
				// if (!responeData.schoolImage) responeData.schoolImage = '';
				// if (responeData.branch) {
				// 	for (const element1 of responeData.branch) {
				// 		if (element1) {
				// 			if (element1.branchCountryId) {
				// 				if (element1.branchCountryId.length == 24) {
				// 					const branchCountry = await Country.findById(
				// 						element1.branchCountryId
				// 					).select('-repository -state_id -_id');
				// 					if (branchCountry) {
				// 						element1.branchCountry = branchCountry.country_name;
				// 					}
				// 				}
				// 			}
				// 			if (element1.branchStateId) {
				// 				if (element1.branchStateId.length == 24) {
				// 					const branchState = await State.findById(
				// 						element1.branchStateId
				// 					).select('-repository -state_id -_id');
				// 					if (branchState) {
				// 						element1.branchState = branchState.state_name;
				// 					}
				// 				}
				// 			}
				// 			if (element1.branchCityId) {
				// 				if (element1.branchCityId.length == 24) {
				// 					const branchCity = await City.findById(
				// 						element1.branchCityId
				// 					).select('-repository -state_id');
				// 					if (branchCity) {
				// 						element1.branchCity = branchCity.city_name;
				// 					}
				// 				}
				// 			}
				// 		}
				// 	}
				// }

				// if (responeData.classList) {
				// 	const obj = [];
				// 	responeData.classList = split(responeData.classList);
				// 	for (const element1 of responeData.classList) {
				// 		console.log('element1', element1);
				// 		const className = await classModel
				// 			.findById(element1.value)
				// 			.select(
				// 				'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
				// 			);
				// 		if (className) {
				// 			obj.push({
				// 				classId: className._id,
				// 				className: className.name,
				// 			});
				// 		}
				// 		responeData.classList = obj;
				// 	}
				// }

				// if (responeData.city) {
				// 	if (responeData.city.length == 24) {
				// 		city = await City.findById(responeData.city).select(
				// 			'-repository -state_id'
				// 		);
				// 		if (city) {
				// 			responeData.cityName = city.city_name;
				// 			console.log('responeData.cityName', responeData.cityName);
				// 		}
				// 	}
				// }
				// if (responeData.country) {
				// 	if (responeData.country.length == 24) {
				// 		country = await Country.findById(responeData.country).select(
				// 			'-repository -state_id -_id'
				// 		);
				// 		if (country) {
				// 			responeData.countryName = country.country_name;
				// 			console.log('responeData.countryName', responeData.countryName);
				// 		}
				// 	}
				// }
				// if (responeData.state) {
				// 	if (responeData.state.length == 24) {
				// 		state = await State.findById(responeData.state).select(
				// 			'-repository -state_id -_id'
				// 		);
				// 		if (state) {
				// 			responeData.stateName = state.state_name;
				// 			console.log('responeData.stateName', responeData.stateName);
				// 		}
				// 	}
				// }
				const userData = await userModel.find({
					school_id: responeData._id,
					profile_type: { $ne: '5fd1c4f6ba54044664ff8c0d' },
				});
				const studentData = await Student.find({
					school_id: responeData._id,
				});
				if (
					(userData && userData.length) ||
					(studentData && studentData.length)
				) {
					responeData.isOnboarded = true;
				} else {
					responeData.isOnboarded = false;
				}

				mainObj.push(responeData);
				// console.log('responeData', responeData);
			}
			// console.log('responeData');
			res.status(200).json({
				data: responeData1,
			});
		} else {
			res.status(422).json({
				error_code: '01',
				error_description: 'No Data FOUND',
			});
		}
	} catch (err) {
		console.log(err);
		res.json({
			data: err,
		});
	}
};

exports.newfilter = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		SchoolModel.find()
			.populate('city state country', 'city_name state_name country_name')
			.populate('institute', 'name profile_image')
			.populate({
				path: 'branch',
				populate: {
					path: 'city state country',
					select: 'city_name state_name country_name',
				},
				select: '-createdAt -updatedAt',
			})
			.select('-subjectList -syllabusList -__v -repository'),
		req.body
	)
		.filter()
		.sort()
		.limitFields()
		.paginate();
	let getSchool = await features.query;
	getSchool = JSON.parse(JSON.stringify(getSchool));
	if (!getSchool) {
		return res.status(404).json(new ErrorResponse(404, 'No Records Found'));
	}
	res
		.status(200)
		.json(SuccessResponse(getSchool, getSchool.length, 'Fetched SuccessFully'));
});

exports.filter = async (req, res) => {
	try {
		const mainObj = [];
		const features = new APIFeatures(
			SchoolModel.find()
				.populate('institute', 'name profile_image')
				.populate({
					path: 'branch',
					populate: {
						path: 'city state country',
						select: 'city_name state_name country_name',
					},
					select: '-createdAt -updatedAt',
				})
				.select(
					'-subjectList -syllabusList -classList -__v -repository -createdAt -updatedAt -_id -schoolName -address -country -state -city -email -pincode -webSite -contact_number -sType -school_code'
				),
			req.body
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const getSchool = await features.query;

		if (getSchool) {
			// const city = '';
			// const country = '';
			// const state = '';
			const responeData1 = JSON.parse(JSON.stringify(getSchool));
			for (const responeData of responeData1) {
				// if (responeData.branch) {
				// 	for (const element1 of responeData.branch) {
				// 		if (element1) {
				// 			if (element1.branchCountryId) {
				// 				if (element1.branchCountryId.length == 24) {
				// 					const branchCountry = await Country.findById(
				// 						element1.branchCountryId
				// 					).select('-repository -state_id -_id');
				// 					if (branchCountry) {
				// 						element1.branchCountry = branchCountry.country_name;
				// 					}
				// 				}
				// 			}
				// 			if (element1.branchStateId) {
				// 				if (element1.branchStateId.length == 24) {
				// 					const branchState = await State.findById(
				// 						element1.branchStateId
				// 					).select('-repository -state_id -_id');
				// 					if (branchState) {
				// 						element1.branchState = branchState.state_name;
				// 					}
				// 				}
				// 			}
				// 			if (element1.branchCityId) {
				// 				if (element1.branchCityId.length == 24) {
				// 					const branchCity = await City.findById(
				// 						element1.branchCityId
				// 					).select('-repository -state_id');
				// 					if (branchCity) {
				// 						element1.branchCity = branchCity.city_name;
				// 					}
				// 				}
				// 			}
				// 		}
				// 	}
				// }
				mainObj.push(responeData);
			}
			console.log('responeData');
			res.status(200).json({
				result: mainObj[0].branch.length,
			});
		} else {
			res.status(422).json({
				error_code: '01',
				error_description: 'No Data FOUND',
			});
		}
	} catch (err) {
		console.log(err);
		res.json({
			data: err,
		});
	}
};

exports.getSchoolById = async (req, res) => {
	try {
		const getSchool = await SchoolModel.findById(req.params.id)
			.populate('institute', 'name profile_image')
			.populate('city state country', 'city_name state_name country_name')
			.populate('sType', 'stype')
			.populate('classList', 'name')
			.populate({
				path: 'branch',
				populate: {
					path: 'city state country',
					select: 'city_name state_name country_name',
				},
				select: '-createdAt -updatedAt',
			})
			.select(' -subjectList -syllabusLis -__v -repository -updatedAt');
		if (getSchool) {
			const oldDate = new Date('2021-04-08T11:49:39.948Z');
			if (oldDate < getSchool.createdAt) {
				// const city = '';
				// const country = '';
				// const state = '';
				// const stype = '';
				const responeData = JSON.parse(JSON.stringify(getSchool));
				// if (responeData.branch) {
				// 	responeData.branch.filter(async element1 => {
				// 		if (element1.branchCountryId) {
				// 			const branchCountry = await Country.findById(
				// 				element1.branchCountryId
				// 			).select('-repository -state_id -_id');
				// 			element1.branchCountry = branchCountry.country_name;
				// 		}
				// 		if (element1.branchStateId) {
				// 			const branchState = await State.findById(
				// 				element1.branchStateId
				// 			).select('-repository -state_id -_id');
				// 			element1.branchState = branchState.state_name;
				// 		}
				// 		if (element1.branchCityId) {
				// 			const branchCity = await City.findById(
				// 				element1.branchCityId
				// 			).select('-repository -state_id');
				// 			element1.branchCity = branchCity.city_name;
				// 		}
				// 	});
				// }

				// if (responeData.classList) {
				// 	const obj = [];
				// 	responeData.classList = split(responeData.classList);
				// 	responeData.classList.filter(async element1 => {
				// 		const className = await classModel
				// 			.findById(element1.value)
				// 			.select(
				// 				'-repository -state_id -createdBy -createdAt -updatedAt -description -__v'
				// 			);
				// 		obj.push({
				// 			classId: className._id,
				// 			className: className.name,
				// 		});
				// 		responeData.classList = obj;
				// 	});
				// }

				// if (responeData.city) {
				// 	if (responeData.city.length == 24) {
				// 		city = await City.findById(responeData.city).select(
				// 			'-repository -state_id'
				// 		);
				// 	} else {
				// 		city = await City.find({ city_name: responeData.city }).select(
				// 			'-repository -state_id'
				// 		);
				// 	}
				// }
				// if (responeData.country) {
				// 	if (responeData.country.length == 24) {
				// 		country = await Country.findById(responeData.country).select(
				// 			'-repository -state_id -_id'
				// 		);
				// 	} else {
				// 		country = await Country.find({
				// 			country_name: responeData.country,
				// 		}).select('-repository -state_id -_id');
				// 	}
				// }
				// if (responeData.state) {
				// 	if (responeData.state.length == 24) {
				// 		state = await State.findById(responeData.state).select(
				// 			'-repository -state_id -_id'
				// 		);
				// 	} else {
				// 		state = await State.find({ state_name: responeData.state }).select(
				// 			'-repository -state_id -_id'
				// 		);
				// 	}
				// }
				// if (responeData.sType) {
				// 	if (responeData.sType.length == 24) {
				// 		stype = await Stype.findById(responeData.sType).select(
				// 			' -createdAt -updatedAt -__v'
				// 		);
				// 	} else {
				// 		stype = await Stype.find({ stype: responeData.sType }).select(
				// 			' -createdAt -updatedAt -__v'
				// 		);
				// 	}
				// }
				// const schoolData = responeData;
				const schoolData = {
					...responeData,
					// countryName: city.city_name || '',
					// stateName: state.state_name || '',
					// cityName: country.country_name || '',
					// stypeName: stype.stype || '',
				};
				res.status(200).json({
					data: [schoolData],
				});
			} else {
				res.status(422).json({
					error_code: '03',
					error_description: 'You try to access old data',
				});
			}
		} else {
			res.status(422).json({
				error_code: '01',
				error_description: 'No Data FOUND',
			});
		}
	} catch (err) {
		console.log(err);
		res.json({
			data: err,
		});
	}
};

exports.addSchool = async (req, res) => {
	try {
		const contact_number = Number(req.body.SchoolContactNumber);
		const schoolId = new mongoose.Types.ObjectId();
		const isExist = await SchoolModel.findOne({ contact_number });
		if (isExist) {
			return res
				.status(400)
				.json(new ErrorResponse(400, 'School Already exist with this number'));
		}
		const branchList = [];
		if (req.body.Branch) {
			for (const ele of req.body.Branch) {
				const newBranch = new BranchModel({
					_id: new mongoose.Types.ObjectId(),
					school_id: schoolId,
					name: ele.Name,
					address: ele.Address,
					contact: ele.Contact,
					pincode: ele.branchPincode,
					email: ele.email,
					city: ele.branchCityId,
					state: ele.branchStateId,
					country: ele.branchCountryId,
					createdBy: req.body.createdBy,
					updatedBy: req.body.updatedBy,
				});
				await newBranch
					.save()
					.then(result => {
						branchList.push(result._id.toString());
					})
					.catch(err => {
						res.json({
							error: err.message,
							status: 411,
						});
					});
			}
			const createSchool = new SchoolModel({
				_id: schoolId,
				schoolName: req.body.schoolName,
				address: req.body.address,
				country: req.body.countryId,
				state: req.body.stateId,
				city: req.body.cityId,
				email: req.body.schoolEmail,
				smsActivated: req.body.smsActivated,
				pincode: req.body.pincode,
				webSite: req.body.schoolWebsite,
				contact_number: req.body.SchoolContactNumber,
				sType: req.body.institutionTypeId,
				branch: branchList,
			});
			createSchool
				.save()
				.then(result => {
					res.status(200).json({
						data: {
							result,
							msg: 'Institution added successfully',
							schoolId: result._id,
							school_code: result.school_code,
						},
					});
				})
				.catch(err => {
					res.status(422).json({
						data: err.message,
					});
				});
		} else {
			const createSchool = new SchoolModel({
				_id: schoolId,
				schoolName: req.body.schoolName,
				contact_number: req.body.SchoolContactNumber,
				email: req.body.SchoolEmail,
				smsActivated: req.body.smsActivated,
				country: req.body.countryId,
				state: req.body.stateId,
				city: req.body.cityId,
			});
			createSchool
				.save()
				.then(result => {
					res.status(200).json({
						data: {
							result,
							msg: 'Institution added successfully',
							schoolId: result._id,
							school_code: result.school_code,
						},
					});
				})
				.catch(err => {
					res.status(422).json({
						data: err.message,
					});
				});
		}
	} catch (err) {
		res.status(400).json({
			data: err.message,
		});
	}
};

exports.updateSchoolData = catchAsync(async (req, res, next) => {
	const school = await SchoolModel.findByIdAndUpdate(
		{
			_id: req.params.id,
		},
		{ ...req.body },
		{ new: true }
	);

	if (!school) {
		return next(new ErrorResponse('School update failed', 404));
	}

	res
		.status(201)
		.json(SuccessResponse(school, 1, 'School updated successfully'));
});

exports.getAllUpdateSchoolCode = async (req, res, next) => {
	try {
		const schoolData = await SchoolModel.find().populate(
			'institute',
			'name profile_image'
		);
		const responeData = JSON.parse(JSON.stringify(schoolData));
		let i = 1000;
		for (const element of responeData) {
			if (!element.school_code) {
				element.school_code = i;
			}
			const updateExam = await SchoolModel.findOneAndUpdate(
				{
					_id: element._id,
				},
				element
			);
			i += 1;
		}
		res.status(200).json({
			status: 'success',
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.deleteParentAndStudentFromSchoolId = async (req, res, next) => {
	try {
		const { userDeleteFlag } = req.body;
		const { studentDeleteFlag } = req.body;
		const { parentDeleteFlag } = req.body;
		if (studentDeleteFlag)
			await Student.delete({
				school_id: mongoose.Types.ObjectId(req.body.schoolId),
			});
		if (parentDeleteFlag)
			await parent.deleteMany({ 'repository.id': req.body.schoolId });
		if (userDeleteFlag)
			await userModel.delete({
				school_id: mongoose.Types.ObjectId(req.body.schoolId),
			});

		res.status(200).json({
			status: 'delete successfully',
		});
	} catch (error) {
		res.json({
			status: 400,
			message: error.message,
		});
	}
};

exports.getMapDetail = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const subjectData = await sectionModel.aggregate([
		{
			$match: {
				school: mongoose.Types.ObjectId(id),
			},
		},
		{
			$project: {
				name: 1,
				class_id: 1,
				board: 1,
				syllabus: 1,
				subjectList: 1,
			},
		},
		{
			$lookup: {
				from: 'classes',
				let: {
					id: '$class_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$id'],
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
				as: 'class_id',
			},
		},
		{
			$unwind: '$class_id',
		},
		{
			$lookup: {
				from: 'boards',
				let: {
					id: '$board',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$id'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'board_id',
			},
		},
		{
			$unwind: '$board_id',
		},
		{
			$lookup: {
				from: 'syllabuses',
				let: {
					id: '$syllabus',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$id'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'syllabus_id',
			},
		},
		{
			$unwind: '$syllabus_id',
		},
		{
			$project: {
				name: 1,
				sequence_number: '$class_id.sequence_number',
				classId: '$class_id._id',
				className: '$class_id.name',
				boardId: '$board_id._id',
				boardName: '$board_id.name',
				syllabusId: '$syllabus_id._id',
				syllabusName: '$syllabus_id.name',
				subjectList: 1,
			},
		},
		{
			$sort: {
				sequence_number: 1,
			},
		},
	]);
	subjectData.forEach(ele => {
		ele.className = `${ele.className} ${ele.name}`;
		delete ele.name;
	});
	if (!subjectData.length) {
		return res.status(404).json(new ErrorResponse(404, 'No mapping found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(subjectData, subjectData.length, 'Successfully Fetched')
		);
});

exports.updateActiveStatus = async (req, res, next) => {
	try {
		const promise = [];
		const { repositoryId } = req.body;
		const { activeStatus } = req.body;
		if (repositoryId) {
			// block all users
			promise.push(
				SchoolModel.find({ _id: mongoose.Types.ObjectId(repositoryId) }).update(
					{ activeStatus }
				)
			);
			promise.push(
				Student.updateMany({ school_id: repositoryId }, { activeStatus })
			);
			promise.push(
				parent.updateMany({ 'repository.id': repositoryId }, { activeStatus })
			);
			promise.push(
				userModel.delete({ school_id: repositoryId }, { activeStatus })
			);

			Promise.all(promise);
			res.status(200).json({
				message: "School's status updated successfully",
			});
		}
	} catch (error) {
		console.log('error', error);
		res.status(500).json({
			message: error.message,
		});
	}
};
exports.updateClassInSchoolCollection = async (req, res, next) => {
	try {
		const schoolList = await SchoolModel.find().populate(
			'institute',
			'name profile_image'
		);
		for (const school of schoolList) {
			let classList = [];
			let students = await Student.find({ school_id: school.id });
			if (students && students.length) {
				students = JSON.parse(JSON.stringify(students));
				for (const student of students) {
					classList.push(student.class);
				}
				classList = classList.filter(
					(value, index, array) => array.indexOf(value) === index
				);
				school.classList = classList;
				const schoolUpdate = await SchoolModel.findByIdAndUpdate(
					school.id,
					school,
					{
						new: true,
						runValidators: true,
					}
				);
			}
			console.log('students', students);
		}
		console.log('completed');
		res.status(300).json({
			message: 'completed',
		});
	} catch (error) {
		console.log('error', error);
		res.status(500).json({
			message: error.message,
		});
	}
};
exports.paymentStatistics = catchAsync(async (req, res, next) => {
	const data = await OrderModel.aggregate([
		{
			$match: {
				created_at: {
					$gte: new Date(req.body.start_date),
					$lte: new Date(req.body.end_date),
				},
			},
		},
		{
			$group: {
				_id: null,
				// data: {
				// 	$push: '$$ROOT',
				// },
				paid_schools: {
					$sum: {
						$cond: {
							if: {
								$eq: ['$status', 'Paid'],
							},
							then: 1,
							else: 0,
						},
					},
				},
				unpaid_schools: {
					$sum: {
						$cond: {
							if: {
								$ne: ['$status', 'Paid'],
							},
							then: 1,
							else: 0,
						},
					},
				},
				received_amount: {
					$sum: {
						$cond: {
							if: {
								$eq: ['$status', 'Paid'],
							},
							then: '$amount_paid',
							else: 0,
						},
					},
				},
				pending_amount: {
					$sum: {
						$cond: {
							if: {
								$ne: ['$status', 'Paid'],
							},
							then: '$amount_due',
							else: 0,
						},
					},
				},
				attempts: {
					$sum: {
						$cond: {
							if: {
								$eq: ['$status', 'Attempted'],
							},
							then: 1,
							else: 0,
						},
					},
				},
			},
		},
	]);
	if (data[0]) {
		delete data[0]._id;
		res.status(200).json(SuccessResponse(data[0], 1, 'fetched successfully'));
	}
	res.status(200).json(SuccessResponse([], 0, 'no data found successfully'));
});

exports.SelfSignupSchools = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		SchoolModel.find({}).select('schoolName schoolImage'),
		req.query
	)
		.filter()
		.paginate()
		.sort();
	const schoolDetails = await features.query;
	if (!schoolDetails) {
		return res.status(404).json(new ErrorResponse(404, 'No schools Found'));
	}
	res
		.status(200)
		.json(
			SuccessResponse(
				schoolDetails,
				schoolDetails.length,
				'Successfully fetched'
			)
		);
});

exports.updateSignup = catchAsync(async (req, res, next) => {
	const { school_id, userSignup, studSignup } = req.body;
	const payload = {};
	userSignup == true || userSignup == false
		? (payload.userSignup = userSignup)
		: null;
	studSignup == true || studSignup == false
		? (payload.studSignup = studSignup)
		: null;

	const result = await SchoolModel.updateOne(
		{ _id: school_id },
		{
			$set: payload,
		},
		{
			new: true,
		}
	);
	if (!result) {
		return res.status(404).json(new ErrorResponse('404', 'No Records Found'));
	}
	res.status(200).json({
		isSucess: true,
		message: 'Updated Successfully',
	});
});

exports.UpdateRequestStatus = catchAsync(async (req, res, next) => {
	const { userId, status } = req.body;

	if (!userId || !status) {
		return next(new ErrorResponse('User id and status is required', 400));
	}

	const user =
		(await userModel.updateOne(
			{ _id: userId, withProfileStatus: 'PENDING' },
			{ profileStatus: status.toUpperCase() },
			{ new: true, runValidators: true }
		)) ||
		(await parent.updateOne(
			{ _id: userId, withProfileStatus: 'PENDING' },
			{ profileStatus: status.toUpperCase() },
			{ new: true, runValidators: true }
		)) ||
		(await StudentModel.updateOne(
			{ _id: userId, withProfileStatus: 'PENDING' },
			{ profileStatus: status.toUpperCase() },
			{ new: true, runValidators: true }
		));

	if (!user) {
		return next(new ErrorResponse('User not found', 404));
	}

	res.status(200).json(successResponse(user, 1, 'User updated successfully'));
});
