const { model, Schema } = require('mongoose');

const announcementSchema = new Schema(
	{
		title: {
			type: String,
			required: [true, 'Assigement Title Required'],
		},
		description: {
			type: String,
			required: false,
		},
		attachments: {
			type: [String],
			required: false,
			default: [],
		},
		teacher_id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Teacherid is required'],
		},
		school_id: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'School id is required'],
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		assignedTo: {
			type: String,
			enum: ['STUDENT', 'TEACHER', 'BOTH'],
			required: true,
		},
		likes: {
			type: [Schema.Types.ObjectId],
			select: false,
			default: [],
		},
		acknowledgements: {
			type: [Schema.Types.ObjectId],
			select: false,
			default: [],
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: true },
	}
);

announcementSchema.index({
	title: 'text',
});

const Announcement = model('Announcement', announcementSchema);

module.exports = Announcement;
