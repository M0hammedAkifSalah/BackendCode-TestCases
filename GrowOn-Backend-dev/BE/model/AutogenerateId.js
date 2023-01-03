// todo not in use
const Autoidmodule = {
	autogenerateId: request => {
		const milliseconds = new Date().getTime();
		const finalId =
			request +
			milliseconds +
			Math.floor(10000 + Math.random() * 90000).toString();
		return finalId;
	},
};

module.exports = Autoidmodule;
