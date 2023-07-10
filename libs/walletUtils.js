const ethers = require('ethers');
const evmUtils = rootRequire('/libs/evmUtils');
const chainUtils = rootRequire('/libs/chainUtils');
const redisUtils = rootRequire('/libs/redisUtils');

function generateRandomWallet() {
  const wallet = ethers.Wallet.createRandom({
    extraEntropy: Math.floor(10 * 6 * 2021 * Math.random()),
  });

  return {
    address: wallet.address,
    ...wallet._signingKey(),
    ...wallet._mnemonic(),
  };
}

function getWalletSigner(privateKey) {
  return new ethers.Wallet(privateKey);
}

async function getHandledWalletNextNonce(connectedWalletSigner, wrappedAsyncFunc, useNetworkData) {
  const { address, provider } = connectedWalletSigner;
  const { chainId } = await evmUtils.getProviderNetworkOptimized(provider);
  const chain = chainUtils.getChainNameById(chainId);
  const lockTTLSeconds = 2;
  const acquireLockRetries = 300; // 300 retries @ 100ms = 30s
  const acquireLockRetryInterval = 100;
  let nonce;

  await redisUtils.autoLock(`${address}-${chain}:nonce`, async () => {
    nonce = await redisUtils.getAddressNonce(address, chain);

    if (![ 'number', 'string' ].includes(typeof nonce) || useNetworkData) {
      nonce = await connectedWalletSigner.getTransactionCount();
    }

    nonce = nonce * 1; // redis returns string, explicit int conversion.

    while (await redisUtils.isAddressNonceUsed(address, chain, nonce)) {
      nonce++;
    }

    await redisUtils.setAddressNonce(address, chain, nonce + 1); // set to next nonce
    await redisUtils.setAddressNonceUsed(address, chain, nonce);
  }, lockTTLSeconds, acquireLockRetries, acquireLockRetryInterval);

  try {
    return await wrappedAsyncFunc(nonce);
  } catch (error) {
    if (error.code !== 'NONCE_EXPIRED') {
      await redisUtils.setAddressNonceUnused(address, chain, nonce);
    }

    // revert the nonce to prevent a stuck nonce edge case
    await redisUtils.autoLock(`${address}-${chain}:nonce`, async () => {
      if (nonce < await redisUtils.getAddressNonce(address, chain)) {
        await redisUtils.setAddressNonce(address, chain, nonce);
      }
    });

    throw error;
  }
}

/*
 * Export
 */

module.exports = {
  generateRandomWallet,
  getWalletSigner,
  getHandledWalletNextNonce,
};
