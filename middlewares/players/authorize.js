/*
 * Players Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize player specific game
 * actions or sensitive player data retrieval
 */

const playerUtils = rootRequire('/libs/playerUtils');

module.exports = asyncMiddleware(async (request, response, next) => {
  const accessToken = request.get('X-Authorization');

  if (!accessToken) {
    return response.respond(401, 'X-Authorization header must be provided.');
  }

  const player = await playerUtils.getAuthorizedPlayer(accessToken);

  if (!player) {
    return response.respond(401, 'Invalid authorization.');
  }

  if (player.accessTokenExpiresAt && player.accessTokenExpiresAt.getTime() < Date.now()) {
    return response.respond(401, 'Access token has expired. This player must authenticate again.');
  }

  request.player = player;

  next();
});
