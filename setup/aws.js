const aws = require('aws-sdk');

// Configure AWS
aws.config = new aws.Config({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION_OVERRIDE ?  process.env.AWS_REGION_OVERRIDE : 'us-east-1',
});
