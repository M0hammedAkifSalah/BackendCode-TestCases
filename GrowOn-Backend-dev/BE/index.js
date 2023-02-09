/* eslint-disable no-shadow */
const { NODE_ENV = 'development' } = process.env;

require('dotenv').config({
	path: `.${NODE_ENV}.env`,
});

//// APM setup
const apm = require('elastic-apm-node');

const { ELASTIC_APM_SERVICE_NAME, ELASTIC_APM_SERVER_URL } = process.env;

apm.start({
	serviceName: ELASTIC_APM_SERVICE_NAME,
	serverUrl: ELASTIC_APM_SERVER_URL,
	active: NODE_ENV === 'production',
	captureBody: 'errors',
});

const express = require('express');
const fileupload = require('express-fileupload');

const app = express();
const cors = require('cors');
const bodyparser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const firebase = require('firebase-admin');

const { createAdapter } = require('@socket.io/mongo-adapter');
const { setupWorker } = require('@socket.io/sticky');
const { MongoClient } = require('mongodb');

const { createServer } = require('http');

const mongoClient = new MongoClient(process.env.mongoConnectionString, {
	useUnifiedTopology: true,
});

const httpServer = createServer(app);
const io = require('socket.io')(httpServer, {
	cors: {
		origin: '*',
	},
});

if (NODE_ENV !== 'development') {
	mongoClient
		.connect()
		.then(() => {
			const mongoCollection = mongoClient
				.db('lms')
				.collection('socket.io-adapter-events');

			mongoCollection.createIndex(
				{ createdAt: 1 },
				{ expireAfterSeconds: 3600, background: true }
			);

			io.adapter(
				createAdapter(mongoCollection, {
					addCreatedAtField: true,
				})
			);

			setupWorker(io);
		})
		.catch(err => {
			console.log(err);
		});
}

const winston = require('./config/winston');
const image = require('./router/upload.router');
const swaggerDocument = require('./docs/swagger.json');
const serviceAccount = require('./growon-3300b-firebase-adminsdk-1ga4o-0661848f0e.json');
const ErrorResponse = require('./utils/errorResponse');
const errorHandler = require('./utils/errorHandler');
const protect = require('./middleware/protect');

process.env.TZ = 'Asia/Kolkata';

firebase.initializeApp({
	credential: firebase.credential.cert(serviceAccount),
});

mongoose
	.connect(process.env.mongoConnectionString, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		readPreference: 'secondaryPreferred',
	})
	.then(() => {
		console.log('connected to database');
	})
	.catch(() => {
		console.log('Mongodb connection error');
	});
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

app.use(cors());
app.use(
	bodyparser.urlencoded({
		limit: '3mb',
		extended: false,
	})
);
app.use(bodyparser.json({ limit: '3mb' }));
app.use(fileupload());

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization'
	);
	if (req.method === 'OPTIONS') {
		res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
		return res.status(200).json({});
	}
	next();
});
app.use(express.json());

// morgan logger
app.use(
	morgan('combined', {
		stream: winston.stream,
	})
);

// cron jobs on single instance of server
const instanceId = Number(process.env.INSTANCE_ID);

if (NODE_ENV !== 'development' && instanceId === 1) {
	// eslint-disable-next-line global-require
	require('./jobs');
}

// swagger docs
app.use(`/api/v1/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/checkenv', (req, res) => {
	res.json({ env: process.env.NODE_ENV });
});

app.use(protect);

// socket
const socketRoutes = require('./socketRoutes');

io.on('connection', socket => socketRoutes(io, socket));

app.use('/api/v1/razorpay', require('./router/razorpay'));

app.use('/api/v1/role', require('./router/role'));
app.use('/api/v1/globalContent', require('./router/globalcontent'));
app.use('/api/v1/SignUp', require('./router/user'));
app.use('/api/v1/student', require('./router/student'));
app.use('/api/v1/parent', require('./router/parent'));
app.use('/api/v1/otp', require('./router/otp'));
app.use('/api/v1/auth', require('./router/auth'));
app.use('/api/v1/coin', require('./router/coin'));

app.use('/api/v1/class', require('./router/class'));
app.use('/api/v1/section', require('./router/section'));
app.use('/api/v1/branch', require('./router/branch'));
app.use('/api/v1/school', require('./router/school'));
app.use('/api/v1/country', require('./router/country'));
app.use('/api/v1/city', require('./router/city'));
app.use('/api/v1/stype', require('./router/stype'));
app.use('/api/v1/state', require('./router/state'));

app.use('/api/v1/principal', require('./router/principal'));
app.use('/api/v1/management', require('./router/management'));
app.use('/api/v1/admin', require('./router/admin'));
app.use('/api/v1/userRole', require('./router/userRole'));
app.use('/api/v1/subject', require('./router/subject'));
app.use('/api/v1/syllabus', require('./router/syllabus'));
app.use('/api/v1/attendance', require('./router/attendance'));
app.use('/api/v1/userattendance', require('./router/userAttendance'));
app.use('/api/v1/institute', require('./router/institute'));
app.use('/api/v1/doc', require('./router/profile'));
app.use('/api/v1/question_category', require('./router/questionType'));
app.use('/api/v1/exam_type', require('./router/examType'));
app.use('/api/v1/topic', require('./router/topic'));
app.use('/api/v1/learnOutcome', require('./router/learnOutcome'));
app.use('/api/v1/chapter', require('./router/chapter'));
app.use('/api/v1/board', require('./router/board'));
app.use('/api/v1/objectiveQuestion', require('./router/objectiveQuestion'));
app.use(
	'/api/v1/generatedQuestionWithId',
	require('./router/generatedQuestionWithId')
);

app.use('/api/v1/generatedQuestion', require('./router/generateQuestion'));
app.use('/api/v1/actualQuestions', require('./router/actaulQuestion'));
app.use('/api/v1/announcement', require('./router/announcement'));
app.use('/api/v1/assignment', require('./router/assignment'));
app.use('/api/v1/activity', require('./router/activity'));
app.use('/api/v1/scheduleClass', require('./router/schedule_class'));
app.use('/api/v1/session', require('./router/session'));
app.use('/api/v1/bookmarks', require('./router/bookMark'));
app.use('/api/v1/group', require('./router/group'));
app.use('/api/v1/reward', require('./router/reward'));
app.use('/api/v1/innovation', require('./router/innovations'));
app.use('/api/v1/learning', require('./router/learning'));
app.use('/api/v1/achievements', require('./router/Achievements'));
app.use('/api/v1/teacher/skill', require('./router/teacherSkill'));
app.use('/api/v1/teacher', require('./router/teacher'));
app.use('/api/v1/dashboard/stats', require('./router/stats_dashboard'));
app.use('/api/v1/performances', require('./router/performance'));
app.use('/api/v1/feedType', require('./router/feed_type'));
app.use('/api/v1/awardBadge', require('./router/award_badge'));
app.use('/api/v1/mappingtaxonomy', require('./router/mappingTaxonomyRouter'));
app.use('/api/v1/answer', require('./router/question_answer'));
app.use('/api/v1/test', require('./router/studentTest'));
app.use('/api/v1/contentGroup', require('./router/contentGroup'));
app.use('/api/v1/curriculum', require('./router/curriculum'));
app.use('/api/v1/post', require('./router/post'));
app.use('/api/v1/features', require('./router/features'));
app.use('/api/v1/filedirectory', require('./router/fileDirectory'));
app.use('/api/v1/assessment', require('./router/questionPaper'));

app.use('/', image);

app.all('*', (req, res, next) => {
	next(new ErrorResponse(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use((err, req, res, nxt) => {
	apm.captureError(err);
	errorHandler(err, req, res, nxt);
});

const port = process.env.port || 3000;

httpServer.listen(port, () => {
	console.log(`server in running on PORT: ${port} - ENV: ${NODE_ENV}`);
});

exports.apm = apm;
