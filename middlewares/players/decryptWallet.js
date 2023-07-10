/*
 * Player Wallet Decryption For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to decrypt player wallet for
 * evm transactions and other related operations.
 *
 * Must be mounted after a player authorize middleware.
 */

const cryptoUtils = rootRequire('/libs/cryptoUtils');
const walletUtils = rootRequire('/libs/walletUtils');

module.exports = asyncMiddleware(async (request, response, next) => {
  const { player } = request;
  const walletDecryptKey = request.get('X-Wallet-Decrypt-Key') || request.get('X-Password');

  if (!player) {
    return response.respond(401, 'No authorized player.');
  }

  if (!walletDecryptKey) {
    return response.respond('X-Wallet-Decrypt-Key header must be provided.');
  }

  if (walletDecryptKey.length > 64) { // profile connected wallets
    const { profileId, profileWalletPrivateKey } = JSON.parse(await cryptoUtils.kmsSymmetricDecrypt(walletDecryptKey));

    if (player.profileId !== profileId) {
      throw new Error('Profile authorization has expired.');
    }

    const { connectedWallet, wallet } = player.profile;

    request.wallet = connectedWallet || wallet;
    request.wallet.permissions = player.profilePermissions;
    request.wallet.playerId = player.id;
    request.walletSigner = walletUtils.getWalletSigner(profileWalletPrivateKey); // signer or delegate is always custodial
  } else { // standard player wallets
    const { ciphertext } = await prisma.wallet.findUnique({
      where: { id: player.custodialWallet.id },
      select: { ciphertext: true },
    });

    let decryptedWallet;

    try { // pbkdf2 + x-password backwards compatiblity
      decryptedWallet = cryptoUtils.aesDecryptWallet(ciphertext, walletDecryptKey);
    } catch (error) {
      // required for devs that may have created players post pbkdf2 update but still pass plaintext password
      decryptedWallet = cryptoUtils.aesDecryptWallet(ciphertext, cryptoUtils.pbkdf2(walletDecryptKey));
    }

    request.wallet = player.connectedWallet || player.wallet;
    request.walletSigner = walletUtils.getWalletSigner(decryptedWallet.privateKey); // signer or delegate is always custodial
  }

  next();
});
