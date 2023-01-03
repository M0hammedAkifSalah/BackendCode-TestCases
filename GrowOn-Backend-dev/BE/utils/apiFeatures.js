class APIFeatures {
	constructor(query, queryString) {
		this.query = query;
		this.queryString = queryString;
	}

	filter() {
		const queryObj = { ...this.queryString };
		const { searchValue } = queryObj;
		const { filterKeysArray } = queryObj;
		const excludeFields = [
			'page',
			'sort',
			'limit',
			'fields',
			'id',
			'filterKeysArray',
			'searchValue',
		];
		excludeFields.forEach(el => {
			delete queryObj[el];
		});
		for (const el in queryObj) {
			if (!Array.isArray(queryObj[el]) && typeof queryObj[el] === 'object') {
				const tem = {
					$elemMatch: queryObj[el],
				};
				queryObj[el] = tem;
			}
		}
		let queryStr = JSON.stringify(queryObj);
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

		const findSearchObj = {};
		const searchArray = [];
		const finalObjArray = [];

		if (searchValue) {
			for (const ele of filterKeysArray) {
				const element = {
					[ele]: { $regex: searchValue, $options: 'i' },
				};
				searchArray.push(element);
				if (typeof searchValue === 'number') {
					searchArray.push({
						[ele]: searchValue,
					});
				} else {
					searchArray.push({
						[ele]: { $regex: searchValue, $options: 'i' },
					});
				}
			}

			if (searchArray && searchArray.length) {
				findSearchObj.$or = searchArray;
				finalObjArray.push(findSearchObj);
			}
		}

		queryStr = JSON.parse(queryStr);
		let findObj = {};
		if (queryStr && Object.keys(queryStr).length) {
			finalObjArray.push(queryStr);
			if (finalObjArray.length == 1) findObj = queryStr;
			else findObj.$and = finalObjArray;
		} else if (searchArray && searchArray.length) findObj.$or = searchArray;
		this.query.find(findObj);
		return this;
	}

	sort() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-createdAt');
		}
		return this;
	}

	sortA() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('session_start_Date');
		}
		return this;
	}

	sortbyname() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('name');
		}
		return this;
	}

	sortbyCount() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-question_count');
		}
		return this;
	}

	sortByNumber() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('sequence_number');
		}
		return this;
	}

	limitFields() {
		if (this.queryString.fields) {
			const fields = this.queryString.fields.split(',').join(' ');
			this.query = this.query.select(fields);
		} else {
			this.query = this.query.select('-__v');
		}

		return this;
	}

	paginate() {
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 20;
		const skip = (page - 1) * limit;

		this.query = this.query.skip(skip).limit(limit);

		return this;
	}

	count() {
		this.query = this.query.count();
		return this;
	}
}

module.exports = APIFeatures;
