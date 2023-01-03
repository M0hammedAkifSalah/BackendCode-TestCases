const express = require('express');

const router = express.Router();
const InnovationController = require('../controller/innovations');

router.post('/get', InnovationController.GetAllInnovations);

router.post('/count', InnovationController.count);

router.post('/:id', InnovationController.SingleInnovation);
router.post('/', InnovationController.CreateInnovations);
router.post('/update/:id', InnovationController.UpdateInnovations);
router.post('/Like/:id', InnovationController.Like);
router.post('/Dislike/:id', InnovationController.Dislike);
router.post('/viewed/:id', InnovationController.Viewed);
router.put('/update/:id', InnovationController.UpdateInnovationsteacher);
router.post('/delete/:id', InnovationController.InnovationsArchive);

// InnovationsArchive
module.exports = router;
