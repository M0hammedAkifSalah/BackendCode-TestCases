const InstituteModel = require('../model/institute');

const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const schoolModel = require('../model/school');
const SuccessResponse = require('../utils/successResponse');

exports.GetAll = catchAsync(async (req, res, next) => {
	const features = new APIFeatures(
		InstituteModel.find({}).populate(
			'city state country schoolList',
			'_id city_name state_name country_name schoolName'
		),
		req.query
	)
		.filter()
		.sort()
		.paginate();
	const instituteDetails = await features.query;

	res
		.status(200)
		.json(
			SuccessResponse(instituteDetails, instituteDetails.length, 'Success')
		);
});

exports.Create = catchAsync(async (req, res, next) => {
	const InstituteCreated = {
		name: req.body.name,
		institute_code: req.body.institute_code,
		profile_image: req.body.profile_image,
		address: req.body.address,
		city: req.body.city,
		state: req.body.state,
		country: req.body.country,
		email: req.body.email,
		webSite: req.body.webSite,
		contact_number: req.body.contact_number,
		pincode: req.body.pincode,
		schoolList: req.body.schoolList,
		activeStatus: req.body.activeStatus,
		createdBy: req.body.createdBy,
		updatedBy: req.body.updatedBy,
	};

	const finalData = await InstituteModel.create(InstituteCreated);
	// finalData = await finalData.populate('schoolList').execPopulate();
	res
		.status(201)
		.json(SuccessResponse(finalData, 1, 'Institute Created Successfully'));
});

exports.UpdateInstitute = catchAsync(async (req, res, next) => {
	const id = req.body._id;
	const instituteData = await InstituteModel.findByIdAndUpdate(id, req.body);
	res
		.status(201)
		.json(SuccessResponse(instituteData, 1, 'Institute Updated Successfully'));
});

exports.removeSchool = catchAsync(async (req, res, next) => {
	const updateSchoolList = await InstituteModel.findByIdAndUpdate(
		req.params.id,
		{
			$pull: { schoolList: req.body.schoolId },
		},
		{ new: true }
	);

	await schoolModel.findByIdAndUpdate(req.body.schoolId, { institute: null });

	res
		.status(201)
		.json(SuccessResponse(updateSchoolList, 1, 'Updated Successfully'));
});

exports.UpdateSchoolList = catchAsync(async (req, res, next) => {
	let updateSchoolList;
	const assignSchool = [];
	for (const ele of req.body.schoolList) {
		const institute = await InstituteModel.find({
			$and: [{ _id: req.body.id }, { schoolList: ele }],
		});
		if (institute && institute.length) {
			assignSchool.push(ele);
			console.log(assignSchool);
		} else {
			updateSchoolList = await InstituteModel.findOneAndUpdate(
				{
					_id: req.body.id,
				},
				{
					$push: { schoolList: ele },
				},
				{ new: true }
			);
			await schoolModel.findByIdAndUpdate(
				ele,
				{ institute: req.body.id },
				{ new: true }
			);
		}
	}
	if (assignSchool && assignSchool.length) {
		res.status(201).json({
			message: 'Updated Successfully',
			updatedData: updateSchoolList,
			AlreadypresentSchool: assignSchool,
		});
	} else {
		res
			.status(201)
			.json(SuccessResponse(updateSchoolList, 1, 'Updated Successfully'));
	}
});

// exports.UpdateInstituteSchoolList = catchAsync(async (req, res, next) => {
// 	const updateSchoolList = await InstituteModel.findByIdAndUpdate(
// 		req.params.id,
// 		{ schoolList: req.body.schoolList }
// 	);
// 	res
// 		.status(201)
// 		.json(SuccessResponse(updateSchoolList, 1, 'Updated Successfully'));
// });

exports.GetById = catchAsync(async (req, res, next) => {
	const institute = await InstituteModel.findById(req.params.id)
		.populate('city state country')
		.populate({
			path: 'schoolList',
			populate: {
				path: 'city state country',
				select: '_id city_name state_name country_name',
			},
			select: 'schoolName school_code schoolImage city state',
		});

	if (!institute) {
		return next(
			new ErrorResponse(`Institute not found for Id ${req.params.id}`)
		);
	}

	res.status(200).json(SuccessResponse(institute, 1, 'found institutes'));
});

exports.DeletedInstitute = catchAsync(async (req, res, next) => {
	const deletedInstitute = await InstituteModel.findByIdAndDelete(
		req.params.id
	);
	res
		.status(200)
		.json(SuccessResponse(deletedInstitute, 1, 'Record Deleted Successfully'));
});
