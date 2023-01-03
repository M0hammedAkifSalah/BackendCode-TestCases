const cron = require('node-cron');
const { appsignal } = require('../../appsignal');

const tracer = appsignal.tracer();

const SchoolModel = require('../../model/school');

// run everyday minute
cron.schedule('* * * * *', async () => {
	try {
		const startdate = new Date();
		startdate.setDate(startdate.getDate() + 30);
		await SchoolModel.findOneAndUpdate(
			{
				$expr: { $eq: ['$payment.dueDate', Date()] },
			},
			{ 'payment.dueDate': startdate },
			{
				new: true,
				runValidators: true,
			}
		);
	} catch (e) {
		tracer.setError(e);
	}
});
