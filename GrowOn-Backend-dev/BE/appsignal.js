const { Appsignal } = require('@appsignal/nodejs');

const { APPSIGNAL_APP_NAME, APPSIGNAL_API_KEY, NODE_ENV } = process.env;

exports.appsignal = new Appsignal({
	name: APPSIGNAL_APP_NAME,
	pushApiKey: APPSIGNAL_API_KEY,
	active: NODE_ENV === 'production',
	environment: NODE_ENV,
});
