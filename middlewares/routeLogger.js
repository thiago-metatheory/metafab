/**
 * This is a middleware that will log all the requests that are coming to the server.
 * This can be helpful for debugging and logging.
 */
module.exports.routeLogger = asyncMiddleware(async (request, response, next) => {
  const start = process.hrtime();

  response.on('finish', () => {
    const duration = process.hrtime(start);
    const ms = duration[0] * 1000 + duration[1] / 1e6;
    console.log(response.statusCode, request.path, request.method, ':', ms.toFixed(0) + 'ms');
  });

  next();
});