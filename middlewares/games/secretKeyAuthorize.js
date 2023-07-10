/*
 * Game Secret Key Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize sensitive game
 * specific actions or data retrieval from a server or protected
 * source that has the games secret key.
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const secretKey = request.get('X-Authorization');

  if (!secretKey) {
    return response.respond(401, 'X-Authorization header must be provided.');
  }

  const game = await prisma.game.findUnique({
    where: { secretKey },
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
    return response.respond(401, 'Invalid authorization.');
  }

  if (!game.verified) {
    throw new Error('Please verify the email address of your game to continue. To send another verification email, use the game auth endpoint.');
  }

  request.game = game;

  next();
});
