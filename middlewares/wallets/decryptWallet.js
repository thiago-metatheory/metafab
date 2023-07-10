/*
 * Wallet Decryption For Matching Routes
 * Possible Route Usage: /{any}/:walletId/{any}
 *
 * Intended to be used to decrypt wallet for evm transactions
 * and other related operations.
 */

const cryptoUtils = rootRequire('/libs/cryptoUtils');
const walletUtils = rootRequire('/libs/walletUtils');

module.exports = asyncMiddleware(async (request, response, next) => {
  const { walletId } = request.params;
  const walletDecryptKey = request.get('X-Wallet-Decrypt-Key') || request.get('X-Password');

  if (!walletId) {
    throw new Error('walletId must be provided.');
  }

  if (!walletDecryptKey) {
    throw new Error('X-Wallet-Decrypt-Key header must be provided.');
  }

  if (walletDecryptKey.length > 64) { // profile connected wallets
    const { profileId, profileWalletPrivateKey } = JSON.parse(await cryptoUtils.kmsSymmetricDecrypt(walletDecryptKey));

    request.walletSigner = walletUtils.getWalletSigner(profileWalletPrivateKey); // signer or delegate is always custodial

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { wallet: true },
    });

    if (profile.wallet.id !== walletId || profile.wallet.address !== request.walletSigner.address) {
      throw new Error('Wallet id provided is not associated with provided decrypt key (id or address mismatch).');
    }
  } else {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet does not exist for provided walletId.');
    }

    if (!wallet.ciphertext) {
      throw new Error('EOA wallets credentials are not stored and therefore cannot be decrypted.');
    }

    let decryptedWallet;

    try { // pbkdf2 + x-password backwards compatiblity
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, walletDecryptKey);
    } catch (error) {
      // required for devs that may have created players post pbkdf2 update but still pass plaintext password
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, cryptoUtils.pbkdf2(walletDecryptKey));
    }

    request.wallet = wallet;
    request.walletSigner = walletUtils.getWalletSigner(decryptedWallet.privateKey);
  }

  next();
});
