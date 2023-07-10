/*
 * Ecosystem Secret Key Authorization For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Intended to be used to authorize sensitive ecosystem
 * specific actions or data retrieval from a server or protected
 * source that has the ecosystem's secret key.
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const secretKey = request.get('X-Authorization');

  if (!secretKey) {
    return response.respond(401, 'X-Authorization header must be provided.');
  }

  const ecosystem = await prisma.ecosystem.findUnique({
    where: { secretKey },
  });

  if (!ecosystem) {
    return response.respond(401, 'Invalid authorization.');
  }

  request.ecosystem = ecosystem;

  next();
});
