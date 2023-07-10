/*
 * Route: /games
 */

const bcrypt = require('bcryptjs');
const fileType = require('file-type');
const authUtils = rootRequire('/libs/authUtils');
const chainUtils = rootRequire('/libs/chainUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const fileUtils = rootRequire('/libs/fileUtils');
const walletUtils = rootRequire('/libs/walletUtils');
const emailUtils = rootRequire('/libs/emailUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/games/auth:
 *    get:
 *      operationId: authGame
 *      summary: Authenticate game
 *      description:
 *        Returns an existing game object containing authorization keys and
 *        credentials when provided a valid email (in place of username) and
 *        password login using Basic Auth.
 *      tags:
 *        - Games
 *      security:
 *        - basicAuth: []
 *      responses:
 *        200:
 *          description:
 *            Succesfully authorized the request and retrieved a game object
 *            containing authorization keys and credentials.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/GameModel'
 *                  - type: object
 *                    properties:
 *                      walletDecryptKey:
 *                        type: string
 *                        description: This field has not had a description added.
 *                      wallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *                      fundingWallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.get('/auth', asyncMiddleware(async (request, response) => {
  const basicAuth = atob(request.get('Authorization').split(' ')[1]); // "Basic {auth}"
  const [ email, password ] = basicAuth.split(':');

  if (!email || !password) {
    return response.respond(401, 'Invalid basic auth.');
  }

  const game = await prisma.game.findUnique({
    where: { email },
    include: {
      wallet: {
        select: {
          id: true,
          address: true,
        },
      },
      fundingWallet: {
        select: {
          id: true,
          address: true,
        },
      },
    },
  });

  if (!game) {
    return response.respond(401, `Game for email address ${email} does not exist.`);
  }

  if (!bcrypt.compareSync(password, game.password)) {
    return response.respond(401, 'Incorrect email or password.');
  }

  if (!game.verified) {
    await emailUtils.sendGameVerificationEmail(email, game.id, game.verificationCode);
    throw new Error(`Game has not been verified. A verification email has been sent to ${email}.`);
  }

  game.walletDecryptKey = cryptoUtils.pbkdf2(password);

  delete game.password;
  delete game.saltCiphertext;
  delete game.verificationCode;

  response.success(game);
}));

/**
 *  @openapi
 *  /v1/games/{gameId}:
 *    get:
 *      operationId: getGame
 *      summary: Get game
 *      description:
 *        Returns a game object for the provided game id.
 *      tags:
 *        - Games
 *      parameters:
 *        - $ref: '#/components/parameters/pathGameId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved game.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/PublicGame'
 *        400:
 *          $ref: '#/components/responses/400'
 *
 */

router.get('/:gameId', asyncMiddleware(async (request, response) => {
  const { gameId } = request.params;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      name: true,
      publishedKey: true,
      redirectUris: true,
      iconImageUrl: true,
      coverImageUrl: true,
      primaryColorHex: true,
      discordClientId: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!game) {
    throw new Error('Game does not exist for provided gameId.');
  }

  response.success(game);
}));

/**
 *  @openapi
 *  /v1/games:
 *    post:
 *      operationId: createGame
 *      summary: Create game
 *      description:
 *        Create a new game. A game is the root entity required for all API
 *        interactions. Contracts, currencies, items and more are deployed by
 *        games, player accounts are created and registered to games, etc.
 *
 *
 *        To use any of MetaFab's services, you must first create a game through
 *        this endpoint.
 *
 *
 *        After creating your game through this endpoint, a verification email will
 *        be sent to the email address used. Before you can access any of MetaFab's
 *        features, you'll need to click the link contained in the verification email
 *        to verify your account.
 *      tags:
 *        - Games
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  description: The name of the game you're creating.
 *                  example: NFT Worlds
 *                email:
 *                  type: string
 *                  description:
 *                    The email address associated with this game and
 *                    used to login/authenticate as the game.
 *                  format: email
 *                  example: dev@nftworlds.com
 *                password:
 *                  type: string
 *                  description:
 *                    The password to authenticate as the game. Additionally,
 *                    this password is used to encrypt/decrypt your game's primary
 *                    wallet and must be provided anytime this game makes blockchain
 *                    interactions through various endpoints.
 *                  format: password
 *                  example: aReallyStrongPassword123!
 *              required:
 *                - name
 *                - email
 *                - password
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new game. Returns a game object containing
 *            a wallet and fundingWallet property, respectively representing the
 *            games primary wallet address (used to deploy & interact with contract)
 *            and funding wallet address (used to cover gasless transaction fees).
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/GameModel'
 *                  - type: object
 *                    properties:
 *                      walletDecryptKey:
 *                        type: string
 *                        description: This field has not had a description added.
 *                      wallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *                      fundingWallet:
 *                        $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', asyncMiddleware(async (request, response) => {
  const { name, email, password } = request.body;

  if (!name || !email || !password) {
    throw new Error('name, email and password must be provided.');
  }

  const gameExists = await prisma.game.count({
    where: { email },
  });

  if (gameExists) {
    throw new Error(`A game for the email address ${email} already exists.`);
  }

  const walletDecryptKey = cryptoUtils.pbkdf2(password);
  const generatedWallet = walletUtils.generateRandomWallet();
  const walletCiphertext = cryptoUtils.aesEncryptWallet(generatedWallet, walletDecryptKey);

  const generatedFundingWallet = walletUtils.generateRandomWallet();
  const fundingWalletCiphertext = await cryptoUtils.kmsSymmetricEncrypt(
    cryptoUtils.aesEncryptWallet(
      generatedFundingWallet,
      process.env.FUNDING_WALLETS_PASSWORD,
    ),
  );

  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  const salt = cryptoUtils.generateStrongSalt();
  const saltCiphertext = await cryptoUtils.kmsSymmetricEncrypt(salt);

  const walletBackupCodes = [];
  const walletBackupCiphertexts = [];

  for (let i = 0; i < 6; i++) {
    const code = authUtils.generateToken('', 8);

    walletBackupCodes.push(code);
    walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(generatedWallet, code));
  }

  const game = await prisma.game.create({
    data: {
      email,
      password: hashedPassword,
      name,
      publishedKey: authUtils.generateToken('game_pk_'),
      secretKey: authUtils.generateToken('game_sk_'),
      saltCiphertext,
      wallet: {
        create: {
          address: generatedWallet.address,
          ciphertext: walletCiphertext,
          backupCiphertexts: walletBackupCiphertexts,
        },
      },
      fundingWallet: {
        create: {
          address: generatedFundingWallet.address,
          ciphertext: fundingWalletCiphertext,
        },
      },
    },
    include: {
      wallet: {
        select: {
          id: true,
          address: true,
        },
      },
      fundingWallet: {
        select: {
          id: true,
          address: true,
        },
      },
    },
  });

  await emailUtils.sendGameVerificationEmail(email, game.id, game.verificationCode);

  game.backupCodes = walletBackupCodes;
  game.walletDecryptKey = walletDecryptKey;

  delete game.password;
  delete game.saltCiphertext;
  delete game.verificationCode;

  response.success(game);
}));

/**
 *  @openapi
 *  /v1/games/{gameId}:
 *    patch:
 *      operationId: updateGame
 *      summary: Update game
 *      description:
 *        Update various fields specific to a game. Such as changing its password,
 *        resetting its published or secret key, or updating its RPCs.
 *      tags:
 *        - Games
 *      parameters:
 *        - $ref: '#/components/parameters/pathGameIdAuthenticated'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  description: A new name. Replaces the game's current name.
 *                email:
 *                  type: string
 *                  description:
 *                    A new email address. The game's old email will no longer be
 *                    valid for account authentication. `currentPassword` must also
 *                    be provided.
 *                  format: email
 *                currentPassword:
 *                  type: string
 *                  description: The game's current password. Must be provided if setting `newPassword` or `email`.
 *                  format: password
 *                newPassword:
 *                  type: string
 *                  description: A new password. The game's old password will no longer be valid.
 *                  format: password
 *                rpcs:
 *                  type: object
 *                  description:
 *                    "Sets a custom RPC for your game to use instead of MetaFab's default RPCs for
 *                    the chain(s) you specify.
 *
 *
 *                    Expects a JSON object containing key value pairs of
 *                    supported `chain` -> `rpc url`. Only the chain names provided as keys in the object
 *                    will be explicitly overriden. To delete a custom RPC for your game, provide
 *                    the chain name to delete as a key in the provided object and `null` as the value.
 *
 *
 *                    Set RPC example, `{ MATIC: 'https://polygon-rpc.com' }`
 *
 *                    Delete RPC example, `{ MATIC: null }`"
 *                  additionalProperties:
 *                    type: string
 *                  example: https://polygon-rpc.com
 *                redirectUris:
 *                  type: array
 *                  description:
 *                    An array of valid base redirect uris or exact uris that can be used for
 *                    the redirect uri of various MetaFab features such as player
 *                    login/registration, wallet connection and account recovery emails.
 *
 *
 *                    Expects base or exact uris. For example, you could use include a uri
 *                    of `https://trymetafab.com` and it would allow redirection to any valid
 *                    uri on the domain, such as `https://trymetafab.com/play/game`.
 *                  items:
 *                    type: string
 *                    example: http://localhost
 *                iconImageBase64:
 *                  type: string
 *                  description:
 *                    A base64 string of the icon image for this game. Supported
 *                    image formats are `jpg`, `jpeg`, `png`, `gif` Recommended
 *                    size is 512x512 pixels, or 1:1 aspect ratio. This image is
 *                    used for your auth/connect wallet flow and other MetaFab
 *                    features for your game.
 *                coverImageBase64:
 *                  type: string
 *                  description:
 *                    A base64 string of the cover image for this game. Supported
 *                    image formats are `jpg`, `jpeg`, `png`, `gif`. Recommended
 *                    size is 1600x1000 pixels, or 16:10 aspect ratio.  This image is
 *                    used as the background image for your auth/connect wallet flow and other
 *                    MetaFab features for your game.
 *                primaryColorHex:
 *                  type: string
 *                  description:
 *                    A valid hex color code. This color is used for your auth/connect
 *                    wallet flow to control the color of buttons and other brandable
 *                    MetaFab features for your game.
 *                  example: #AA41EF
 *                discordClientId:
 *                  type: string
 *                  description:
 *                    The client id of your Discord application. This is used by MetaFab
 *                    to enable "Login with Discord" for your game.
 *                resetPublishedKey:
 *                  type: boolean
 *                  description: Revokes the game's previous published key and returns a new one if true.
 *                resetSecretKey:
 *                  type: boolean
 *                  description: Revokes the game's previous secret key and returns a new on if true.
 *      responses:
 *        200:
 *          description: Returns the updated game object.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/GameModel'
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

router.patch('/:gameId', gameSecretKeyAuthorize);
router.patch('/:gameId', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { gameId } = request.params;
  const {
    name,
    email,
    currentPassword,
    newPassword,
    rpcs,
    redirectUris,
    iconImageBase64,
    coverImageBase64,
    primaryColorHex,
    discordClientId,
    resetPublishedKey,
    resetSecretKey,
  } = request.body;

  if (game.id != gameId) {
    return response.respond(401, `X-Authorization invalid for game id ${gameId}`);
  }

  const update = {};

  if (name) {
    update.name = name;
  }

  if (email) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change email.');
    }

    if (!bcrypt.compareSync(currentPassword, game.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    update.email = email;
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change password.');
    }

    if (!bcrypt.compareSync(currentPassword, game.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    const wallet = await prisma.wallet.findUnique({
      where: { id: game.wallet.id },
    });

    const currentWalletDecryptKey = cryptoUtils.pbkdf2(currentPassword);
    const newWalletDecryptKey = cryptoUtils.pbkdf2(newPassword);

    let decryptedWallet;

    try {
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, currentWalletDecryptKey);
    } catch (error) { // backwards compatibility for old password encrypted wallets.
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.ciphertext, currentPassword);
    }

    game.walletDecryptKey = newWalletDecryptKey;
    update.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    update.wallet = {
      update: { ciphertext: cryptoUtils.aesEncryptWallet(decryptedWallet, newWalletDecryptKey) },
    };
  }

  if (rpcs) {
    const rpcChains = Object.keys(rpcs);
    const supportedChains = chainUtils.getSupportedChains();

    update.rpcs = { ...game.rpcs };

    for (let i = 0; i < rpcChains.length; i++) {
      const rpcChain = rpcChains[i];
      const rpcUrl = rpcs[rpcChain];

      if ([ '', null, undefined ].includes(rpcUrl)) {
        delete update.rpcs[rpcChain];
        continue;
      }

      if (!supportedChains.includes(rpcChain)) {
        throw new Error(`Chain ${rpcChain} is not a supported chain. Supported chains are: ${supportedChains.join(', ')}`);
      }

      if (!await evmUtils.isValidRpcUrl(rpcChain, rpcUrl)) {
        throw new Error(`RPC url ${rpcUrl} is not a valid RPC for chain ${rpcChain} and could not be connected to.`);
      }

      update.rpcs[rpcChain] = rpcUrl;
    }
  }

  if (redirectUris) {
    update.redirectUris = redirectUris;
  }

  if (iconImageBase64) {
    const iconImageBuffer = Buffer.from(iconImageBase64, 'base64');
    const mimeInfo = await fileType.fromBuffer(iconImageBuffer);

    if (!mimeInfo || ![ 'image/jpg', 'image/jpeg', 'image/gif', 'image/png', 'image/webp' ].includes(mimeInfo.mime)) {
      throw new Error('Invalid image file type. Only jpeg, gif, png and webp are supported.');
    }

    const iconImageUpload = await fileUtils.writeS3File(
      process.env.S3_UPLOADS_BUCKET,
      `${game.id}/icon.${mimeInfo.ext}`,
      iconImageBuffer,
      true,
    );

    update.iconImageUrl = iconImageUpload.url;
  }

  if (coverImageBase64) {
    const coverImageBuffer = Buffer.from(coverImageBase64, 'base64');
    const mimeInfo = await fileType.fromBuffer(coverImageBuffer);

    if (!mimeInfo || ![ 'image/jpg', 'image/jpeg', 'image/gif', 'image/png', 'image/webp' ].includes(mimeInfo.mime)) {
      throw new Error('Invalid image file type. Only jpeg, gif, png and webp are supported.');
    }

    const coverImageUpload = await fileUtils.writeS3File(
      process.env.S3_UPLOADS_BUCKET,
      `${game.id}/cover.${mimeInfo.ext}`,
      coverImageBuffer,
      true,
    );

    update.coverImageUrl = coverImageUpload.url;
  }

  if (primaryColorHex) {
    if (!/^#[0-9A-F]{6}$/i.test(primaryColorHex)) {
      throw new Error('primaryColorHex must be a valid hex color code, such as #531ABE.');
    }

    update.primaryColorHex = primaryColorHex;
  }

  if (discordClientId) {
    update.discordClientId = discordClientId;
  }

  if (resetPublishedKey) {
    update.publishedKey = authUtils.generateToken('game_pk_');
  }

  if (resetSecretKey) {
    update.secretKey = authUtils.generateToken('game_sk_');
  }

  await prisma.game.update({
    where: { id: game.id },
    data: update,
  });

  delete game.password;
  delete game.saltCiphertext;
  delete game.verificationCode;
  delete update.password;
  delete update.wallet;

  response.success({
    ...game,
    ...update,
  });
}));

/*
 * Export
 */

module.exports = router;
