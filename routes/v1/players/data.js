/*
 * Route: /players/:playerId/data
 */

const playerUtils = rootRequire('/libs/playerUtils');
const gameOrPlayerAuthorize = rootRequire('/middlewares/gameOrPlayerAuthorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/players/{playerId}/data:
 *    get:
 *      operationId: getPlayerData
 *      summary: Get player data
 *      description:
 *        Returns the latest public and protected data as an object for the provided
 *        playerId.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/pathPlayerId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved player data. Returns latest player data object.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  protectedData:
 *                    type: object
 *                  publicData:
 *                    type: object
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { playerId } = request.params;

  const existingPlayer = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });

  if (!existingPlayer) {
    throw new Error('Invalid playerId provided.');
  }

  const playerData = await playerUtils.readPlayerData(playerId);

  response.success(playerData);
}));

/**
 *  @openapi
 *  /v1/players/{playerId}/data:
 *    post:
 *      operationId: setPlayerData
 *      summary: Set player data
 *      description:
 *        Creates or updates public and/or protected data for the provided playerId.
 *        Data updates are performed using deep merging. This means that when you
 *        update any top level or nested properties specific to player public or protected
 *        data, you only need to include the properties you are making changes to. Any existing
 *        properties not included in request body arguments will be retained on the player data object.
 *
 *
 *        Please note, When writing an array type for a player, arrays do not follow the deep merge
 *        approach. If you add or remove an item from an array, the entire array must be passed
 *        as an argument when updating the related property for player public or protected data.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/pathPlayerId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                protectedData:
 *                  type: object
 *                  description:
 *                    protectedData can only be set if `X-Authorization` includes
 *                    credentials for the game the target player is a part of.
 *                    Expects an arbitrary object allowed to contain any set of properties
 *                    and nested data within those properties, including arrays.
 *
 *
 *                    protectedData is great for storing sensitive player data like tracking
 *                    experience points, off-chain inventories, save states, and more - things
 *                    that players shouldn't have the ability to directly change themselves.
 *                publicData:
 *                  type: object
 *                  description:
 *                    publicData can be set if `X-Authorization` includes
 *                    credentials for the target player or game the player is a part of.
 *                    Expects an arbitrary object allowed to contain any set of properties
 *                    and nested data within those properties, including arrays.
 *
 *
 *                    publicData is great for storing player preferences like
 *                    in-game settings, non-sensitive data and more. Anything that a player
 *                    should have the ability to directly change themselves without
 *                    client or server verification can be stored in publicData.
 *      responses:
 *        200:
 *          description:
 *            Successfully set player data. Returns latest player data object.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  protectedData:
 *                    type: object
 *                  publicData:
 *                    type: object
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameOrPlayerAuthorize);
router.post('/', asyncMiddleware(async (request, response) => {
  const { game, player } = request;
  const { playerId } = request.params;
  const { protectedData, publicData } = request.body;

  const existingPlayer = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!existingPlayer) {
    throw new Error('Invalid playerId provided.');
  }

  const isGameWriter = game && game.id === existingPlayer.gameId;
  const isPlayerWriter = player && player.id === playerId;
  const dataUpdate = { updatedAt: Math.floor(Date.now() / 1000) };

  if (!isGameWriter && !isPlayerWriter) {
    return response.respond(401, 'Authorized game or player does not have permission to write data for provided playerId.');
  }

  if (protectedData && isPlayerWriter) {
    return response.respond(401, 'Players do not have authorization to write protected data.');
  }

  if (isGameWriter) {
    dataUpdate.protectedData = protectedData || {};
  }

  if (isGameWriter || isPlayerWriter) {
    dataUpdate.publicData = publicData || {};
  }

  const playerData = await playerUtils.writePlayerData(playerId, dataUpdate);

  response.success(playerData);
}));

/*
 * Export
 */

module.exports = router;
