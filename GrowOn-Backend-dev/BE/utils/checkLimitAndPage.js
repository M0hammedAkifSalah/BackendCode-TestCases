const checkLimitAndPage = req => {
	if (req.params) {
		if (req.params.limit) {
			req.body.limit = req.params.limit;
		}
		if (req.params.page) {
			req.body.page = req.params.page;
		}
		if (req.query.limit) {
			req.body.limit = req.query.limit;
		}
		if (req.query.page) {
			req.body.page = req.query.page;
		}
	}
};

module.exports = checkLimitAndPage;
