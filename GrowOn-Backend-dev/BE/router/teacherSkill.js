const express = require('express');
const teacherSkillController = require('../controller/teacherSkill');

const router = express.Router();

router.post('/', teacherSkillController.Create);
router.get('/', teacherSkillController.getAllData);
// router
// .route('/')
// .post(teacherSkillController.Create)
// .get(teacherSkillController.getAllData);

router
	.route('/:id')
	.get(teacherSkillController.getByID)
	.put(teacherSkillController.Update);

module.exports = router;
