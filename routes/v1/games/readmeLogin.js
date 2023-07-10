/*
 * Route: /games/:gameId/readmeLogin
 */

const bcrypt = require('bcryptjs');
const readmeUtils = rootRequire('/libs/readmeUtils');

const router = express.Router({
  mergeParams: true,
});

/**
 * Undocumented API Endpoint, just used for readme docs login
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { gameId } = request.params;
  const { password } = request.query;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (!game) {
    throw new Error('Invalid game id.');
  }

  if (!bcrypt.compareSync(password, game.password)) {
    return response.respond(401, 'Incorrect email or password.');
  }

  const authToken = readmeUtils.generateLoginAuthToken(game);

  response.success(`https://docs.trymetafab.com/docs/first-steps-start-here?auth_token=${authToken}`);
}));

/*
 * Export
 */

module.exports = router;
