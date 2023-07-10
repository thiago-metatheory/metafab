/*
 * Route: /ecosystems
 */

const bcrypt = require('bcryptjs');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const fileType = require('file-type');
const authUtils = rootRequire('/libs/authUtils');
const fileUtils = rootRequire('/libs/fileUtils');
const ecosystemSecretKeyAuthorize = rootRequire('/middlewares/ecosystems/secretKeyAuthorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/ecosystems/auth:
 *    get:
 *      operationId: authEcosystem
 *      summary: Authenticate ecosystem
 *      description:
 *        Returns an existing ecosystem object containing authorization keys
 *        when provided a valid email (in place of username) and
 *        password login using Basic Auth.
 *      tags:
 *        - Ecosystems
 *      security:
 *        - basicAuth: []
 *      responses:
 *        200:
 *          description:
 *            Succesfully authorized the request and retrieved an ecosystem object
 *            containing authorization keys and credentials.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/EcosystemModel'
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

  const ecosystem = await prisma.ecosystem.findUnique({
    where: { email },
  });

  if (!ecosystem) {
    return response.respond(401, `Ecosystem for email address ${email} does not exist.`);
  }

  if (!bcrypt.compareSync(password, ecosystem.password)) {
    return response.respond(401, 'Incorrect email or password.');
  }

  delete ecosystem.password;

  response.success(ecosystem);
}));

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}:
 *    get:
 *      operationId: getEcosystem
 *      summary: Get ecosystem
 *      description:
 *        Returns a ecosystem object for the provided ecosystem id.
 *      tags:
 *        - Ecosystems
 *      parameters:
 *        - $ref: '#/components/parameters/pathEcosystemId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved ecosystem.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/PublicEcosystem'
 *        400:
 *          $ref: '#/components/responses/400'
 *
 */

router.get('/:ecosystemId', asyncMiddleware(async (request, response) => {
  const { ecosystemId } = request.params;

  const ecosystem = await prisma.ecosystem.findUnique({
    where: { id: ecosystemId },
    select: {
      id: true,
      name: true,
      publishedKey: true,
      iconImageUrl: true,
      coverImageUrl: true,
      primaryColorHex: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!ecosystem) {
    throw new Error('Ecosystem does not exist for provided ecosystemId.');
  }

  response.success(ecosystem);
}));

/**
 *  @openapi
 *  /v1/ecosystems:
 *    post:
 *      operationId: createEcosystem
 *      summary: Create ecosystem
 *      description:
 *        Create a new ecosystem. An ecosystem is a parent entity that many profiles
 *        live under for a given ecosystem of games. Ecosystems allow your players to
 *        create one profile within your ecosystem that allows a single account and wallet
 *        to be used across all of the approved games in your ecosystem that they play.
 *      tags:
 *        - Ecosystems
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  description: The name of the ecosystem you're creating.
 *                  example: NFT Worlds
 *                email:
 *                  type: string
 *                  description:
 *                    The email address associated with this ecosystem and
 *                    used to login/authenticate as the ecosystem.
 *                  format: email
 *                  example: dev@nftworlds.com
 *                password:
 *                  type: string
 *                  description:
 *                    The password to authenticate as the ecosystem.
 *                  format: password
 *                  example: aReallyStrongPassword123!
 *              required:
 *                - name
 *                - email
 *                - password
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new ecosystem. Returns an ecosystem object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/EcosystemModel'
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

  const ecosystemExists = await prisma.ecosystem.count({
    where: { email },
  });

  if (ecosystemExists) {
    throw new Error(`An ecosystem for the email address ${email} already exists.`);
  }

  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  const salt = cryptoUtils.generateStrongSalt();
  const saltCiphertext = await cryptoUtils.kmsSymmetricEncrypt(salt);

  const ecosystem = await prisma.ecosystem.create({
    data: {
      email,
      password: hashedPassword,
      name,
      publishedKey: authUtils.generateToken('ecosystem_pk_'),
      secretKey: authUtils.generateToken('ecosystem_sk_'),
      saltCiphertext,
    },
  });

  delete ecosystem.password;
  delete ecosystem.saltCiphertext;

  response.success(ecosystem);
}));

/**
 *  @openapi
 *  /v1/ecosystems/{ecosystemId}:
 *    patch:
 *      operationId: updateEcosystem
 *      summary: Update ecosystem
 *      description:
 *        Update various fields specific to an ecosystem. Such as changing its password,
 *        resetting its published or secret key, or updating its approved games.
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
 *                name:
 *                  type: string
 *                  description: A new name. Replaces the ecosystem's current name.
 *                email:
 *                  type: string
 *                  description:
 *                    A new email address. The ecosystem's old email will no longer be
 *                    valid for account authentication. `currentPassword` must also
 *                    be provided.
 *                  format: email
 *                currentPassword:
 *                  type: string
 *                  description: The ecosystem's current password. Must be provided if setting `newPassword` or `email`.
 *                  format: password
 *                newPassword:
 *                  type: string
 *                  description: A new password. The ecosystem's old password will no longer be valid.
 *                  format: password
 *                iconImageBase64:
 *                  type: string
 *                  description:
 *                    A base64 string of the icon image for this ecosystem. Supported
 *                    image formats are `jpg`, `jpeg`, `png`, `gif` Recommended
 *                    size is 512x512 pixels, or 1:1 aspect ratio. This image is
 *                    used for your profile authorization flow and other MetaFab
 *                    features for your ecosystem.
 *                coverImageBase64:
 *                  type: string
 *                  description:
 *                    A base64 string of the cover image for this ecosystem. Supported
 *                    image formats are `jpg`, `jpeg`, `png`, `gif`. Recommended
 *                    size is 1600x1000 pixels, or 16:10 aspect ratio.  This image is
 *                    used as the background image for your profile authorization flow and other
 *                    MetaFab features for your ecosystem.
 *                primaryColorHex:
 *                  type: string
 *                  description:
 *                    A valid hex color code. This color is used for your profile authorization
 *                    flow to control the color of buttons and other brandable
 *                    MetaFab features for your ecosystem.
 *                  example: #AA41EF
 *                resetPublishedKey:
 *                  type: boolean
 *                  description: Revokes the ecosystem's previous published key and returns a new one if true.
 *                resetSecretKey:
 *                  type: boolean
 *                  description: Revokes the ecosystem's previous secret key and returns a new on if true.
 *      responses:
 *        200:
 *          description: Returns the updated ecosystem object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/EcosystemModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.patch('/:ecosystemId', ecosystemSecretKeyAuthorize);
router.patch('/:ecosystemId', asyncMiddleware(async (request, response) => {
  const { ecosystem } = request;
  const { ecosystemId } = request.params;
  const {
    name,
    email,
    currentPassword,
    newPassword,
    iconImageBase64,
    coverImageBase64,
    primaryColorHex,
    resetPublishedKey,
    resetSecretKey,
  } = request.body;

  if (ecosystem.id != ecosystemId) {
    return response.respond(401, `X-Authorization invalid for ecosystem id ${ecosystemId}`);
  }

  const update = {};

  if (name) {
    update.name = name;
  }

  if (email) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change email.');
    }

    if (!bcrypt.compareSync(currentPassword, ecosystem.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    update.email = email;
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new Error('currentPassword must be provided to change password.');
    }

    if (!bcrypt.compareSync(currentPassword, ecosystem.password)) {
      throw new Error('currentPassword is incorrect.');
    }

    update.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
  }

  if (iconImageBase64) {
    const iconImageBuffer = Buffer.from(iconImageBase64, 'base64');
    const mimeInfo = await fileType.fromBuffer(iconImageBuffer);

    if (!mimeInfo || ![ 'image/jpg', 'image/jpeg', 'image/gif', 'image/png', 'image/webp' ].includes(mimeInfo.mime)) {
      throw new Error('Invalid image file type. Only jpeg, gif, png and webp are supported.');
    }

    const iconImageUpload = await fileUtils.writeS3File(
      process.env.S3_UPLOADS_BUCKET,
      `${ecosystem.id}/icon.${mimeInfo.ext}`,
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
      `${ecosystem.id}/cover.${mimeInfo.ext}`,
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

  if (resetPublishedKey) {
    update.publishedKey = authUtils.generateToken('ecosystem_pk_');
  }

  if (resetSecretKey) {
    update.secretKey = authUtils.generateToken('ecosystem_sk_');
  }

  await prisma.ecosystem.update({
    where: { id: ecosystem.id },
    data: update,
  });

  delete ecosystem.password;
  delete update.password;

  response.success({
    ...ecosystem,
    ...update,
  });
}));

/*
 * Export
 */

module.exports = router;
