const express = require('express');

const router = express.Router();
const upload = require('../config/multer.config.js');

const awsWorker = require('../controller/aws.controller');

router.post('/api/v1/file/upload', upload.single('file'), awsWorker.doUpload);

router.delete('/api/v1/file/:link/delete', awsWorker.deleteObject);

module.exports = router;
