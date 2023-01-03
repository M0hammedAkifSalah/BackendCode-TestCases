const {
	Schema,
	model,
	Schema: {
		Types: { ObjectId },
	},
} = require('mongoose');

const FileDirectorySchema = new Schema(
	{
		name: { type: String, required: false },
		type: {
			type: String,
			required: [true, 'type is required'],
			enum: ['FILES', 'FOLDER'],
		},
		description: {
			type: String,
			required: false,
		},
		groupId: {
			type: ObjectId,
			ref: 'ContentGroup',
			required: [true, 'groupId is required'],
			index: true,
		},
		parentFolder: {
			type: ObjectId,
			index: true,
			default: null,
		},
		files: {
			type: [
				{
					type: String,
					required: [true, 'file is required'],
				},
			],
			default: [],
		},
		uploadedBy: {
			type: ObjectId,
			ref: 'User',
			required: false,
		},
	},
	{ timestamps: true }
);

FileDirectorySchema.index({ groupId: 1, parentFolder: 1 });
FileDirectorySchema.index({
	name: 'text',
});

module.exports = model('FileDirectory', FileDirectorySchema);
