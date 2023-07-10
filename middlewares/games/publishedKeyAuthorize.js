/*
 * Game Published Key Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize game
 * specifc actions or data retrieval from a game or client
 * that has the games published key.
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const publishedKey = request.get('X-Game-Key');

  if (!publishedKey) {
    return response.respond(401, 'X-Game-Key header must be provided.');
  }

  const game = await prisma.game.findUnique({
    where: { publishedKey },
    include: {
      wallet: {
        select: {
          id: true,
          address: true,
        },
      },
      fundingWallet: {
        select: {
          id: true,
          address: true,
        },
      },
    },
  });

  if (!game) {
    return response.respond(401, 'Game does not exist for provided published key.');
  }

  if (!game.verified) {
    throw new Error('Please verify the email address of your game to continue. To send another verification email, use the game auth endpoint.');
  }

  request.game = game;

  next();
});
