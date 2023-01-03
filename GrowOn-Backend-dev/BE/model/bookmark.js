const mongoose = require('mongoose');

const bookmarkSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	student_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Student',
	},
	parent_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Parent',
	},
	bookmark_details: [
		{
			activity: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Activity',
			},
			bookmark_name: {
				type: String,
				required: false,
			},
		},
	],
	createdBy: {
		type: String,
		required: false,
	},
	updatedBy: {
		type: String,
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
	repository: {
		type: Array,
		required: false,
	},
});
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
