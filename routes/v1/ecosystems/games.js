/*
 * Route: /ecosystems/:ecosystemId/games
 */

const ecosystemSecretKeyAuthorize = rootRequire('/middlewares/ecosystems/secretKeyAuthorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}/games:
 *    get:
 *      operationId: getEcosystemGames
 *      summary: Get ecosystem games
 *      description:
 *        Returns an array of games the ecosystem has approved.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathEcosystemId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of approved games.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/PublicGame'
 *        400:
 *          $ref: '#/components/responses/400'
 *
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { ecosystemId } = request.params;

  const ecosystemGames = await prisma.ecosystemGame.findMany({
    where: { ecosystemId },
    select: {
      game: {
        select: {
          id: true,
          name: true,
          publishedKey: true,
          redirectUris: true,
          iconImageUrl: true,
          coverImageUrl: true,
          primaryColorHex: true,
          updatedAt: true,
          createdAt: true,
        },
      },
    },
  });

  response.success(ecosystemGames.map(ecosystemGame => ecosystemGame.game));
}));

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}/games/{gameId}:
 *    get:
 *      operationId: getEcosystemGame
 *      summary: Get ecosystem game
 *      description:
 *        Returns a game object for the provided game id that the ecosystem has approved.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathEcosystemId'
 *        - $ref: '#/components/parameters/pathGameId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an approved game.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/PublicGame'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:gameId', asyncMiddleware(async (request, response) => {
  const { ecosystemId, gameId } = request.params;

  const ecosystemGame = await prisma.ecosystemGame.findFirst({
    where: { ecosystemId, gameId },
    select: {
      game: {
        select: {
          id: true,
          name: true,
          publishedKey: true,
          redirectUris: true,
          iconImageUrl: true,
          coverImageUrl: true,
          primaryColorHex: true,
          updatedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ecosystemGame) {
    throw new Error(`Game id ${gameId} is not approved for ecosystem ${ecosystemId}.`);
  }

  response.success(ecosystemGame.game);
}));

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}/games:
 *    post:
 *      operationId: approveEcosystemGame
 *      summary: Approve ecosystem game
 *      description:
 *        Approves a game for an ecosystem.
 *        By approving a game, it allows that game to integrate the ability
 *        for profile accounts from an ecosystem to login directly to the approved
 *        game and play. This also allows games to request access to assets held at
 *        the profile level for the game to frictionlessly interact with on behalf
 *        of the profile.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathEcosystemIdAuthenticated'
 *        - $ref: '#/components/parameters/headerAuthorizationEcosystem'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                gameId:
 *                  type: string
 *                  description: The id of the game being approved.
 *              required:
 *                - gameId
 *      responses:
 *        204:
 *          description:
 *            Successfully approved the game for the ecosystem.
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', ecosystemSecretKeyAuthorize);
router.post('/', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { gameId } = request.body;

  if (!gameId) {
    throw new Error('gameId must be provided.');
  }

  const ecosystemGameExists = await prisma.ecosystemGame.findFirst({
    where: {
      ecosystemId: ecosystem.id,
      gameId,
    },
  });

  if (ecosystemGameExists) {
    throw new Error('Provided gameId is already approved by ecosystem.');
  }

  await prisma.ecosystemGame.create({
    data: {
      ecosystem: { connect: { id: ecosystem.id } },
      game: { connect: { id: gameId } },
    },
  });

  response.success();
}));

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}/games/{gameId}:
 *    delete:
 *      operationId: unapproveEcosystemGame
 *      summary: Unapprove ecosystem game
 *      description:
 *        Unapproves a game for an ecosystem. The game will no longer be able to
 *        allow profiles from the ecosystem to login. All profile permissions
 *        approved for the game will also be revoked.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathEcosystemIdAuthenticated'
 *        - $ref: '#/components/parameters/pathGameId'
 *        - $ref: '#/components/parameters/headerAuthorizationEcosystem'
 *      responses:
 *        204:
 *          description:
 *            Successfully approved the game for the ecosystem.
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.delete('/:gameId', ecosystemSecretKeyAuthorize);
router.delete('/:gameId', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { gameId } = request.params;

  if (!gameId) {
    throw new Error('gameId must be provided.');
  }

  await prisma.ecosystemGame.deleteMany({
    where: {
      ecosystemId: ecosystem.id,
      gameId: gameId,
    },
  });

  response.success();
}));

/*
 * Export
 */

module.exports = router;
