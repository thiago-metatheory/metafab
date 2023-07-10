/*
 * Route: /players
 */

const bcrypt = require('bcryptjs');
const authUtils = rootRequire('/libs/authUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const emailUtils = rootRequire('/libs/emailUtils');
const playerUtils = rootRequire('/libs/playerUtils');
const gamePublishedKeyAuthorize = rootRequire('/middlewares/games/publishedKeyAuthorize');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const playerAuthorize = rootRequire('/middlewares/players/authorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/players/auth:
 *    get:
 *      operationId: authPlayer
 *      summary: Authenticate player
 *      description:
 *        Returns an existing player object containing access token, wallet,
 *        and other details for a game when provided a valid username and
 *        password login using Basic Auth.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *        - $ref: '#/components/parameters/queryAccessTokenExpiresAt'
 *      security:
 *        - basicAuth: []
 *      responses:
 *        200:
 *          description:
 *            Succesfully authorized the request and retrieved a player object
 *            containing access token, wallet, and other details.
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

router.get('/auth', gamePublishedKeyAuthorize);
router.get('/auth', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { accessTokenExpiresAt } = request.query;
  const basicAuth = atob(request.get('Authorization').split(' ')[1]); // "Basic {auth}"
  const [ username, password ] = basicAuth.split(':');

  if (!username || !password) {
    return response.respond(401, 'Invalid basic auth.');
  }

  const player = await playerUtils.getAuthenticatedPlayer(game.id, username, password);

  if (accessTokenExpiresAt || (player.accessTokenExpiresAt && Date.now() > player.accessTokenExpiresAt.getTime())) {
    player.accessToken = authUtils.generateToken('player_at_');
    player.accessTokenExpiresAt = accessTokenExpiresAt ? new Date(accessTokenExpiresAt * 1000) : null;

    await prisma.player.update({
      where: { id: player.id },
      data: {
        accessToken: player.accessToken,
        accessTokenExpiresAt: player.accessTokenExpiresAt,
      },
    });
  }

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/players:
 *    get:
 *      operationId: getPlayers
 *      summary: Get players
 *      description:
 *        Returns all players for the authenticated game as an array of player objects.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved players.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/PublicPlayer'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.get('/', gameSecretKeyAuthorize);
router.get('/', asyncMiddleware(async (request, response) => {
  const { game } = request;

  const players = await playerUtils.getPublicPlayers(game.id);

  response.success(players);
}));

/**
 *  @openapi
 *  /v1/players/{playerId}:
 *    get:
 *      operationId: getPlayer
 *      summary: Get player
 *      description:
 *        Returns a player object for the provided player id.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/pathPlayerId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved player.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/PublicPlayer'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:playerId', asyncMiddleware(async (request, response) => {
  const { playerId } = request.params;

  const player = await playerUtils.getPublicPlayer(playerId);

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/players:
 *    post:
 *      operationId: createPlayer
 *      summary: Create player
 *      description:
 *        Create a new player for a game. Players are automatically associated
 *        with an internally managed wallet.
 *
 *
 *        Player access tokens can be used to directly interact with any
 *        MetaFab managed contracts, currencies, items collections, marketplaces
 *        and more. Player interactions are also gasless by default, completely
 *        removing all crypto friction for players to engage with your MetaFab
 *        supported games.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *        - $ref: '#/components/parameters/queryAccessTokenExpiresAt'
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
 *                    The players username, used to authenticate the player
 *                    and if desired represent them in game. Usernames are unique.
 *                    There cannot be 2 users with the same username created for
 *                    a game.
 *                password:
 *                  type: string
 *                  description:
 *                    The password to authenticate as the player. Additionally,
 *                    this password is used to encrypt/decrypt a player's primary
 *                    wallet and must be provided anytime this player makes blockchain
 *                    interactions through various endpoints.
 *                  format: password
 *                  example: aReallyStrongPassword123
 *                recoveryEmail:
 *                  type: string
 *                  description:
 *                    An email that can be used to recover this player.
 *                    If the player forgets their username or password, a
 *                    reset request can be triggered through MetaFab to send
 *                    an account recovery & password reset email to this email
 *                    address.
 *                  example: backupEmail@gmail.com
 *              required:
 *                - username
 *                - password
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new player. Returns a player object containing
 *            a wallet (used to interact with contracts, currencies, etc).
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/PlayerModel'
 *                  - type: object
 *                    properties:
 *                      backupCodes:
 *                        type: array
 *                        description: One-time use backup codes for player account recovery.
 *                        items:
 *                          type: string
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

router.post('/', gamePublishedKeyAuthorize);
router.post('/', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { accessTokenExpiresAt } = request.query;
  const { username, password, recoveryEmail } = request.body;

  if (!username || !password) {
    throw new Error('username and password must be provided.');
  }

  const player = await playerUtils.createPlayer({
    game,
    username,
    password,
    recoveryEmail,
    accessTokenExpiresAt,
  });

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/players/auth/{serviceName}:
 *    post:
 *      operationId: authPlayerByService
 *      summary: Authenticate player by service
 *      description:
 *        Returns an existing player object or creates a new player object if
 *        necessary by using the provided authentication service details and
 *        related account credentials, like an oauth access token.
 *
 *
 *        Service based authentication currently supports Discord.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/pathServiceName'
 *        - $ref: '#/components/parameters/headerGameKey'
 *        - $ref: '#/components/parameters/queryAccessTokenExpiresAt'
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
 *                    If a player does not exist for the provided service access token
 *                    or service credential, this username will be used
 *                    for the created player account. If this is not provided when creating
 *                    a user, a default username will be assigned such as their equivalent discord
 *                    username for discord service auth, twitter handle for twitter auth, etc.
 *                    If a player account exists for the provided credentials, this will be ignored.
 *                serviceCredential:
 *                  type: string
 *                  description:
 *                    The authentication credential used to authenticate against
 *                    the service. Depending on the service, this value may be
 *                    an oauth access code, oauth access token, external wallet signature, or some
 *                    other value required by the service to perform the authentication.
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new player. Returns a player object containing
 *            a wallet (used to interact with contracts, currencies, etc).
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

router.post('/auth/:serviceName', gamePublishedKeyAuthorize);
router.post('/auth/:serviceName', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { serviceName } = request.params;
  const { accessTokenExpiresAt } = request.query;
  const { username, serviceCredential } = request.body;

  if (![ 'discord', 'google', 'twitter', 'wallet' ].includes(serviceName)) {
    throw new Error(`${serviceName} is not a supported auth service.`);
  }

  if (!serviceCredential) {
    throw new Error('serviceCredential must be provided.');
  }

  const player = await playerUtils.authServicePlayer(game, username, serviceName, serviceCredential, accessTokenExpiresAt);

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/players/recover:
 *    post:
 *      operationId: recoverPlayer
 *      summary: Recover player
 *      description:
 *        Recover a player that has forgotten their password by using one of their
 *        one time use backup codes or information provided through the email
 *        recovery process.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                  description: The player's id. `id` or `username` is required.
 *                username:
 *                  type: string
 *                  description: The player's username. `id` or `username` is required.
 *                backupCode:
 *                  type: string
 *                  description: A valid one-time use backup code required to recover the player and set a new password.
 *                recoveryEmailCode:
 *                  type: string
 *                  description: A one-time use code from a recover account email. Required to be provided with `recoveryEmailDecryptKey`.
 *                recoveryEmailDecryptKey:
 *                  type: string
 *                  description: A generated decrypt key from a recover account email. Required to be provided with `recoveryEmailCode`.
 *                newPassword:
 *                  type: string
 *                  description: A new password. The player's old password will no longer be valid.
 *                  format: password
 *              required:
 *                - newPassword
 *      responses:
 *        200:
 *          description:
 *            Successfully recovered a player. Returns a player object.
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

router.post('/recover', gamePublishedKeyAuthorize);
router.post('/recover', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { id, username, backupCode, recoveryEmailCode, recoveryEmailDecryptKey, newPassword } = request.body;

  if (!id && !username) {
    throw new Error('id or username must be provided.');
  }

  const lookup = id ? { id, gameId: game.id } : { gameId: game.id, username };
  const player = await playerUtils.getPublicPlayerByLookup(lookup, false, false, false, true);

  if (recoveryEmailDecryptKey && (!recoveryEmailCode || player.recoveryEmailCode !== recoveryEmailCode)) {
    throw new Error('Invalid recoveryEmailCode.');
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: player.custodialWallet.id },
  });

  let decryptedWallet;

  for (let i = 0; i < wallet.backupCiphertexts.length; i++) {
    try {
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.backupCiphertexts[i], backupCode || recoveryEmailDecryptKey);
      wallet.backupCiphertexts.splice(i, 1); // remove backup code, only 1 time use.
      break;
    } catch (error) { /* noop */}
  }

  if (!decryptedWallet) {
    throw new Error('Provided backupCode or recoveryEmailDecryptKey is invalid.');
  }

  const newAccessToken = authUtils.generateToken('player_at_');
  const newWalletDecryptKey = cryptoUtils.pbkdf2(newPassword);
  const newWalletCiphertext = cryptoUtils.aesEncryptWallet(decryptedWallet, newWalletDecryptKey);

  await prisma.player.update({
    where: { id: player.id },
    data: {
      accessToken: newAccessToken,
      password: bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10)),
      recoveryEmailCode: null, // unset code, it'll be set next request.
      wallet: {
        update: {
          ciphertext: newWalletCiphertext,
          backupCiphertexts: wallet.backupCiphertexts,
        },
      },
    },
  });

  player.accessToken = newAccessToken;
  player.walletDecryptKey = newWalletDecryptKey;

  delete player.recoveryEmailCode;

  response.success(player);
}));

/**
 *  @openapi
 *  /v1/players/startRecover:
 *    post:
 *      operationId: startRecoverPlayer
 *      summary: Start recover player
 *      description:
 *        Starts the player recovery process. Sends a reset password email to the email
 *        provided if a matching player account is found. Please note, each time this endpoint
 *        is called, a new email will be sent and a new `recoveryEmailCode` will be assigned,
 *        voiding all prior emails sent.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  description:
 *                    A valid recovery email address for a player of your
 *                    game to send a recovery email to.
 *                redirectUri:
 *                  type: string
 *                  description:
 *                    The base uri for where players will be sent to when they
 *                    click the link in the reset password email.
 *              required:
 *                - email
 *      responses:
 *        204:
 *          description:
 *            Successfully sent a recovery email.
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/startRecover', gamePublishedKeyAuthorize);
router.post('/startRecover', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { email, redirectUri } = request.body;

  if (!email) {
    throw new Error('email must be provided.');
  }

  const salt = await cryptoUtils.kmsSymmetricDecrypt(game.saltCiphertext);
  const player = await playerUtils.getPublicPlayerByLookup({
    gameId: game.id,
    recoveryEmailLookup: cryptoUtils.sha3(`${email}${salt}`),
  });

  if (!player) {
    throw new Error(`No player for this game found with the recovery email ${email}`);
  }

  const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(email, salt);
  const recoveryEmailCode = authUtils.generateToken('', 8);

  await prisma.player.update({
    where: { id: player.id },
    data: { recoveryEmailCode },
  });

  await emailUtils.sendPlayerRecoveryEmail(email, game, player, recoveryEmailDecryptKey, recoveryEmailCode, redirectUri);

  if (process.env.NODE_ENV === 'local') { // for tests
    return response.success({
      id: player.id,
      recoveryEmailDecryptKey,
      recoveryEmailCode,
    });
  }

  response.success();
}));

/**
 *  @openapi
 *  /v1/players/{playerId}:
 *    patch:
 *      operationId: updatePlayer
 *      summary: Update player
 *      description:
 *        Update various fields specific to a player. Such as changing its
 *        password and resetting its access token.
 *      tags:
 *        - Players
 *      parameters:
 *        - $ref: '#/components/parameters/pathPlayerIdAuthenticated'
 *        - $ref: '#/components/parameters/headerAuthorizationPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                currentPassword:
 *                  type: string
 *                  description: The player's current password. Must be provided if setting `newPassword`.
 *                  format: password
 *                newPassword:
 *                  type: string
 *                  description: A new password. The player's old password will no longer be valid.
 *                  format: password
 *                recoveryEmail:
 *                  type: string
 *                  description:
 *                    An email that can be used to recover this player.
 *                    If the player forgets their username or password, a
 *                    reset request can be triggered through MetaFab to send
 *                    an account recovery & password reset email to this email
 *                    address. `currentPassword` must also be provided.
 *                  example: backupEmail@gmail.com
 *                resetAccessToken:
 *                  type: boolean
 *                  description: Revokes the player's previous access token and returns a new one if true.
 *                resetBackupCodes:
 *                  type: boolean
 *                  description: Invalidates all player backup codes and generates new ones if true. `currentPassword` must also be provided.
 *      responses:
 *        200:
 *          description: Returns the updated player object.
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
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.patch('/:playerId', playerAuthorize);
router.patch('/:playerId', asyncMiddleware(async (request, response) => {
  const { player } = request;
  const { playerId } = request.params;
  const {
    currentPassword,
    newPassword,
    recoveryEmail,
    resetAccessToken,
    resetBackupCodes,
  } = request.body;

  if (player.id != playerId) {
    return response.respond(401, `X-Authorization invalid for player id ${playerId}`);
  }

  const update = { wallet: { update: {} } };

  let wallet;
  let decryptedWallet;

  // decrypt wallet for use
  if (currentPassword) {
    if (!bcrypt.compareSync(currentPassword, player.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    wallet = await prisma.wallet.findUnique({
      where: { id: player.custodialWallet.id },
    });

    const currentWalletDecryptKey = cryptoUtils.pbkdf2(currentPassword);

    try {
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, currentWalletDecryptKey);
    } catch (error) { // backwards compatibility for old password encrypted wallets.
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, currentPassword);
    }
  }

  // change password
  if (newPassword) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change password.');
    }

    const newWalletDecryptKey = cryptoUtils.pbkdf2(newPassword);

    player.walletDecryptKey = newWalletDecryptKey;
    update.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    update.wallet.update.ciphertext = cryptoUtils.aesEncryptWallet(decryptedWallet, newWalletDecryptKey);
  }

  // update recovery email
  if (recoveryEmail) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change recovery email.');
    }

    const game = await prisma.game.findUnique({
      where: { id: player.gameId },
    });

    const salt = await cryptoUtils.kmsSymmetricDecrypt(game.saltCiphertext);
    const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(recoveryEmail, salt);
    update.recoveryEmailLookup = cryptoUtils.sha3(`${recoveryEmail}${salt}`);
    update.wallet.update.backupCiphertexts = [ cryptoUtils.aesEncryptWallet(decryptedWallet, recoveryEmailDecryptKey) ];

    const playerWithRecoveryEmailExists = await prisma.player.findFirst({
      where: {
        gameId: game.id,
        recoveryEmailLookup: update.recoveryEmailLookup,
      },
    });

    if (playerWithRecoveryEmailExists) {
      throw new Error(`A player already exists for this game with the recovery email ${recoveryEmail}.`);
    }
  }

  // reset access token, or reset if password changed
  if (resetAccessToken || newPassword) {
    update.accessToken = authUtils.generateToken('player_at_');
  }

  // reset backup codes
  if (resetBackupCodes) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to reset backup codes.');
    }

    const walletBackupCodes = [];
    const walletBackupCiphertexts = [];

    for (let i = 0; i < 6; i++) {
      const code = authUtils.generateToken('', 8);

      walletBackupCodes.push(code);
      walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(decryptedWallet, code));
    }

    player.backupCodes = walletBackupCodes;
    update.wallet.update.backupCiphertexts = update.wallet.update.backupCiphertexts || [];
    update.wallet.update.backupCiphertexts = [ ...walletBackupCiphertexts, ...update.wallet.update.backupCiphertexts ];

    if (wallet.backupCiphertexts.length === 7) {
      update.wallet.update.backupCiphertexts.push(wallet.backupCiphertexts[6]); // include recovery email backup
    }
  }

  // update
  await prisma.player.update({
    where: { id: player.id },
    data: update,
  });

  delete player.password;
  delete update.recoveryEmailLookup;
  delete update.password;
  delete update.wallet;

  player.custodialWallet = player.wallet;
  player.wallet = player.connectedWallet || player.wallet;

  delete player.connectedWallet;

  response.success({
    ...player,
    ...update,
  });
}));

/*
 * Export
 */

module.exports = router;
