/*
 * Express
 */

express.response.respond = function(httpCode, data) {
  this.status(httpCode).set('Connection', 'close').json(data);
};

express.response.success = function(data) {
  const httpCode = data !== undefined ? 200 : 204;

  this.respond(httpCode, data);
};

express.response.error = function(data) {
  this.respond(400, data);
};

/*
 * Data Types & Serialization
 */

BigInt.prototype.toJSON = function() {
  return Number(this);
};
