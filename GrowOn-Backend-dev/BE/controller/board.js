const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const BoardModel = require('../model/board');
const ClassModel = require('../model/class');
const SyllabusModel = require('../model/syllabus');

exports.Create = async (req, res, next) => {
	try {
		const boardData = await BoardModel.find({});
		for (const ele of boardData) {
			if (ele.name.toLowerCase() == req.body.name.toLowerCase().trim()) {
				return res.json({
					error: 'Board Already Exist',
					status: 802,
				});
			}
		}
		const board = new BoardModel({
			_id: mongoose.Types.ObjectId(),
			name: req.body.name,
			class_id: req.body.class_id,
			description: req.body.description,
			repository: req.body.repository,
			createdBy: req.body.createdBy,
			updatedBy: req.body.updatedBy,
		});
		board
			.save()
			.then(result => {
				res.status(201).json({
					message: 'Board created successfully',
					status: 201,
					data: result,
				});
			})
			.catch(err => {
				res.json({
					error: err,
					status: 411,
				});
			});
	} catch (err) {
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.updateMapDetalis = async (req, res, next) => {
	try {
		let boardAddedFlag = false;
		let boardRemovedFlag = false;
		const schoolId = req.params.school_id;
		const { boardId } = req.body;
		const { removeBoardId } = req.body;
		const mapDetailsToAdd = req.body.mapDetails;
		if (removeBoardId != boardId) {
			await BoardModel.updateOne(
				{ _id: boardId, 'repository.id': schoolId },
				{ $push: { 'repository.$.mapDetails': mapDetailsToAdd[0] } }
			);
			boardAddedFlag = true;

			if (req.body.removeClassId && removeBoardId) {
				await BoardModel.updateOne(
					{ _id: removeBoardId, 'repository.id': schoolId },
					{
						$pull: {
							'repository.$.mapDetails': { classId: req.body.removeClassId },
						},
					}
				);
				boardRemovedFlag = true;
			}
		}
		res.status(200).json({
			status: 'success',
			data: { boardRemovedFlag, boardAddedFlag },
		});
	} catch (err) {
		console.error('err', err);
		res.status(400).json({
			status: 'fails',
			message: err.message,
		});
	}
};

exports.updateRepo = async (req, res, next) => {
	try {
		let obj = [];
		const features = new APIFeatures(BoardModel.find({}), req.query).filter();
		let Data = await features.query;
		Data = JSON.parse(JSON.stringify(Data));
		let duplicateId;
		console.log(Data);
		obj = Data[0].repository;
		for (const ele of Data) {
			for (const ele2 of ele.repository) {
				if (ele2.id == req.body.repository[0].id) {
					duplicateId = null;
					return res.status(400).json({
						message: 'Board already exist',
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

		await BoardModel.findByIdAndUpdate(
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

exports.getBoardByschoolId = async (req, res, next) => {
	try {
		const schooldata = await BoardModel.find({
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
exports.getAllDataWithClassId = async (req, res) => {
	try {
		const board = await BoardModel.find({
			'repository.id': req.query['repository.id'],
		});
		const foundClasses = await ClassModel.find({});
		const classes = JSON.parse(JSON.stringify(foundClasses));
		if (board) {
			const obj = [];
			const responeData1 = JSON.parse(JSON.stringify(board));
			for (const element of responeData1) {
				let className;
				for (const element1 of element.repository) {
					if (element1.mapDetails) {
						for (const element2 of element1.mapDetails) {
							if (element2.classId) {
								className = classes.find(({ _id }) => _id === element2.classId);
								if (className) {
									element2.className = className.name;
								}
							}
							if (element1.id == req.query['repository.id']) {
								if (
									element2.classId == req.query['repository.mapDetails.classId']
								) {
									obj.push(element);
								}
							}
						}
					}
				}
			}
			res.status(200).json({
				message: 'success',
				status: 200,
				result: obj.length,
				data: obj,
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getAllData = async (req, res) => {
	try {
		const features = new APIFeatures(
			BoardModel.find({}).populate('repository.mapDetails.classId', 'name'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const board = await features.query;
		const foundClasses = await ClassModel.find({});
		const classes = JSON.parse(JSON.stringify(foundClasses));
		if (board) {
			const responeData1 = JSON.parse(JSON.stringify(board));
			for (const element of responeData1) {
				for (const ele of element.repository) {
					if (ele.mapDetails) {
						for (const element2 of ele.mapDetails) {
							if (element2.classId) {
								const data = element2.classId;
								element2.classId = data._id;
								element2.className = data.name;
							}
						}
					}
				}
			}
			res.status(200).json({
				message: 'success',
				status: 200,
				result: responeData1.length,
				data: responeData1,
			});
		}
	} catch (err) {
		console.log('err', err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getByID = async (req, res) => {
	try {
		const board = await BoardModel.findById(req.params.id).populate(
			'repository.mapDetails.classId',
			'name'
		);
		if (!board) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			const responeData1 = JSON.parse(JSON.stringify(board));
			res.status(200).json({
				status: 'success',
				data: responeData1,
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};

exports.Update = async (req, res) => {
	const { id } = req.params;
	try {
		const board = await BoardModel.findById(id);
		if (!board) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		} else {
			await BoardModel.findByIdAndUpdate(id, {
				name: req.body.name,
				description: req.body.description,
				repository: req.body.repository,
				createdBy: req.body.createdBy,
				updatedBy: req.body.updatedBy,
			});
			res.status(200).json({
				status: 'success',
			});
		}
	} catch (err) {
		res.status(400).json({
			status: 'faild',
			message: err,
		});
	}
};

exports.unMapBoard = async (req, res) => {
	const { boardId } = req.body;
	const { schoolId } = req.body;
	let isMapClass = false;
	let responeStatus = 200;
	let message;
	try {
		const syllabusData = await SyllabusModel.find({
			$and: [
				{ 'repository.mapDetails.boardId': boardId },
				{ 'repository.id': schoolId },
			],
		});
		if (syllabusData && syllabusData.length) {
			for (const syllabus of syllabusData) {
				const schoolSyllabusObj = syllabus.repository.filter(
					ele => ele.id == schoolId
				);
				if (schoolSyllabusObj && schoolSyllabusObj.length) {
					if (
						schoolSyllabusObj[0].mapDetails &&
						schoolSyllabusObj[0].mapDetails.length
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
			message = 'Board UnMppaed Successfully';
			await BoardModel.updateOne(
				{ _id: boardId },
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

exports.deleteBoard = async (req, res) => {
	try {
		const { boardId } = req.body;
		let isMapClass = false;
		let message;
		let responeStatus = 200;
		const boardData = await BoardModel.find({
			$and: [
				{ 'repository.repository_type': 'School' },
				{ _id: mongoose.Types.ObjectId(boardId) },
			],
		});
		if (boardData && boardData.length) {
			isMapClass = true;
		}

		if (isMapClass) {
			responeStatus = 400;
			message = 'This Board is already mapped, pls delete the mapping first';
		} else {
			message = 'Board Deleted Successfully';
			await BoardModel.deleteOne({ _id: boardId });
		}
		res.status(responeStatus).json({
			status: responeStatus,
			message,
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err,
		});
	}
};
