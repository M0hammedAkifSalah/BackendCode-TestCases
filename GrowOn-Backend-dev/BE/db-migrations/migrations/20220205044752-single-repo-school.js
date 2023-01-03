const { Types } = require('mongoose');

module.exports = {
	async up(db) {
		const ToObjectId = Types.ObjectId;
		const schools = await db.collection('schools').find({}).toArray();

		const operations = schools.map(scho => {
			const city =
				scho.city && scho.city.length > 2 ? ToObjectId(scho.city) : null;
			const state =
				scho.state && scho.state.length > 2 ? ToObjectId(scho.state) : null;
			const country =
				scho.country && scho.country.length > 2
					? ToObjectId(scho.country)
					: null;

			const classList = [];
			if (Array.isArray(scho.classList) && scho.classList.length > 0) {
				scho.classList.forEach(id => {
					if (id.length > 2) {
						classList.push(ToObjectId(id));
					}
				});
			}

			return db.collection('schools').updateOne(
				{ _id: scho._id },
				{
					$set: {
						city,
						state,
						country,
						classList,
					},
				}
			);
		});

		return Promise.all(operations);
	},

	async down() {
		return Promise.resolve('ok');
	},
};
