/*
 * Profile Wallet Decryption For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to decrypt profile wallet for
 * evm transactions and other related operations.
 *
 * Must be mounted after a profile authorize middleware.
 */

const cryptoUtils = rootRequire('/libs/cryptoUtils');
const walletUtils = rootRequire('/libs/walletUtils');

module.exports = asyncMiddleware(async (request, response, next) => {
  const { profile } = request;
  const walletDecryptKey = request.get('X-Wallet-Decrypt-Key');

  if (!profile) {
    return response.respond(401, 'No authorized profile.');
  }

  if (!walletDecryptKey) {
    throw new Error('X-Wallet-Decrypt-Key header must be provided.');
  }

  const profileWallet  = await prisma.wallet.findUnique({
    where: { id: profile.walletId },
  });

  const decryptedWallet = cryptoUtils.aesDecryptWallet(profileWallet.ciphertext, walletDecryptKey);

  request.wallet = profile.connectedWallet || profileWallet;
  request.walletSigner = walletUtils.getWalletSigner(decryptedWallet.privateKey); // signer or delegate is always custodial

  next();
});
