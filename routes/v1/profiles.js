/*
 * Route: /profiles
 */

const bcrypt = require('bcryptjs');
const authUtils = rootRequire('/libs/authUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const emailUtils = rootRequire('/libs/emailUtils');
const walletUtils = rootRequire('/libs/walletUtils');
const ecosystemPublishedKeyAuthorize = rootRequire('/middlewares/ecosystems/publishedKeyAuthorize');
const profileAuthorize = rootRequire('/middlewares/profiles/authorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/profiles/auth:
 *    get:
 *      operationId: authProfile
 *      summary: Authenticate profile
 *      description:
 *        Returns an existing profile object containing access token, wallet,
 *        and other details when provided a valid profile username and
 *        password login using Basic Auth.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/headerEcosystemKey'
 *      security:
 *        - basicAuth: []
 *      responses:
 *        200:
 *          description:
 *            Succesfully authorized the request and retrieved a profile object
 *            containing access token, wallet, and other details.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ProfileModel'
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

router.get('/auth', ecosystemPublishedKeyAuthorize);
router.get('/auth', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const basicAuth = atob(request.get('Authorization').split(' ')[1]); // "Basic {auth}"
  const [ username, password ] = basicAuth.split(':');

  if (!username || !password) {
    return response.respond(401, 'Invalid basic auth.');
  }

  const profile = await prisma.profile.findFirst({
    where: {
      ecosystemId: ecosystem.id,
      username,
    },
    include: {
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

  if (!profile) {
    throw new Error(`Profile with username ${username} for provided ecosystem does not exist.`);
  }

  if (!bcrypt.compareSync(password, profile.password)) {
    return response.respond(401, 'Incorrect username or password.');
  }

  profile.custodialWallet = profile.wallet;
  profile.wallet = profile.connectedWallet || profile.wallet;
  profile.walletDecryptKey = cryptoUtils.pbkdf2(password);

  delete profile.password;
  delete profile.recoveryEmailLookup;
  delete profile.recoveryEmailCode;
  delete profile.connectedWallet;

  response.success(profile);
}));

/**
 *  @openapi
 *  /v1/profiles:
 *    post:
 *      operationId: createProfile
 *      summary: Create profile
 *      description:
 *        Create a new profile. Profiles are automatically associated
 *        with an internally managed wallet. Profiles can be thought of as a
 *        umbrella account that can be used to sign into and create player accounts
 *        across many games and have a singular asset store wallet at the profile level
 *        that can be used across all connected player accounts for games those player
 *        accounts are a part of.
 *
 *
 *        Profiles are associated to a parent ecosystem of games. This allows an ecosystem
 *        to approve a permissioned set of games that can request authorized wallet permissions
 *        from profiles of players for their game.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/headerEcosystemKey'
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
 *                    The profile's username, used to authenticate the profile.
 *                    Profile usernames are globally unique across MetaFab.
 *                    There cannot be 2 profiles with the same username created.
 *                password:
 *                  type: string
 *                  description:
 *                    The password to authenticate as the profile. Additionally,
 *                    this password is used to encrypt/decrypt a profile's primary
 *                    wallet and must be provided anytime this profile makes blockchain
 *                    interactions through various endpoints.
 *                  format: password
 *                  example: aReallyStrongPassword123
 *                recoveryEmail:
 *                  type: string
 *                  description:
 *                    An email that can be used to recover this profile.
 *                    If the profile owner forgets their username or password, a
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
 *            Successfully created a new profile. Returns a profile object containing
 *            a wallet (used to interact with contracts, currencies, etc).
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ProfileModel'
 *                  - type: object
 *                    properties:
 *                      backupCodes:
 *                        type: array
 *                        description: One-time use backup codes for profile account recovery.
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

router.post('/', ecosystemPublishedKeyAuthorize);
router.post('/', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { username, password, recoveryEmail } = request.body;

  if (!username || !password) {
    throw new Error('username and password must be provided.');
  }

  const profileExists = await prisma.profile.findFirst({
    where: {
      ecosystemId: ecosystem.id,
      username,
    },
  });

  if (profileExists) {
    throw new Error(`A profile with the username ${username} for provided ecosystem already exists.`);
  }

  const walletDecryptKey = cryptoUtils.pbkdf2(password);
  const generatedWallet = walletUtils.generateRandomWallet();
  const walletCiphertext = cryptoUtils.aesEncryptWallet(generatedWallet, walletDecryptKey);
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  const walletBackupCodes = [];
  const walletBackupCiphertexts = [];

  for (let i = 0; i < 6; i++) {
    const code = authUtils.generateToken('', 8);

    walletBackupCodes.push(code);
    walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(generatedWallet, code));
  }

  // create email recovery backup wallet
  let recoveryEmailLookup;

  if (recoveryEmail) {
    const salt = await cryptoUtils.kmsSymmetricDecrypt(ecosystem.saltCiphertext);
    const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(recoveryEmail, salt);
    walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(generatedWallet, recoveryEmailDecryptKey));
    recoveryEmailLookup = cryptoUtils.sha3(`${recoveryEmail}${salt}`);

    const profileWithRecoveryEmailExists = await prisma.profile.findFirst({
      where: {
        ecosystemId: ecosystem.id,
        recoveryEmailLookup,
      },
    });

    if (profileWithRecoveryEmailExists) {
      throw new Error(`A profile already exists for this game with the recovery email ${recoveryEmail}.`);
    }
  }

  const profile = await prisma.profile.create({
    data: {
      username,
      password: hashedPassword,
      accessToken: authUtils.generateToken('profile_at_'),
      recoveryEmailLookup,
      ecosystem: {
        connect: { id: ecosystem.id },
      },
      wallet: {
        create: {
          address: generatedWallet.address,
          ciphertext: walletCiphertext,
          backupCiphertexts: walletBackupCiphertexts,
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
    },
  });

  profile.custodialWallet = profile.wallet;
  profile.backupCodes = walletBackupCodes;
  profile.walletDecryptKey = walletDecryptKey;

  delete profile.password;
  delete profile.recoveryEmailLookup;
  delete profile.recoveryEmailCode;

  response.success(profile);
}));

/**
 *  @openapi
 *  /v1/profiles/recover:
 *    post:
 *      operationId: recoverProfile
 *      summary: Recover profile
 *      description:
 *        Recover a profile that has forgotten their password by using one of their
 *        one time use backup codes or information provided through the email
 *        recovery process.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/headerEcosystemKey'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                  description: The profile's id. `id` or `username` is required.
 *                username:
 *                  type: string
 *                  description: The profile's username. `id` or `username` is required.
 *                backupCode:
 *                  type: string
 *                  description: A valid one-time use backup code required to recover the profile and set a new password.
 *                recoveryEmailCode:
 *                  type: string
 *                  description: A one-time use code from a recover account email. Required to be provided with `recoveryEmailDecryptKey`.
 *                recoveryEmailDecryptKey:
 *                  type: string
 *                  description: A generated decrypt key from a recover account email. Required to be provided with `recoveryEmailCode`.
 *                newPassword:
 *                  type: string
 *                  description: A new password. The profile's old password will no longer be valid.
 *                  format: password
 *              required:
 *                - newPassword
 *      responses:
 *        200:
 *          description:
 *            Successfully recovered a profile. Returns a profile object.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ProfileModel'
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

router.post('/recover', ecosystemPublishedKeyAuthorize);
router.post('/recover', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { id, username, backupCode, recoveryEmailCode, recoveryEmailDecryptKey, newPassword } = request.body;

  const lookup = id ? { id, ecosystemId: ecosystem.id } : { ecosystemId: ecosystem.id, username };
  const profile = await prisma.profile.findFirst({
    where: lookup,
    include: {
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

  if (recoveryEmailDecryptKey && (!recoveryEmailCode || profile.recoveryEmailCode !== recoveryEmailCode)) {
    throw new Error('Invalid recoveryEmailCode.');
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: profile.wallet.id },
  });

  let decryptedWallet;

  for (let i = 0; i < wallet.backupCiphertexts.length; i++) {
    try {
      decryptedWallet = cryptoUtils.aesDecryptWallet(wallet.backupCiphertexts[i], backupCode || recoveryEmailDecryptKey);

      // if a backup code was used to decrypt then we want to remove the backup code from the wallet. This is not necessary if the
      // recoveryEmailDecryptKey was used
      if (backupCode) {
        wallet.backupCiphertexts.splice(i, 1);
      }
      break;
    } catch (error) { /* noop */}
  }

  if (!decryptedWallet) {
    throw new Error('Provided backupCode is invalid or has already been used.');
  }

  const newAccessToken = authUtils.generateToken('profile_at_');
  const newWalletDecryptKey = cryptoUtils.pbkdf2(newPassword);
  const newWalletCiphertext = cryptoUtils.aesEncryptWallet(decryptedWallet, newWalletDecryptKey);

  await prisma.profile.update({
    where: { id: profile.id },
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

  profile.accessToken = newAccessToken;
  profile.custodialWallet = profile.wallet;
  profile.wallet = profile.connectedWallet || profile.wallet;
  profile.walletDecryptKey = newWalletDecryptKey;

  delete profile.password;
  delete profile.recoveryEmailLookup;
  delete profile.recoveryEmailCode;
  delete profile.connectedWallet;

  response.success(profile);
}));

/**
 *  @openapi
 *  /v1/profiles/startRecover:
 *    post:
 *      operationId: startRecoverProfile
 *      summary: Start recover profile
 *      description:
 *        Starts the profile recovery process. Sends a reset password email to the email
 *        provided if a matching profile account is found. Please note, each time this endpoint
 *        is called, a new email will be sent and a new `recoveryEmailCode` will be assigned,
 *        voiding all prior emails sent.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/headerEcosystemKey'
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
 *                    A valid recovery email address for a profile of your
 *                    ecosystem to send a recovery email to.
 *                redirectUri:
 *                  type: string
 *                  description:
 *                    The base uri for where profile owners will be sent to when they
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

router.post('/startRecover', ecosystemPublishedKeyAuthorize);
router.post('/startRecover', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { email, redirectUri } = request.body;

  if (!email) {
    throw new Error('email must be provided.');
  }

  const salt = await cryptoUtils.kmsSymmetricDecrypt(ecosystem.saltCiphertext);
  const profile = await prisma.profile.findFirst({
    where: {
      ecosystemId: ecosystem.id,
      recoveryEmailLookup: cryptoUtils.sha3(`${email}${salt}`),
    },
    include: {
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

  if (!profile) {
    throw new Error(`No profile for this ecosystem found with the recovery email ${email}`);
  }

  const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(email, salt);
  const recoveryEmailCode = authUtils.generateToken('', 8);

  await prisma.profile.update({
    where: { id: profile.id },
    data: { recoveryEmailCode },
  });

  await emailUtils.sendProfileRecoveryEmail(email, ecosystem, profile, recoveryEmailDecryptKey, recoveryEmailCode, redirectUri);

  if (process.env.NODE_ENV === 'local') { // for tests
    return response.success({
      id: profile.id,
      recoveryEmailDecryptKey,
      recoveryEmailCode,
    });
  }

  delete profile.password;
  delete profile.accessToken;
  delete profile.recoveryEmailLookup;
  delete profile.recoveryEmailCode;

  response.success();
}));

/**
 *  @openapi
 *  /v1/profiles/{profileId}:
 *    patch:
 *      operationId: updateProfile
 *      summary: Update profile
 *      description:
 *        Update various fields specific to a profile. Such as changing its
 *        password and resetting its access token.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathProfileIdAuthenticated'
 *        - $ref: '#/components/parameters/headerAuthorizationProfile'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                currentPassword:
 *                  type: string
 *                  description: The profile's current password. Must be provided if setting `newPassword`.
 *                  format: password
 *                newPassword:
 *                  type: string
 *                  description: A new password. The profile's old password will no longer be valid.
 *                  format: password
 *                recoveryEmail:
 *                  type: string
 *                  description:
 *                    An email that can be used to recover this profile.
 *                    If the profile owner forgets their username or password, a
 *                    reset request can be triggered through MetaFab to send
 *                    an account recovery & password reset email to this email
 *                    address. `currentPassword` must also be provided.
 *                  example: backupEmail@gmail.com
 *                resetAccessToken:
 *                  type: boolean
 *                  description: Revokes the profile's previous access token and returns a new one if true.
 *                resetBackupCodes:
 *                  type: boolean
 *                  description: Invalidates all profile backup codes and generates new ones if true. `currentPassword` must also be provided.
 *      responses:
 *        200:
 *          description: Returns the updated profile object.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ProfileModel'
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

router.patch('/:profileId', profileAuthorize);
router.patch('/:profileId', asyncMiddleware(async (request, response) => {
  const { profile } = request;
  const { profileId } = request.params;
  const {
    currentPassword,
    newPassword,
    recoveryEmail,
    resetAccessToken,
    resetBackupCodes,
  } = request.body;

  if (profile.id != profileId) {
    return response.respond(401, `X-Authorization invalid for profile id ${profileId}`);
  }

  const update = { wallet: { update: {} } };

  let wallet;
  let decryptedWallet;

  // decrypt wallet for use
  if (currentPassword) {
    if (!bcrypt.compareSync(currentPassword, profile.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    wallet = await prisma.wallet.findUnique({
      where: { id: profile.wallet.id },
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

    profile.walletDecryptKey = newWalletDecryptKey;
    update.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    update.wallet.update.ciphertext = cryptoUtils.aesEncryptWallet(decryptedWallet, newWalletDecryptKey);
  }

  // update recovery email
  if (recoveryEmail) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change recovery email.');
    }

    const ecosystem = await prisma.ecosystem.findUnique({
      where: { id: profile.ecosystemId },
    });

    const salt = await cryptoUtils.kmsSymmetricDecrypt(ecosystem.saltCiphertext);
    const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(recoveryEmail, salt);
    update.recoveryEmailLookup = cryptoUtils.sha3(`${recoveryEmail}${salt}`);
    update.wallet.update.backupCiphertexts = [ cryptoUtils.aesEncryptWallet(decryptedWallet, recoveryEmailDecryptKey) ];

    const profileWithRecoveryEmailExists = await prisma.profile.findFirst({
      where: {
        ecosystemId: ecosystem.id,
        recoveryEmailLookup: update.recoveryEmailLookup,
      },
    });

    if (profileWithRecoveryEmailExists) {
      throw new Error(`A profile already exists for this game with the recovery email ${recoveryEmail}.`);
    }
  }

  // reset access token, or reset if password changed
  if (resetAccessToken || newPassword) {
    update.accessToken = authUtils.generateToken('profile_at_');
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

    profile.backupCodes = walletBackupCodes;
    update.wallet.update.backupCiphertexts = update.wallet.update.backupCiphertexts || [];
    update.wallet.update.backupCiphertexts = [ ...walletBackupCiphertexts, ...update.wallet.update.backupCiphertexts ];

    if (wallet.backupCiphertexts.length === 7) {
      update.wallet.update.backupCiphertexts.push(wallet.backupCiphertexts[6]); // include recovery email backup
    }
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: update,
  });

  delete profile.password;
  delete profile.recoveryEmailLookup;
  delete profile.recoveryEmailCode;
  delete update.recoveryEmailLookup;
  delete update.password;
  delete update.wallet;

  profile.custodialWallet = profile.wallet;
  profile.wallet = profile.connectedWallet || profile.wallet;

  delete profile.connectedWallet;

  response.success({
    ...profile,
    ...update,
  });
}));

/*
 * Export
 */

module.exports = router;
