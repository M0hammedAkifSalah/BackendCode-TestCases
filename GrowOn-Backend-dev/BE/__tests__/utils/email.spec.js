/* eslint-disable no-undef */
import nodemailer from 'nodemailer';
import sendEmail from '../../utils/email';

describe('sendEmail', () => {
	it('should send an email', async () => {
		// Set up the email options
		const options = {
			email: 'recipient@example.com',
			subject: 'Test email',
			message: 'This is a test email',
		};

		// Mock the nodemailer.createTransport function
		const mockTransporter = {
			sendMail: jest.fn().mockResolvedValue(true),
		};
		nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);

		// Call the sendEmail function
		await sendEmail(options);

		// Assert that the transporter's sendMail function was called with the correct arguments
		expect(mockTransporter.sendMail).toHaveBeenCalledWith({
			from: 'Vijay kumar <vksoni2616@gmail.com',
			to: 'recipient@example.com',
			subject: 'Test email',
			text: 'This is a test email',
		});
	});
});
