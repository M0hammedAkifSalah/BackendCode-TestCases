const mongoose = require('mongoose');
const SyllabusModel = require('../model/syllabus');
const APIFeatures = require('../utils/apiFeatures');
const SubjectModel = require('../model/subject');

exports.getAll = async (req, res) => {
	try {
		const features = new APIFeatures(
			SyllabusModel.find({})
				.populate(
					'repository.mapDetails.classId repository.mapDetails.boardId',
					'name'
				)
				.populate('class_id', 'name'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const syllabusData = await features.query;
		if (syllabusData) {
			res.status(200).json({
				statusCode: 200,
				message: 'success',
				records: syllabusData.length,
				data: syllabusData,
			});
		} else {
			res.status(200).json({
				statusCode: 200,
				message: 'no data found',
				records: syllabusData.length,
				data: syllabusData,
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			statusCode: 400,
			error: true,
			message: err,
		});
	}
};

exports.getAllWithClassID = async (req, res) => {
	try {
		console.log('repository.id', req.query['repository.id']);
		console.log(
			'repository.mapDetails.classId',
			req.query['repository.mapDetails.classId']
		);
		console.log(
			'repository.mapDetails.boardId',
			req.query['repository.mapDetails.boardId']
		);
		const syllabusData = await SyllabusModel.find({
			'repository.id': req.query['repository.id'],
		})
			.populate(
				'repository.mapDetails.classId repository.mapDetails.boardId',
				'name'
			)
			.populate('syllabus_id board_id class_id subject_id chapter_id');
		if (syllabusData) {
			res.status(200).json({
				statusCode: 200,
				message: 'success',
				records: syllabusData.length,
				data: syllabusData,
			});
		} else {
			res.status(200).json({
				statusCode: 200,
				message: 'No records found',
				records: 0,
				data: [],
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			statusCode: 400,
			error: true,
			message: err,
		});
	}
};

exports.updateMapDetalis = async (req, res, next) => {
	try {
		let syllabusAddedFlag = false;
		let syllabusRemovedFlag = false;
		const schoolId = req.params.school_id;
		const mapDetailsToAdd = req.body.mapDetails;
		const { removeSyllabusId } = req.body;
		const { syllabusId } = req.body;
		if (syllabusId != removeSyllabusId) {
			await SyllabusModel.updateOne(
				{ _id: syllabusId, 'repository.id': schoolId },
				{ $push: { 'repository.$.mapDetails': mapDetailsToAdd[0] } }
			);
			syllabusAddedFlag = true;

			if (req.body.removeClassId && removeSyllabusId) {
				syllabusRemovedFlag = true;
				await SyllabusModel.updateOne(
					{ _id: removeSyllabusId, 'repository.id': schoolId },
					{
						$pull: {
							'repository.$.mapDetails': { classId: req.body.removeClassId },
						},
					}
				);
			}
		}
		res.status(200).json({
			status: 'success',
			data: { syllabusRemovedFlag, syllabusAddedFlag },
		});
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getsyllabusByschoolId = async (req, res, next) => {
	try {
		const schoolData = await SyllabusModel.find({
			'repository.id': req.params.school_id,
		}).populate(
			'repository.mapDetails.classId repository.mapDetails.boardId',
			'name'
		);
		res.status(200).json({
			statusCode: 200,
			message: 'success',
			records: schoolData.length,
			data: schoolData,
		});
	} catch (err) {
		res.status(400).json({
			statusCode: 400,
			error: true,
			message: err,
		});
	}
};

exports.get = async (req, res) => {
	try {
		const getSyllabus = await SyllabusModel.findById(req.params.id).populate(
			'repository.mapDetails.classId repository.mapDetails.boardId',
			'name'
		);
		if (getSyllabus) {
			res.status(200).json({
				statusCode: 200,
				message: 'success',
				records: getSyllabus.length,
				data: getSyllabus,
			});
		}
	} catch (err) {
		res.status(404).json({
			statusCode: 404,
			error: true,
			message: err,
		});
	}
};

exports.Create = async (req, res) => {
	try {
		const syllabusData = await SyllabusModel.find({});
		for (const ele of syllabusData) {
			if (ele.name.toLowerCase() == req.body.name.toLowerCase().trim()) {
				return res.json({
					error: 'syllabus Already Exist',
					status: 802,
				});
			}
		}

		const newsyllabus = await SyllabusModel.create({
			name: req.body.name,
			class_id: req.body.class_id,
			image: req.body.image,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});

		res.status(201).json({
			status: 201,
			data: {
				class: newsyllabus,
			},
		});
	} catch (err) {
		res.status(400).json({
			status: 'failed',
			message: err,
		});
	}
};

exports.updateRepo = async (req, res, next) => {
	try {
		let obj = [];
		const features = new APIFeatures(
			SyllabusModel.find({}),
			req.query
		).filter();
		const Data = await features.query;
		let duplicateId;
		obj = Data[0].repository;
		for (const ele of Data) {
			for (const ele2 of ele.repository) {
				if (ele2.id == req.body.repository[0].id) {
					duplicateId = null;
					return res.status(400).json({
						message: 'Syllabus already exist',
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

		const updateRepo = await SyllabusModel.findByIdAndUpdate(
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
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.update = async (req, res) => {
	try {
		const syllabusUpdate = await SyllabusModel.findByIdAndUpdate(
			req.params.id,
			{
				name: req.body.name,
				image: req.body.image,
				description: req.body.description,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			}
		);

		res.json({
			status: 200,
			data: {
				syllabusUpdate,
			},
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};

exports.detele = async (req, res) => {
	try {
		await SyllabusModel.findByIdAndDelete(req.params.id);
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

exports.unMapSyllabus = async (req, res) => {
	const { syllabusId } = req.body;
	const { schoolId } = req.body;
	let isMapClass = false;
	let responeStatus = 200;
	let message;
	try {
		const subjectData = await SubjectModel.find({
			$and: [
				{ 'repository.mapDetails.syllabuseId': syllabusId },
				{ 'repository.id': schoolId },
			],
		});
		if (subjectData && subjectData.length) {
			for (const subject of subjectData) {
				const schoolSubjectObj = subject.repository.filter(
					ele => ele.id == schoolId
				);
				if (schoolSubjectObj && schoolSubjectObj.length) {
					if (
						schoolSubjectObj[0].mapDetails &&
						schoolSubjectObj[0].mapDetails.length
					)
						isMapClass = true;
					break;
				}
			}
		}
		if (isMapClass) {
			responeStatus = 400;
			message = 'This board is already mapped, pls delete the mapping first';
		} else {
			message = 'Syllabus UnMppaed Successfully';
			await SyllabusModel.updateOne(
				{ _id: syllabusId },
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

exports.deleteSyllabus = async (req, res) => {
	try {
		const { syllabusId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const syllabusData = await SyllabusModel.find({
			$and: [
				{ 'repository.repository_type': 'School' },
				{ _id: mongoose.Types.ObjectId(syllabusId) },
			],
		});
		if (syllabusData && syllabusData.length) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This Syllabus is already mapped, pls delete the mapping first';
		} else {
			message = 'Syllabus Deleted Successfully';
			await SyllabusModel.deleteOne({ _id: syllabusId });
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
