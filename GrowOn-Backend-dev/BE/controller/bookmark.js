const mongoose = require('mongoose');
const BookmarkModel = require('../model/bookmark');

exports.getBookMark = async (req, res, next) => {
	try {
		const bookmarkData = await BookmarkModel.find({
			student_id: req.body.student_id,
		});
		res.status(200).json({
			status: 200,
			results: bookmarkData.length,
			data: bookmarkData,
		});
	} catch (error) {
		res.status(400).json({
			message: error,
		});
	}
};

exports.getBookMarkParent = async (req, res, next) => {
	try {
		const bookmarkData = await BookmarkModel.find({
			parent_id: req.body.parent_id,
		});
		res.status(200).json({
			status: 200,
			results: bookmarkData.length,
			data: bookmarkData,
		});
	} catch (error) {
		res.status(400).json({
			message: error,
		});
	}
};
/// /////////////////////////////////////////////////////// Acknowledge portion ////////////////////
exports.CreateBookMark = async (req, res, next) => {
	try {
		const bookmarkData = await BookmarkModel.find({
			student_id: req.body.student_id,
		});
		if (bookmarkData.length >= 1) {
			console.log('if', bookmarkData);
			const id = req.body.student_id;
			await BookmarkModel.findOneAndUpdate(id, {
				$push: { bookmark_details: req.body.bookmark_details },
			});
			res.status(201).json({
				status: 'updated',
			});
		} else {
			console.log('000000000', bookmarkData);
			const bookmark = new BookmarkModel({
				_id: new mongoose.Types.ObjectId(),
				student_id: req.body.student_id,
				bookmark_details: req.body.bookmark_details,
				repository: req.body.repository,
				created_by: req.body.createdBy,
				updated_by: req.body.updatedBy,
			});
			bookmark
				.save()
				.then(result => {
					res.status(201).json({
						message: 'created successfully',
						data: result,
					});
				})
				.catch(err => {
					res.json({
						error: err,
						status: 411,
					});
				});
		}
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};

exports.CreateBookMarkParent = async (req, res, next) => {
	try {
		const bookmarkData = await BookmarkModel.find({
			parent_id: req.body.parent_id,
		});
		if (bookmarkData.length >= 1) {
			console.log('if', bookmarkData);
			const id = req.body.parent_id;
			await BookmarkModel.findOneAndUpdate(id, {
				$push: { bookmark_details: req.body.bookmark_details },
			});
			res.status(201).json({
				status: 'updated',
			});
		} else {
			console.log('000000000', bookmarkData);
			const bookmark = new BookmarkModel({
				_id: new mongoose.Types.ObjectId(),
				student_id: req.body.student_id ? req.body.student_id : null,
				parent_id: req.body.parent_id,
				bookmark_details: req.body.bookmark_details,
				repository: req.body.repository,
				created_by: req.body.createdBy,
				updated_by: req.body.updatedBy,
			});
			bookmark
				.save()
				.then(result => {
					res.status(201).json({
						message: 'created successfully',
						data: result,
					});
				})
				.catch(err => {
					res.json({
						error: err,
						status: 411,
					});
				});
		}
	} catch (err) {
		res.status(400).json({
			status: 400,
			message: err,
		});
	}
};
/// ///////////////////  started By////////////
exports.UpdateBookMark = async (req, res, next) => {
	try {
		const id = req.body.student_id;
		const bookmark = await BookmarkModel.findOneAndUpdate(id, {
			$push: { bookmark_details: req.body.bookmark_details },
		});
		console.log(bookmark);
		res.status(200).json({
			status: 'success',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

/// /////////////////////// delete book mark ////////////////////
exports.delete = async (req, res, next) => {
	try {
		const studentId = req.params.id;
		const activityId = req.body.activity;
		const bookmark = await BookmarkModel.find({
			$and: [
				{ student_id: studentId },
				{ 'bookmark_details.activity': activityId },
			],
		});
		if (bookmark.length) {
			await BookmarkModel.findByIdAndRemove(bookmark[0]._id);
			res.status(200).json({
				status: 'deleted',
			});
		} else {
			res.status(404).json({
				status: 'bookmark not found',
			});
		}
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};

exports.deleteParent = async (req, res, next) => {
	try {
		const parentId = req.params.id;
		const activityId = req.body.activity;
		const bookmark = await BookmarkModel.find({
			$and: [
				{ parent_id: parentId },
				{ 'bookmark_details.activity': activityId },
			],
		});
		console.log(bookmark);
		if (bookmark) {
			await BookmarkModel.findByIdAndRemove(bookmark[0]._id);
		}
		res.status(200).json({
			status: 'deleted',
		});
	} catch (err) {
		res.status(400).json({
			message: 'error',
		});
	}
};
