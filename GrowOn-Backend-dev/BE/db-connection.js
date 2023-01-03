import mongoose from 'mongoose';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo = null;

export const connectDatabase = async () => {
	mongo = await MongoMemoryServer.create();
	const uri = mongo.getUri();

	await mongoose
		.connect(uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log('Database connected');
		});
};

export const closeDatabase = async () => {
	await mongoose.connection.dropDatabase();
	await mongoose.connection.close();
	await mongo.stop();
};
