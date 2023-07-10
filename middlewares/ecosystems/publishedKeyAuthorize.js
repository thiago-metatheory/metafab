/*
 * Ecosystem Published Key Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize ecosystem
 * specifc actions or data retrieval from a game or client
 * that has the ecosystems published key.
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const publishedKey = request.get('X-Ecosystem-Key');

  if (!publishedKey) {
    return response.respond(401, 'X-Ecosystem-Key header must be provided.');
  }

  const ecosystem = await prisma.ecosystem.findUnique({
    where: { publishedKey },
  });

  if (!ecosystem) {
    return response.respond(401, 'Ecosystem does not exist for provided published key.');
  }

  request.ecosystem = ecosystem;

  next();
});
