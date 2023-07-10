/*
 * Game Or Player Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used for routes where a game or player
 * can interact with the routes functionality. Such as
 * shared player data writing, etc.
 *
 */

const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const playerAuthorize = rootRequire('/middlewares/players/authorize');

module.exports = asyncMiddleware(async (request, response, next) => {
  const authKeyOrToken = request.get('X-Authorization');

  if (!authKeyOrToken) {
    return response.respond(401, 'X-Authorization must be provided.');
  }

  const isGame = authKeyOrToken.includes('game_sk_'); // must be game secret key

  if (isGame) {
    await new Promise(resolve => gameSecretKeyAuthorize(request, response, resolve));
  } else {
    await new Promise(resolve => playerAuthorize(request, response, resolve));
  }

  return next();
});
