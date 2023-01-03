const mongoose = require('mongoose');
const SubjectModel = require('../model/subject');
const APIFeatures = require('../utils/apiFeatures');
const SectionModel = require('../model/section');
const ClassModel = require('../model/class');
const BoardModel = require('../model/board');
const SyllabuseModel = require('../model/syllabus');
const ChapterModel = require('../model/chapter');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorHandler');
const SuccessResponse = require('../utils/successResponse');

exports.getAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			SubjectModel.find({})
				.populate('repository.mapDetails.syllabusId', '_id name')
				.populate('repository.mapDetails.classId', '_id name')
				.populate('repository.mapDetails.boardId', '_id name'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const subjectData = await features.query;
		if (subjectData) {
			// const responeData1 = JSON.parse(JSON.stringify(subjectData));
			res.json({
				status: 200,
				results: subjectData.length,
				data: subjectData,
			});
		} else {
			res.json({
				status: 200,
				message: 'no data found',
				results: subjectData.length,
				data: subjectData,
			});
		}
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};
exports.getAllSubject = async (req, res) => {
	try {
		const subjectData = await SubjectModel.find(req.query).select('name');

		if (subjectData) {
			res.json({
				status: 200,
				results: subjectData.length,
				data: subjectData,
			});
		} else {
			res.json({
				status: 200,
				message: 'no data found',
				results: subjectData.length,
				data: subjectData,
			});
		}
	} catch (err) {
		res.json({
			status: 400,
			message: err,
		});
	}
};

exports.getchapterCount = catchAsync(async (req, res, next) => {
	const { school, class_id } = req.query;
	const result = await SectionModel.aggregate([
		{
			$match: {
				school: mongoose.Types.ObjectId(school),
				class_id: mongoose.Types.ObjectId(class_id),
			},
		},
		{
			$unwind: '$subjectList',
		},
		{
			$lookup: {
				from: 'chapters',
				let: {
					id: '$subjectList.subject_id',
					school: {
						$toString: '$school',
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$subject_id', '$$id'],
									},
									{
										$in: ['$$school', '$repository.id'],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
						},
					},
				],
				as: 'chapter_count',
			},
		},
		{
			$project: {
				subjectList: 1,
				chapter_count: {
					$size: '$chapter_count',
				},
				school: 1,
				class_id: 1,
			},
		},
		{
			$group: {
				_id: {
					school: '$school',
					class_id: '$class_id',
				},
				subjectList: {
					$addToSet: {
						subId: '$subjectList.subject_id',
						name: '$subjectList.name',
						chapter_count: '$chapter_count',
					},
				},
			},
		},
		{
			$project: {
				_id: 0,
				subjectList: 1,
			},
		},
	]);
	if (!result) {
		return res.staus(404).json(new ErrorResponse(404, 'No records Found'));
	}
	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Fetched Successfully'));
});

exports.subjectBySchool = catchAsync(async (req, res, next) => {
	const { school } = req.params;
	const aggregate = [
		{
			$match: {
				school: mongoose.Types.ObjectId(school),
			},
		},
		{
			$unwind: {
				path: '$subjectList',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: '$school',
				subject: {
					$addToSet: '$subjectList.subject_id',
				},
			},
		},
		{
			$lookup: {
				from: 'subjects',
				localField: 'subject',
				foreignField: '_id',
				as: 'subject',
			},
		},
	];
	const subjectList = await SectionModel.aggregate(aggregate);
	if (subjectList[0].subject.length === 0) {
		return res
			.status(404)
			.json(new ErrorResponse(404, `No subjects found for ${school}`));
	}
	res
		.status(200)
		.json(
			SuccessResponse(subjectList, subjectList[0].subject.length, 'Success')
		);
});

exports.getAllWithClassID = async (req, res) => {
	try {
		const schoolId = mongoose.Types.ObjectId(req.query['repository.id']);
		const classId = mongoose.Types.ObjectId(
			req.query['repository.mapDetails.classId']
		);
		const boardId = mongoose.Types.ObjectId(
			req.query['repository.mapDetails.boardId']
		);
		const syllabuseId = mongoose.Types.ObjectId(
			req.query['repository.mapDetails.syllabuseId']
		);

		const subjectData = await SubjectModel.aggregate([
			{
				$match: {
					$and: [
						{
							'repository.id': schoolId,
						},
						{
							'repository.mapDetails.classId': classId,
						},
						{
							'repository.mapDetails.boardId': boardId,
						},
						{
							'repository.mapDetails.syllabuseId': syllabuseId,
						},
					],
				},
			},
			{
				$project: {
					id: 1,
					name: 1,
					repository: {
						$filter: {
							input: '$repository',
							as: 'item',
							cond: {
								$eq: ['$$item.id', schoolId],
							},
						},
					},
				},
			},
			{
				$unwind: '$repository',
			},
			{
				$project: {
					name: 1,
					'repository.id': 1,
					'repository.repository_type': 1,
					'repository.mapDetails': {
						$filter: {
							input: '$repository.mapDetails',
							as: 'item',
							cond: {
								$and: [
									{
										$eq: ['$$item.classId', classId],
									},
									{
										$eq: ['$$item.boardId', boardId],
									},
									{
										$eq: ['$$item.syllabuseId', syllabuseId],
									},
								],
							},
						},
					},
				},
			},
			{
				$unwind: '$repository.mapDetails',
			},
			{
				$lookup: {
					from: 'syllabuses',
					let: {
						syllabus: '$repository.mapDetails.syllabuseId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$syllabus'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'repository.mapDetails.syllabuseId',
				},
			},
			{
				$lookup: {
					from: 'classes',
					let: {
						class: '$repository.mapDetails.classId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$class'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'repository.mapDetails.classId',
				},
			},
			{
				$lookup: {
					from: 'boards',
					let: {
						board: '$repository.mapDetails.boardId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$board'],
								},
							},
						},
						{
							$project: {
								name: 1,
							},
						},
					],
					as: 'repository.mapDetails.boardId',
				},
			},
			{
				$unwind: '$repository.mapDetails.syllabuseId',
			},
			{
				$unwind: '$repository.mapDetails.classId',
			},
			{
				$unwind: '$repository.mapDetails.boardId',
			},
			{
				$group: {
					_id: '$_id',
					name: {
						$first: '$name',
					},
					repository: {
						$first: {
							id: '$repository.id',
							repository_type: '$repository.repository_type',
						},
					},
					mapDetails: {
						$push: '$repository.mapDetails',
					},
				},
			},
			{
				$project: {
					name: 1,
					'repository.id': 1,
					'repository.repository_type': 1,
					'repository.mapDetails': '$mapDetails',
				},
			},
		]);
		if (subjectData) {
			const obj = [];
			const responeData1 = JSON.parse(JSON.stringify(subjectData));
			res.json({
				status: 200,
				results: subjectData.length,
				data: subjectData,
			});
		}
	} catch (err) {
		res.json({
			status: 400,
			message: err.message,
		});
	}
};
exports.updateRepo = async (req, res, next) => {
	try {
		let obj = [];
		const features = new APIFeatures(SubjectModel.find({}), req.query).filter();
		const Data = await features.query;
		obj = Data[0].repository;
		let duplicateId;
		for (const ele of Data) {
			for (const ele2 of ele.repository) {
				if (ele2.id == req.body.repository[0].id) {
					duplicateId = null;
					return res.status(400).json({
						message: 'Subject already exist',
					});
				}

				// eslint-disable-next-line prefer-destructuring
				duplicateId = req.body.repository[0];
			}
		}
		if (duplicateId) {
			obj.push(req.body.repository[0]);
		}
		if (Data.length < 1) {
			return res.json({
				error: 'not Exist',
				status: 802,
			});
		}

		const updateRepo = await SubjectModel.findByIdAndUpdate(
			req.query,
			{ repository: obj },
			{
				new: true,
				runValidators: true,
			}
		);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.updateMapDetalis = async (req, res, next) => {
	try {
		const { classId, newAddedSubjectId, removeSubjectId } = req.body;
		const { school_id } = req.params;
		let subjectRemovedFlag = false;
		let subjectAddedFlag = false;
		// const { classId } = req.body;
		// const schoolId = req.params.school_id;
		// for (const subjId of newAddedSubjectId) {
		let start;
		let end;
		newAddedSubjectId.forEach(async subjId => {
			start = new Date().getTime();
			const isMapped = await SubjectModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(subjId),
					},
				},
				{
					$project: {
						repository: 1,
					},
				},
				{
					$unwind: '$repository',
				},
				{
					$match: {
						'repository.id': new mongoose.Types.ObjectId(school_id),
						'repository.mapDetails.classId': mongoose.Types.ObjectId(classId),
						'repository.mapDetails.boardId': mongoose.Types.ObjectId(
							req.body.boardId
						),
						'repository.mapDetails.syllabuseId': mongoose.Types.ObjectId(
							req.body.syllabuseId
						),
					},
				},
			]);
			if (!isMapped.length) {
				await SubjectModel.updateOne(
					{ _id: subjId, 'repository.id': school_id },
					{
						$push: {
							'repository.$.mapDetails': {
								syllabuseId: req.body.syllabuseId,
								boardId: req.body.boardId,
								classId,
							},
						},
					}
				);
				subjectAddedFlag = true;
			}
			end = new Date().getTime();
			const timelog = end - start;
			console.log('id', subjId);
			console.log(timelog);
		});

		removeSubjectId.forEach(async subjId => {
			subjectRemovedFlag = true;
			await SubjectModel.updateOne(
				{ _id: subjId, 'repository.id': school_id },
				{ $pull: { 'repository.$[].mapDetails': { classId } } }
			);
		});

		res.status(200).json({
			status: 'success',
			data: { subjectRemovedFlag, subjectAddedFlag },
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err.message,
		});
	}
};

// exports.updateMapDetalis = async (req, res, next) => {
//     try {
//         let obj = []
//         let obj2=[]
//         const schoolId = req.params.school_id;
//         const mapDetailsToAdd = req.body.mapDetails;
//         const features = await subjectModel.find({ $and: [{ "repository.id": req.params.school_id }, { "_id": req.body.subjectId }] })
//         if (features.length < 1) {
//             return res.json({
//                 error: 'not Exist',
//                 status: 802
//             });
//         }

//         else {
//             const subjectData = features[0];
//             const ifSchoolPresent = subjectData.repository.filter(ele => ele.id == schoolId)
//             if (ifSchoolPresent && ifSchoolPresent.length) {
//                 let schoolData = ifSchoolPresent[0].mapDetails;
//                 schoolData = schoolData.concat(mapDetailsToAdd);

//                 schoolData = schoolData.filter((ele, index, self) =>
//                     index === self.findIndex((t) => (
//                         t.classId === ele.classId && t.boardId === ele.boardId
//                     ))
//                 )
//                // schoolData = schoolData.filter(ele => ele.classId != req.body.removeClassId && ele.boardId != req.body.removeBoardId && ele.syllabuseId != req.body.removeSyllabusId)

//                 ifSchoolPresent[0].mapDetails = schoolData;

//             }
//             const updateData = await subjectModel.findByIdAndUpdate(subjectData._id,
//                 subjectData
//             )
//             if(req.body.removeClassId && req.body.removeBoardId && req.body.removeSyllabusId && req.body.removeSubjectId){

//             const deletedDataList = await subjectModel.find({ $and: [{ "repository.id": req.params.school_id }, { "_id": req.body.removeSubjectId }] })
//             const deletedSubjectData = deletedDataList[0];
//             const ifSchoolPresent1 = deletedSubjectData.repository.filter(ele => ele.id == schoolId)
//             if (ifSchoolPresent1 && ifSchoolPresent1.length) {
//                 let schoolData = ifSchoolPresent1[0].mapDetails;
//                 //console.log(schoolData)
//                 for (ele of schoolData)
//                 {
//                     if(ele.classId != req.body.removeClassId && ele.boardId != req.body.removeBoardId && ele.syllabuseId != req.body.removeSyllabusId)
//                     {
//                         obj2.push(ele)
//                     }

//                 }

//                 //schoolData = schoolData.filter(ele => ele.classId != req.body.removeClassId && ele.boardId != req.body.removeBoardId && ele.syllabuseId != req.body.removeSyllabusId)
//                 //schoolData = schoolData.filter(ele => ele.classId != req.body.removeClassId)
//                 ifSchoolPresent1[0].mapDetails = obj2;

//             }
//             const updateData1 = await subjectModel.findByIdAndUpdate(deletedSubjectData._id,
//                 deletedSubjectData
//             )
//             }
//            // console.log("deletedSubjectData",deletedSubjectData)

//             res.status(200).json({
//                 status: 'success',
//             });
//         }
//     }
//     catch (err) {
//         console.log("err", err)
//         res.status(400).json({
//             status: "fails",
//             message: err
//         })
//     }
// };

exports.getsubjectByschoolId = async (req, res, next) => {
	try {
		const schooldata = await SubjectModel.find({
			'repository.id': req.params.school_id,
		});
		res.status(200).json({
			data: schooldata,
		});
	} catch (err) {
		res.status(400).json({
			message: err,
		});
	}
};
exports.get = async (req, res) => {
	try {
		const getSubject = await SubjectModel.findById(req.params.id);
		if (getSubject) {
			const responeData1 = JSON.parse(JSON.stringify([getSubject]));
			for (const element of responeData1) {
				let className;
				let boardName;
				let syllabuseName;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = await ClassModel.findById(element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
							if (element2.boardId) {
								boardName = await BoardModel.findById(element2.boardId);
								if (boardName) {
									element2.boardName = boardName.name;
								}
							}
							if (element2.syllabuseId) {
								syllabuseName = await SyllabuseModel.findById(
									element2.syllabuseId
								);
								if (syllabuseName) {
									element2.syllabuseName = syllabuseName.name;
								}
							}
						}
					}
				}
			}
			res.json({
				status: 200,
				data: {
					responeData1,
				},
			});
		}
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.Create = async (req, res) => {
	try {
		const subjectData = await SubjectModel.find({});
		for (const ele of subjectData) {
			if (ele.name.toLowerCase() == req.body.name.toLowerCase().trim()) {
				return res.json({
					error: 'subject Already Exist',
					status: 802,
				});
			}
		}

		const newsubject = await SubjectModel.create({
			name: req.body.name,
			s_image: req.body.s_image,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});

		res.status(201).json({
			status: 201,
			data: {
				class: newsubject,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.CreateMany = async (req, res) => {
	try {
		const subjectResponseData = [];
		for (const subject of req.body.subjects) {
			const subjectData = await SubjectModel.find({});
			for (const ele of subjectData) {
				if (ele.name.toLowerCase() == subject.name.toLowerCase().trim()) {
					return res.json({
						error: 'subject Already Exist',
						status: 802,
					});
				}
			}

			const newsubject = await SubjectModel.create({
				name: subject.name,
				s_image: subject.s_image,
				description: subject.description,
				repository: subject.repository,
				createdBy: subject.createdBy,
				updatedBy: subject.updatedBy,
			});
			await subjectResponseData.push(newsubject);
		}
		res.status(201).json({
			status: 201,
			data: subjectResponseData,
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.update = async (req, res) => {
	try {
		const subjectUpdate = await SubjectModel.findByIdAndUpdate(req.params.id, {
			name: req.body.name,
			s_image: req.body.s_image,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});

		res.json({
			status: 201,
			data: {
				subjectUpdate,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.duplication = async (req, res, next) => {
	try {
		let i = 0;
		const subjectData = await SubjectModel.find({}).select('_id');
		for (const ele of subjectData) {
			const duplicated = await SubjectModel.aggregate([
				{
					$match: {
						_id: ele._id,
					},
				},
				{
					$project: {
						name: 1,
						repository: 1,
					},
				},
				{
					$unwind: '$repository',
				},
				{
					$unwind: '$repository.mapDetails',
				},
				{
					$group: {
						_id: {
							school_id: '$repository.id',
							syllabus: '$repository.mapDetails.syllabuseId',
							board: '$repository.mapDetails.boardId',
							class: '$repository.mapDetails.classId',
						},
						map_id: {
							$push: '$repository.mapDetails._id',
						},
						count: {
							$sum: 1,
						},
					},
				},
				{
					$match: {
						count: {
							$gt: 1,
						},
					},
				},
				{
					$addFields: {
						num: {
							$subtract: ['$count', 1],
						},
					},
				},
				{
					$project: {
						_id: 1,
						map_id: {
							$slice: ['$map_id', 1, '$num'],
						},
						num: '$num',
					},
				},
			]);
			if (duplicated.length > 0) {
				await duplicated.forEach(async el => {
					for (const id of el.map_id) {
						await SubjectModel.updateOne(
							{
								'repository.mapDetails._id': id,
							},
							{
								$pull: {
									'repository.$.mapDetails': {
										_id: id,
									},
								},
							}
						);
					}
				});
			}
			console.log(i);
			i += 1;
		}
		res.json({
			status: 201,
		});
	} catch (err) {
		console.log(err.message);
	}
};

exports.updateMultiple = async (req, res) => {
	try {
		const subjectResponseData = [];
		for (const subject of req.body.subjects) {
			const subjectUpdate = await SubjectModel.findByIdAndUpdate(subject, {
				name: req.body.name,
				s_image: req.body.s_image,
				description: req.body.description,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			subjectResponseData.push(subjectUpdate);
		}

		res.status(200).json({
			status: 201,
			data: {
				subjectResponseData,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err.message,
		});
	}
};

exports.detele = async (req, res) => {
	try {
		await SubjectModel.findByIdAndDelete(req.params.id);
		res.json({
			status: 201,
			data: null,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.unMapSubject = async (req, res) => {
	const { subjectId } = req.body;
	const { schoolId } = req.body;
	let isMapClass = false;
	let responeStatus = 200;
	let message;
	try {
		const chapterData = await ChapterModel.find({
			$and: [{ 'repository.id': schoolId }, { subject_id: subjectId }],
		});
		if (chapterData && chapterData.length) {
			isMapClass = true;
		}
		if (isMapClass) {
			responeStatus = 400;
			message = 'This subject is already mapped, pls delete the mapping first';
		} else {
			message = 'Subject UnMppaed Successfully';
			await SubjectModel.updateOne(
				{ _id: subjectId },
				{ $pull: { repository: { id: schoolId } } }
			);
		}

		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'failed',
			message: err.message,
		});
	}
};

exports.deleteSubject = async (req, res) => {
	try {
		const { subjectId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const subjectData = await SubjectModel.find({
			$and: [
				{ 'repository.repository_type': 'School' },
				{ _id: mongoose.Types.ObjectId(subjectId) },
			],
		});
		if (subjectData && subjectData.length) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This Subject is already mapped, pls delete the mapping first';
		} else {
			message = 'Subject Deleted Successfully';
			await SubjectModel.deleteOne({ _id: subjectId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		console.log(err);
		res.status(404).json({
			status: 'fail',
			message: err.message,
		});
	}
};
