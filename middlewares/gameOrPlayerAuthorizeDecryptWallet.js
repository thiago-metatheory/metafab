/*
 * Game Or Player Authorization With Wallet Decryption For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used for routes where a game and game wallet, or player
 * and player wallet can interact with the routes functionality. Such as
 * transfer transactions, burn, etc.
 *
 */

const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const playerAuthorize = rootRequire('/middlewares/players/authorize');
const playerDecryptWallet = rootRequire('/middlewares/players/decryptWallet');

module.exports = asyncMiddleware(async (request, response, next) => {
  const authKeyOrToken = request.get('X-Authorization');

  if (!authKeyOrToken) {
    return response.respond(401, 'X-Authorization must be provided.');
  }

  const isGame = authKeyOrToken.includes('game_sk_'); // must be game secret key

  if (isGame) {
    await new Promise(resolve => gameSecretKeyAuthorize(request, response, resolve));
    await new Promise(resolve => gameDecryptWallet(request, response, resolve));
  } else {
    await new Promise(resolve => playerAuthorize(request, response, resolve));
    await new Promise(resolve => playerDecryptWallet(request, response, resolve));
  }

  return next();
});
