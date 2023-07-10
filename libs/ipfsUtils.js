const { Readable } = require('stream');
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY,
});

const isAuthenticated = new Promise(resolve => pinata.testAuthentication().then(resolve()));

async function pinFile(fileBuffer, fileExtension) {
  await isAuthenticated;

  const readableStream = Readable.from(fileBuffer);

  readableStream.path = `file.${fileExtension}`;

  const result = await pinata.pinFileToIPFS(readableStream, {
    pinataMetadata: {
      name: `file-${Date.now()}`,
    },
  });

  return result.IpfsHash;
}

async function pinJSON(obj) {
  await isAuthenticated;

  const result = await pinata.pinJSONToIPFS(obj);

  return result.IpfsHash;
}

/*
 * Export
 */

module.exports = {
  pinFile,
  pinJSON,
};
