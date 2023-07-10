/*
 * Game Wallet Decryption For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to decrypt game wallet for
 * evm transactions and other related operations.
 *
 * Must be mounted after a game authorize middleware.
 */

const cryptoUtils = rootRequire('/libs/cryptoUtils');
const walletUtils = rootRequire('/libs/walletUtils');

module.exports = asyncMiddleware(async (request, response, next) => {
  const { game } = request;
  const walletDecryptKey = request.get('X-Wallet-Decrypt-Key') || request.get('X-Password');

  if (!game) {
    return response.respond(401, 'No authorized game.');
  }

  if (!walletDecryptKey) {
    return response.respond(400, 'X-Wallet-Decrypt-Key header must be provided.');
  }

  const { ciphertext } = await prisma.wallet.findUnique({
    where: { id: game.walletId },
    select: { ciphertext: true },
  });

  let decryptedWallet;

  try { // pbkdf2 + x-password backwards compatiblity
    decryptedWallet = cryptoUtils.aesDecryptWallet(ciphertext, walletDecryptKey);
  } catch (error) {
    // required for devs that may still pass plaintext x-password
    decryptedWallet = cryptoUtils.aesDecryptWallet(ciphertext, cryptoUtils.pbkdf2(walletDecryptKey));
  }

  request.wallet = game.wallet;
  request.walletSigner = walletUtils.getWalletSigner(decryptedWallet.privateKey);

  next();
});
