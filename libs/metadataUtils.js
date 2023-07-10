const got = require('got');
const ipfsUtils = rootRequire('/libs/ipfsUtils');
const redisUtils = rootRequire('/libs/redisUtils');

async function getMetadata(metadataUrl) {
  let metadata = await redisUtils.getObject(metadataUrl); // read from cache

  if (!metadata) {
    const requestUrl = metadataUrl.includes('ipfs://')
      ? metadataUrl.replace('ipfs://', 'https://ipfs.trymetafab.com/ipfs/')
      : metadataUrl;

    metadata = await got.get(requestUrl).json();

    await redisUtils.setObject(metadataUrl, metadata); // cache
  }

  metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.trymetafab.com/ipfs/');

  return metadata;
}

async function pinMetadata({ id, imageUrl, name, description, externalUrl, attributes, data = {} }) {
  const metadata = {
    id,
    image: imageUrl,
    name,
    description,
    externalUrl,
    attributes,
    data,
  };

  const metadataIpfsHash = await ipfsUtils.pinJSON(metadata);
  const metadataUrl = `ipfs://${metadataIpfsHash}`;

  await redisUtils.setObject(metadataUrl, metadata); // cache

  return metadataUrl;
}

/*
 * Exports
 */

module.exports = {
  getMetadata,
  pinMetadata,
};
