const nodemailer = require('nodemailer');

const sendEmail = async options => {
	const transporter = nodemailer.createTransport({
		// service: 'Gmail', for gmail we use this

		host: process.env.EMAIL_HOST,
		port: process.env.EMAIL_PORT,
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD,
		},
		// Ativate in gmail "less secure app" option
	});

	const mailOptions = {
		from: 'Vijay kumar <vksoni2616@gmail.com',
		to: options.email,
		subject: options.subject,
		text: options.message,
		// html :
	};

	await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
