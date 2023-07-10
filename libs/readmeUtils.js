const jwt = require('jsonwebtoken');

function generateLoginAuthToken(game) {
  const readmeUser = {
    name: game.email.split('@')[0],
    email: game.email,
    apiKey: {
      gameId: game.id,
      gamePublishedKey: game.publishedKey,
      gameSecretKey: game.secretKey,
    },
    version: 1,
  };

  return jwt.sign(readmeUser, process.env.README_JWT_SECRET);
}

/*
 * Export
 */

module.exports = {
  generateLoginAuthToken,
};
