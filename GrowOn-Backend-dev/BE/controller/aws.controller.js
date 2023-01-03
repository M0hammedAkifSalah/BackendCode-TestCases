const s3 = require('../config/s3.config');

exports.doUpload = (req, res) => {
	const { s3Client } = s3;
	const params = s3.uploadParams;

	// originalname = originalname + Date.now() + originalname;
	params.Key =
		Date.now() + req.file ? req.file.originalname : req.files.file.name;
	console.log('key', params.Key);
	params.Body = req.file ? req.file.buffer : req.files.file.data;

	s3Client.upload(params, (err, data) => {
		if (err) {
			res.status(500).json({ error: `Error -> ${err}` });
		}
		res.status(201).json({
			status: 'success',
			message: data.Location,
		});
	});
};

exports.deleteObject = (req, res) => {
	const { s3Client } = s3;
	const params = s3.uploadParams;
	const { link } = req.params;

	// eslint-disable-next-line prefer-destructuring
	params.Key = link.split('/')[3];

	s3Client.deleteObject(params, (err, data) => {
		if (err) {
			res.status(500).json({ error: `Error -> ${err}` });
		}
		res.status(201).json({
			status: 'success',
			data,
		});
	});
};
