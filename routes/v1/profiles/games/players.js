/*
 * Route: /profiles/:profileId/games/:gameId/players
 */

const authUtils = rootRequire('/libs/authUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const playerUtils = rootRequire('/libs/playerUtils');
const profileUtils = rootRequire('/libs/profileUtils');
const walletUtils = rootRequire('/libs/walletUtils');
const profileAuthorize = rootRequire('/middlewares/profiles/authorize');
const profileDecryptWallet = rootRequire('/middlewares/profiles/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/profiles/{profileId}/games/{gameId}/players/auth:
 *    get:
 *      operationId: authProfilePlayer
 *      summary: Authenticate profile player
 *      description:
 *        Returns an existing player object containing access token, wallet,
 *        wallet decrypt key, profile authorization and other details for a game when
 *        provided profile authentication and the player's username.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/pathGameId'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyProfile'
 *        - $ref: '#/components/parameters/headerUsername'
 *      responses:
 *        200:
 *          description:
 *            Succesfully authorized the request and retrieved a player object
 *            containing access token, wallet, profile authorization, and other details.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/PlayerModel'
 *                  - type: object
 *                    properties:
 *                      walletDecryptKey:
 *                        type: string
 *                        description: This field has not had a description added.
 *                      wallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *                      custodialWallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.get('/auth', profileAuthorize);
router.get('/auth', profileDecryptWallet);
router.get('/auth', asyncMiddleware(async (request, response) => {
  const { profile, walletSigner } = request;
  const { gameId } = request.params;
  const username = request.get('X-Username');

  const player = await playerUtils.getAuthenticatedProfilePlayer(gameId, profile.id, username);

  player.walletDecryptKey = await cryptoUtils.kmsSymmetricEncrypt(
    JSON.stringify({
      profileId: player.profileId,
      profileWalletPrivateKey: walletSigner.privateKey,
    }),
  );

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/profiles/{profileId}/games/{gameId}/players:
 *    post:
 *      operationId: createProfilePlayer
 *      summary: Create profile player
 *      description:
 *        Creates a new player account for the provided game id linked to the
 *        authenticating profile. The created player account will default to using
 *        the parent profile's wallet for any transactions, wallet content balance
 *        checks and verifications, and more.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/pathGameId'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyProfile'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                  description:
 *                    The username to assign to the created player.
 *                permissions:
 *                  $ref: '#/components/schemas/ProfilePermissions'
 *              required:
 *                - username
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new player linked to the authenticating profile.
 *            Returns a player object.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/PlayerModel'
 *                  - type: object
 *                    properties:
 *                      walletDecryptKey:
 *                        type: string
 *                        description: This field has not had a description added.
 *                      wallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *                      custodialWallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', profileAuthorize);
router.post('/', profileDecryptWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { profile, walletSigner } = request;
  const { gameId, profileId } = request.params;
  const { username, permissions } = request.body;
  const walletDecryptKey = request.get('X-Wallet-Decrypt-Key');

  if (profile.id != profileId) {
    return response.respond(401, `X-Authorization invalid for profile id ${profileId}`);
  }

  if (permissions) {
    profileUtils.validatePermissions(permissions);
  }

  if (!username) {
    throw new Error('username must be provided.');
  }

  const gameExists = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (!gameExists) {
    throw new Error('Game does not exist for provided gameId.');
  }

  const playerExists = await prisma.player.findFirst({
    where: { gameId, username },
  });

  if (playerExists) {
    throw new Error(`A player for this game with the username ${username} already exists.`);
  }

  const generatedWallet = walletUtils.generateRandomWallet();
  const walletCiphertext = cryptoUtils.aesEncryptWallet(generatedWallet, walletDecryptKey);

  const player = await prisma.player.create({
    data: {
      username,
      accessToken: authUtils.generateToken('player_at_'),
      profilePermissions: permissions || {},
      game: {
        connect: { id: gameId },
      },
      profile: {
        connect: { id: profile.id },
      },
      wallet: {
        create: {
          address: generatedWallet.address,
          ciphertext: walletCiphertext,
        },
      },
    },
    include: {
      wallet: {
        select: { id: true, address: true },
      },
    },
  });

  player.custodialWallet = player.wallet;
  player.wallet = profile.wallet;
  player.walletDecryptKey = await cryptoUtils.kmsSymmetricEncrypt(
    JSON.stringify({
      profileId: player.profileId,
      profileWalletPrivateKey: walletSigner.privateKey,
    }),
  );

  delete player.password;

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/profiles/{profileId}/games/{gameId}/players/{playerId}:
 *    patch:
 *      operationId: updateProfilePlayer
 *      summary: Update profile player
 *      description:
 *        Update various fields specific to a player. Such as changing its
 *        permissions.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/pathGameId'
 *        - $ref: '#/components/parameters/pathPlayerId'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyProfile'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                permissions:
 *                  $ref: '#/components/schemas/ProfilePermissions'
 *      responses:
 *        200:
 *          description:
 *            Successfully updated the player.
 *            Returns a player object.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/PlayerModel'
 *                  - type: object
 *                    properties:
 *                      wallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *                      custodialWallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.patch('/:playerId', profileAuthorize);
router.patch('/:playerId', profileDecryptWallet);
router.patch('/:playerId', asyncMiddleware(async (request, response) => {
  const { profile } = request;
  const { gameId, playerId } = request.params;
  const { permissions } = request.body;

  const player = await playerUtils.getPublicPlayer(playerId);

  if (player.gameId !== gameId) {
    throw new Error('Player does not belong to provided gameId.');
  }

  if (player.profileId !== profile.id) {
    throw new Error('Player is not connected to authorized profile.');
  }

  const update = {};

  if (permissions) {
    profileUtils.validatePermissions(permissions);

    update.profilePermissions = permissions;
  }

  await prisma.player.update({
    where: { id: playerId },
    data: update,
  });

  response.success({
    ...player,
    ...update,
  });
}));

/*
 * Export
 */

module.exports = router;
