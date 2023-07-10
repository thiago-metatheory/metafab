/*
 * Profiles Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize profile specific
 * actions or sensitive profile data retrieval
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const accessToken = request.get('X-Authorization');

  if (!accessToken) {
    return response.respond(401, 'X-Authorization header must be provided.');
  }

  const profile = await prisma.profile.findUnique({
    where: { accessToken },
    include: {
      wallet: {
        select: {
          id: true,
          address: true,
        },
      },
      connectedWallet: {
        select: {
          id: true,
          address: true,
        },
      },
    },
  });

  if (!profile) {
    return response.respond(401, 'Invalid authorization.');
  }

  request.profile = profile;

  next();
});
