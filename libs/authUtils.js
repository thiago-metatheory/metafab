const crypto = require('crypto');

function generateToken(prefix = '', size = 64) {
  const randomToken = crypto.randomBytes(size).toString('base64url').slice(0, size);

  return `${prefix}${randomToken}`;
}

/*
 * Export
 */

module.exports = {
  generateToken,
};
