const mongoose = require('mongoose');

const globalcontentSchema = mongoose.Schema(
	{
		_id: mongoose.Schema.Types.ObjectId,

		display_image: {
			type: String,
			default: null,
		},
		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active',
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

const GlobalContent = mongoose.model('GlobalContent', globalcontentSchema);

module.exports = GlobalContent;
