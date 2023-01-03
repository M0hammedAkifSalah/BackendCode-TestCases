/* eslint-disable no-unused-expressions */
const mongoose = require('mongoose');
const SectionModel = require('../model/section');
const userModel = require('../model/user');
const studentModel = require('../model/student');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const SchoolModel = require('../model/school');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.getAllSection = async (req, res) => {
	try {
		let features;
		if (req.query.populateFields) {
			features = new APIFeatures(
				SectionModel.find({})
					.populate('class_id', '_id name sequence_number')
					.populate('school', '_id schoolName'),
				{}
			)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		} else {
			features = new APIFeatures(SectionModel.find({}), req.query)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		}
		const sectionData = await features.query;
		res.status(200).json({
			status: 200,
			results: sectionData.length,
			data: sectionData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.dashboard = catchAsync(async (req, res, next) => {
	let sectionList = await SectionModel.aggregate([
		{
			$group: {
				_id: {
					class_id: '$class_id',
					school_id: '$school',
				},
				sectionList: {
					$push: '$name',
				},
			},
		},
		{
			$lookup: {
				from: 'classes',
				localField: '_id.class_id',
				foreignField: '_id',
				as: 'class',
			},
		},
		{
			$lookup: {
				from: 'schools',
				localField: '_id.school_id',
				foreignField: '_id',
				as: 'school',
			},
		},
		{
			$project: {
				_id: 0,
				className: {
					$first: '$class.name',
				},
				schoolName: {
					$first: '$school.schoolName',
				},
				sectionList: 1,
			},
		},
		{
			$sort: {
				schoolName: 1,
			},
		},
	]);
	if (sectionList.length == 0) {
		return res.status(404).json(new ErrorResponse('No Sections Found', 404));
	}
	sectionList = sectionList.filter(el => el.schoolName);
	res
		.status(200)
		.json(SuccessResponse(sectionList, sectionList.length, 'Success'));
});
exports.getSection = async (req, res) => {
	try {
		const getSection = await SectionModel.findById(req.params.id);
		res.json({
			status: 200,
			data: getSection,
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};

exports.getSubMapping = catchAsync(async (req, res, next) => {
	const { school, class_id } = req.query;
	const payload = {};
	payload.school = mongoose.Types.ObjectId(school);
	class_id ? (payload.class_id = mongoose.Types.ObjectId(class_id)) : null;
	const result = await SectionModel.aggregate([
		{
			$match: payload,
		},
		{
			$unwind: '$subjectList',
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
				as: 'board',
			},
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
				as: 'syllabus',
			},
		},
		{
			$group: {
				_id: {
					school: '$school',
					class_id: '$class_id',
				},
				board: {
					$first: '$board',
				},
				syllabus: {
					$first: '$syllabus',
				},
				subjectList: {
					$addToSet: {
						subId: '$subjectList.subject_id',
						name: '$subjectList.name',
					},
				},
			},
		},
		{
			$unwind: '$board',
		},
		{
			$unwind: '$syllabus',
		},
	]);
	if (!result) {
		return res.status(404).json(new ErrorResponse(404, 'No records found'));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Fetched Successfully'));
});

exports.createSection = async (req, res) => {
	try {
		const data = req.body;
		const schoolId = req.body.School_id;
		const boardId = req.body.board_id;
		const syllabusId = req.body.syllabus_id;
		let newObj = {};
		let resMessage;
		const classData = data.data;
		for (const clsData of classData) {
			const classId = clsData.class_id;
			const sectionData = clsData.sectionList;
			const getSection = await SectionModel.find({
				$and: [{ class_id: classId }, { 'repository.id': schoolId }],
			});
			let duplicateId;
			if (getSection.length > 0) {
				for (const ele of clsData.sectionList) {
					for (const ele2 of getSection) {
						if (
							ele.name.toLowerCase().trim() == ele2.name.toLowerCase().trim()
						) {
							duplicateId = null;
							break;
						} else {
							duplicateId = ele;
						}
					}
					if (duplicateId) {
						newObj = new SectionModel({
							_id: mongoose.Types.ObjectId(),
							repository: { id: schoolId },
							school_id: schoolId,
							board_id: ele.boardId,
							syllabus_id: ele.syllabusId,
							class_id: clsData.class_id,
							name: ele.name,
							description: ele.desc,
							subjectList: ele.subjectList,
						});
						await newObj.save();
					}
				}
				resMessage = 'created';
			} else {
				for (const ele2 of clsData.sectionList) {
					newObj = new SectionModel({
						_id: mongoose.Types.ObjectId(),
						repository: { id: schoolId },
						school_id: schoolId,
						board_id: ele2.boardId,
						syllabus_id: ele2.syllabusId,
						class_id: clsData.class_id,
						name: ele2.name,
						description: ele2.desc,
						subjectList: ele2.subjectList,
					});
					await newObj.save();
				}
				resMessage = 'Section created';
			}
		}
		return res.status(201).json({
			status: 201,
			data: resMessage,
			newObj,
		});
	} catch (err) {
		console.log(err);
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.create = catchAsync(async (req, res) => {
	const created = [];
	const notCreated = [];
	let subjectArr;
	const { sectionList, school_id } = req.body;
	for (const ele of sectionList) {
		subjectArr = ele.subjectList.map(obj => ({
			_id: mongoose.Types.ObjectId(),
			subject_id: obj._id,
			name: obj.name,
		}));
		const isClass = await SchoolModel.findOne({
			_id: mongoose.Types.ObjectId(school_id),
			classList: mongoose.Types.ObjectId(ele.class_id),
		});
		if (isClass === null) {
			await SchoolModel.updateOne(
				{ _id: mongoose.Types.ObjectId(school_id) },
				{
					$push: {
						classList: mongoose.Types.ObjectId(ele.class_id),
					},
				}
			);
		}
		const isExists = await SectionModel.findOne({
			name: ele.name,
			class_id: ele.class_id,
			'repository.id': school_id,
		});
		if (isExists === null) {
			await SectionModel.create({
				_id: mongoose.Types.ObjectId(),
				repository: { id: school_id },
				school: school_id,
				name: ele.name,
				description: ele.desc,
				class_id: ele.class_id,
				board: ele.board_id,
				syllabus: ele.syllabus_id,
				subjectList: subjectArr,
			});
			created.push({ name: ele.name, msg: 'Created' });
		} else {
			for (const sub of subjectArr) {
				const isSubMapped = await SectionModel.find({
					_id: isExists._id,
					'subjectList.subject_id': sub.subject_id,
				});
				if (!isSubMapped.legnth) {
					await SectionModel.updateOne(
						{ _id: isExists._id },
						{
							$push: {
								subjectList: sub,
							},
						}
					);
				}
			}
			notCreated.push({ name: ele.name, msg: 'section already exists' });
		}
	}
	res.status(200).json({
		isSuccess: true,
		created,
		notCreated,
	});
});

exports.updateSection = async (req, res) => {
	try {
		const sectionUpdate = await SectionModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);

		res.status(201).json({
			status: 'success',
			data: {
				sectionUpdate,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};
exports.mapSubject = catchAsync(async (req, res) => {
	const { section_id } = req.body;
	const { id, name } = req.body.subject;
	const isMapped = await SectionModel.findOne({
		_id: mongoose.Types.ObjectId(section_id),
		'subjectList.subject_id': mongoose.Types.ObjectId(id),
	});
	if (!isMapped) {
		const sectionUpdate = await SectionModel.findByIdAndUpdate(section_id, {
			$push: {
				subjectList: {
					subject_id: id,
					name,
				},
			},
		});
		res.status(201).json({
			status: 'subject mapped successfully',
			data: {
				sectionUpdate,
			},
		});
	} else {
		res.status(201).json({
			message: 'subject is already mapped',
		});
	}
});

exports.mapManySubject = catchAsync(async (req, res) => {
	const { section_id, subjectList } = req.body;
	const mappedSubjects = [];
	const unmappedSubjects = [];
	if (subjectList && subjectList.length) {
		for (const ele of subjectList) {
			const isMapped = await SectionModel.find({
				_id: mongoose.Types.ObjectId(section_id),
				'subjectList.subject_id': mongoose.Types.ObjectId(ele.id),
			});
			if (!isMapped.length) {
				await SectionModel.findByIdAndUpdate(section_id, {
					$push: {
						subjectList: {
							subject_id: ele.id,
							name: ele.name,
						},
					},
				});
				mappedSubjects.push(ele.id);
			} else {
				unmappedSubjects.push(ele.id);
			}
		}
	} else {
		res.status(400).json({
			error: 'true',
			message: 'enter subject List',
		});
	}
	res.status(201).json({
		status: 'subject mapped successfully',
		mappedSubjects,
		unmappedSubjects,
	});
});

exports.unmapSubject = catchAsync(async (req, res) => {
	const { section_id, subjectList } = req.body;
	subjectList.forEach(async ele => {
		const isMapped = await SectionModel.findOne({
			_id: mongoose.Types.ObjectId(section_id),
			'subjectList.subject_id': mongoose.Types.ObjectId(ele),
		});
		if (isMapped) {
			const sectionUpdate = await SectionModel.findByIdAndUpdate(
				section_id,
				{
					$pull: {
						subjectList: {
							subject_id: ele,
						},
					},
				},
				{ new: true }
			);
			res.status(201).json({
				status: 'subject unmapped successfully',
				data: {
					sectionUpdate,
				},
			});
		} else {
			res.status(201).json({
				message: 'subject is already unmapped',
			});
		}
	});
});

// exports.unmapManySubject = catchAsync(async (req, res) => {
// 	if (req.body.subjectList && req.body.subjectList.length) {
// 		for (const ele of req.body.subjectList) {
// 			await SectionModel.findByIdAndUpdate(req.body._id, {
// 				$pull: {
// 					subjectList: ele,
// 				},
// 			});
// 		}

// 		res.status(201).json({
// 			error: 'false',
// 			message: 'subject unmapped successfully',
// 		});
// 	}
// 	res.status(200).json({
// 		error: 'true',
// 		message: 'enter subject List',
// 	});
// });

exports.deleteSection = async (req, res) => {
	try {
		const { classId } = req.body;
		const { schoolId } = req.body;
		const { sectionIds } = req.body;
		const sectionNotDeleted = [];
		const sectionDeleted = [];
		let isDeleteFlag = true;
		if (sectionIds && sectionIds.length && classId) {
			for (const section of sectionIds) {
				const userData = await userModel.find({ primary_section: section });
				if (userData && userData.length) isDeleteFlag = false;
				const studentData = await studentModel.find({ section });
				if (studentData && studentData.length) isDeleteFlag = false;
				if (!isDeleteFlag) sectionNotDeleted.push(section);
				else {
					sectionDeleted.push(section);
					await SectionModel.findOneAndDelete({
						$and: [
							{ class_id: mongoose.Types.ObjectId(classId) },
							{ _id: mongoose.Types.ObjectId(section) },
						],
					});
				}
			}
		}
		res.json({
			status: 201,
			data: { sectionNotDeleted, sectionDeleted },
			message: 'Section deleted successfully',
		});
	} catch (err) {
		res.json({
			status: 404,
			message: err,
		});
	}
};
