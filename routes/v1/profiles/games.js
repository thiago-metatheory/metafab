/*
 * Route: /profiles/:profileId/games
 */

const profileAuthorize = rootRequire('/middlewares/profiles/authorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/profiles/{profileId}/games:
 *    get:
 *      operationId: getProfileGames
 *      summary: Get profile games
 *      description:
 *        Returns an array of games the authorized profile has connected player accounts for.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved array of games this profile has connected
 *            player accounts for.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: string
 *                    name:
 *                      type: string
 *                    publishedKey:
 *                      type: string
 *                    iconImageUrl:
 *                      type: string
 *                    coverImageUrl:
 *                      type: string
 *                    primaryColorHex:
 *                      type: string
 *                    createdAt:
 *                      type: string
 *                    players:
 *                      type: array
 *                      items:
 *                        $ref: '#/components/schemas/PublicPlayer'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.get('/', profileAuthorize);
router.get('/', asyncMiddleware(async (request, response) => {
  const { profileId } = request.params;

  const players = await prisma.player.findMany({
    where: { profileId },
    select: {
      id: true,
      gameId: true,
      walletId: true,
      connectedWalletId: true,
      username: true,
      profilePermissions: true,
      createdAt: true,
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

  if (!players || !players.length) {
    throw new Error('No associated games found for provided profileId.');
  }

  const games = await prisma.game.findMany({
    where: {
      id: { in: [ ...new Set(players.map(player => player.gameId)) ] },
    },
    select: {
      id: true,
      name: true,
      publishedKey: true,
      iconImageUrl: true,
      coverImageUrl: true,
      primaryColorHex: true,
      createdAt: true,
    },
  });

  const normalized = players.reduce((normalized, player) => {
    const game = games.find(game => game.id === player.gameId);

    normalized[game.id] = games[game.id] || {
      ...game,
      players: [],
    };

    player.custodialWallet = player.wallet;
    player.wallet = player.connectedWallet || player.wallet;

    delete player.connectedWallet;

    normalized[game.id].players.push(player);

    return normalized;
  }, {});

  response.success(Object.values(normalized));
}));

/**
 *  @openapi
 *  /v1/profiles/{profileId}/games/{gameId}:
 *    get:
 *      operationId: getProfileGame
 *      summary: Get profile game
 *      description:
 *        Returns a game this profile has connected player accounts for.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/pathGameId'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved array of games this profile has connected
 *            player accounts for.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  name:
 *                    type: string
 *                  publishedKey:
 *                    type: string
 *                  iconImageUrl:
 *                    type: string
 *                  coverImageUrl:
 *                    type: string
 *                  primaryColorHex:
 *                    type: string
 *                  createdAt:
 *                    type: string
 *                  players:
 *                    type: array
 *                    items:
 *                      $ref: '#/components/schemas/PublicPlayer'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.get('/:gameId', profileAuthorize);
router.get('/:gameId', asyncMiddleware(async (request, response) => {
  const { profileId, gameId } = request.params;

  const players = await prisma.player.findMany({
    where: { profileId, gameId },
    select: {
      id: true,
      gameId: true,
      walletId: true,
      connectedWalletId: true,
      username: true,
      profilePermissions: true,
      createdAt: true,
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

  if (!players || !players.length) {
    throw new Error('No associated game found for provided profileId and gameId.');
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      name: true,
      publishedKey: true,
      iconImageUrl: true,
      coverImageUrl: true,
      primaryColorHex: true,
      createdAt: true,
    },
  });

  game.players = [];

  players.forEach(player => {
    player.custodialWallet = player.wallet;
    player.wallet = player.connectedWallet || player.wallet;

    delete player.connectedWallet;

    game.players.push(player);
  });

  response.success(game);
}));

/*
 * Export
 */

module.exports = router;
