require('dotenv').config();

const env = {
	AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	REGION: process.env.REGION,
	Bucket: process.env.Bucket,
};

// For S3
//  Access key ID :- AKIASF6X6BXQYUMCVFVP
//  secret access key:- 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
//  User ARN :- arn:aws:iam::150239841761:user/s3BucketPermission
module.exports = env;
