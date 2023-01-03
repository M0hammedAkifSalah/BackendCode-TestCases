const express = require('express');
const mongoose = require('mongoose');
const APIFeatures = require('../utils/apiFeatures');
const PerformanceModel = require('../model/performance');

exports.Create = async (req, res, next) => {
	try {
		const performance = new PerformanceModel({
			_id: mongoose.Types.ObjectId(),
			teacher_id: req.body.teacher_id,
			student_id: req.body.student_id,
			date: req.body.date,
			feed: req.body.feed,
			feed_type: req.body.feed_type,
			award_badge: req.body.award_badge,
			award_badge_image: req.body.award_badge_image,
			repository: req.body.repository,
		});
		performance
			.save()
			.then(result => {
				res.status(201).json({
					message: 'created successfully',
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

exports.getAllData = async (req, res, next) => {
	try {
		const features = new APIFeatures(
			PerformanceModel.find({}).populate('teacher_id'),
			req.query
		)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		const board = await features.query;
		res.status(200).json({
			data: board,
		});
	} catch (err) {
		console.log(err);
		res.status(400).json({
			status: 'fails',
			message: err,
		});
	}
};

exports.getByID = async (req, res) => {
	try {
		const board = await PerformanceModel.findById(req.params.id);
		if (!board) {
			res.status(404).json({
				status: 'faild',
				message: 'Invalid Id',
			});
		}
		res.status(200).json({
			data: board,
		});
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
		const board = await PerformanceModel.findById(id);
		if (!board) {
			res.status(404).json({
				status: 'failed',
				message: 'Invalid Id',
			});
		} else {
			const updateboard = await PerformanceModel.findByIdAndUpdate(id, {
				teacher_id: req.body.teacher_id,
				student_id: req.body.student_id,
				date: req.body.date,
				feed: req.body.feed,
				feed_type: req.body.feed_type,
				award_badge: req.body.award_badge,
				award_badge_image: req.body.award_badge_image,
				repository: req.body.repository,
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

exports.rewardCount = async (req, res, next) => {
	try {
		const awardList = await PerformanceModel.find({
			student_id: req.params.id,
		}).populate({ path: 'teacher_id', select: 'name profile_image' });
		if (awardList.length <= 0) {
			return res.status(200).json({
				message: 'performance record not created',
			});
		}
		res.status(200).json({
			award: awardList,
		});
	} catch (error) {
		res.status(200).json({
			success: false,
			error,
		});
	}
};
