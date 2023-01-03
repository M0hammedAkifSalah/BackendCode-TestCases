const SuccessResponse = (data = null, records = 0, message = 'Completed') => ({
	isSuccess: true,
	data, // data
	records, // data count
	message,
});

module.exports = SuccessResponse;
