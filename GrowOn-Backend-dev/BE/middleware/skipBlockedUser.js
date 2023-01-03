/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-param-reassign */
const mongoose = require('mongoose');

const { Model } = mongoose;

function parseUpdateArguments(conditions, doc, options, callback) {
	if (typeof options === 'function') {
		// .update(conditions, doc, callback)
		callback = options;
		options = null;
	} else if (typeof doc === 'function') {
		// .update(doc, callback);
		callback = doc;
		doc = conditions;
		conditions = {};
		options = null;
	} else if (typeof conditions === 'function') {
		// .update(callback)
		callback = conditions;
		conditions = undefined;
		doc = undefined;
		options = undefined;
	} else if (typeof conditions === 'object' && !doc && !options && !callback) {
		// .update(doc)
		doc = conditions;
		conditions = undefined;
		options = undefined;
		callback = undefined;
	}

	const args = [];

	if (conditions) args.push(conditions);
	if (doc) args.push(doc);
	if (options) args.push(options);
	if (callback) args.push(callback);

	return args;
}

module.exports = function (schema) {
	const mongooseMajorVersion = +mongoose.version[0]; // 4, 5...

	const overrideItems = [
		'count',
		'countDocuments',
		'find',
		'findOne',
		'findOneAndUpdate',
		'update',
		'updateOne',
		'updateMany',
		'aggregate',
	];

	overrideItems.forEach(method => {
		if (['count', 'countDocuments', 'find', 'findOne'].indexOf(method) > -1) {
			let modelMethodName = method;

			// countDocuments do not exist in Mongoose v4
			if (
				mongooseMajorVersion < 5 &&
				method === 'countDocuments' &&
				typeof Model.countDocuments !== 'function'
			) {
				modelMethodName = 'count';
			}

			schema.statics[method] = function () {
				const query = Model[modelMethodName].apply(this, arguments);

				if (!arguments[2] || !arguments[2].withProfileStatus) {
					query.where({ profileStatus: 'APPROVED' });
				} else if (arguments[2].withProfileStatus !== 'ALL') {
					query.where({ profileStatus: arguments[2].withProfileStatus });
				}

				query.where({ deleted: false });

				return query;
			};
		} else if (method === 'aggregate') {
			schema.pre('aggregate', function () {
				let isModified = false;

				this.pipeline().forEach(step => {
					if (step.$match && step.$match.withProfileStatus) {
						isModified = true;

						step.$match = {
							...step.$match,
							profileStatus: step.$match.withProfileStatus,
						};

						if (step.$match.withProfileStatus === 'ALL') {
							delete step.$match.profileStatus;
						}

						delete step.$match.withProfileStatus;
					}
				});

				if (!isModified) {
					this.pipeline().unshift({
						$match: {
							profileStatus: 'APPROVED',
						},
					});
				}

				let searchObj = null;
				let searchObjIdx = -1;

				this.pipeline().forEach((step, idx) => {
					if (step.$search) {
						searchObj = {
							$search: step.$search,
						};
						searchObjIdx = idx;
					}
				});

				if (searchObj) {
					this.pipeline().splice(searchObjIdx, 1);
					this.pipeline().splice(0, 0, searchObj);
				}
			});
		} else {
			schema.statics[method] = function () {
				const args = parseUpdateArguments.apply(undefined, arguments);

				args[0].profileStatus = 'APPROVED';
				args[0].deleted = {
					$ne: true,
				};

				if (args[0] && args[0].withProfileStatus) {
					if (args[0].withProfileStatus === 'ALL') {
						delete args[0].profileStatus;
					} else {
						args[0].profileStatus = args[0].withProfileStatus;
					}
				}

				delete args[0].withProfileStatus;

				return Model[method].apply(this, args);
			};
		}
	});
};
