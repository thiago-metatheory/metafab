const aws = require('aws-sdk');

const s3 = new aws.S3();

async function readS3File(bucket, key) {
  return s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();
}

async function writeS3File(bucket, key, buffer) {
  const uploadResult = await s3.putObject({
    Body: buffer,
    Bucket: bucket,
    Key: key,
  }).promise();

  return {
    result: uploadResult,
    s3Url: `s3://${bucket}/${key}`,
    url: `https://${bucket}.s3.amazonaws.com/${key}`,
  };
}

/*
 * Export
 */

module.exports = {
  readS3File,
  writeS3File,
};
