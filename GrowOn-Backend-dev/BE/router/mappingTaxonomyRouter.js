const express = require('express');
const taxonomyMappingController = require('../controller/mappingTaxonomyController');

const router = express.Router();

router
	.route('/')
	.get(taxonomyMappingController.getAllClass)
	.post(taxonomyMappingController.createMapping);

router
	.route('/:id')
	.get(taxonomyMappingController.getTour)
	.put(taxonomyMappingController.updateTour)
	.delete(taxonomyMappingController.deleteTour);

module.exports = router;
