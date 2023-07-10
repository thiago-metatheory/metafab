/*
 * Route: /collections/:collectionId/roles
 */

const evmUtils = rootRequire('/libs/evmUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const contractUtils = rootRequire('/libs/contractUtils');
const { ACCESS_CONTROL_ROLES } = rootRequire('/libs/metafabUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/roles:
 *    get:
 *      operationId: getCollectionRole
 *      summary: Get collection role
 *      description:
 *        Returns a boolean (true/false) representing if the provided role
 *        for this collection has been granted to the provided address or
 *        address associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/queryRole'
 *        - $ref: '#/components/parameters/queryAddress'
 *        - $ref: '#/components/parameters/queryWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved the boolean value representing if the
 *            provided role has been granted to the provided address or walletId.
 *          content:
 *            application/json:
 *              schema:
 *                type: boolean
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', walletIdToAddressOptional);
router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId } = request.params;
  const { address } = request.query;
  let { role } = request.query;

  role = (role && role.includes('0x')) ? role : ACCESS_CONTROL_ROLES[role];

  if (!role) {
    throw new Error('Invalid role provided.');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const hasRole = await connectedContractInstance.hasRole(role, address);

  response.success(hasRole);
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/roles:
 *    post:
 *      operationId: grantCollectionRole
 *      summary: Grant collection role
 *      description:
 *        Grants the provided role for the collection to the provided address or
 *        address associated with the provided walletId. Granted roles give
 *        different types of authority on behalf of the collection for specific players,
 *        addresses, or contracts to perform different types of permissioned
 *        collection operations.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                role:
 *                  type: string
 *                  description:
 *                    A valid MetaFab role or bytes string representing a role,
 *                    such as `minter` or `0xc9eb32e43bf5ecbceacf00b32281dfc5d6d700a0db676ea26ccf938a385ac3b7`
 *                address:
 *                  type: string
 *                  description: A valid EVM based address grant the role to.
 *                walletId:
 *                  type: string
 *                  description: A wallet id within the MetaFab ecosystem to grant the role to.
 *                  items:
 *                    type: string
 *              required:
 *                - role
 *      responses:
 *        200:
 *          description:
 *            Successfully granted the provided role to the provided address
 *            or address associated with the provided walletId.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameSecretKeyAuthorize);
router.post('/', gameDecryptWallet);
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { collectionId } = request.params;
  const { address } = request.body;
  let { role } = request.body;

  role = (role && role.includes('0x')) ? role : ACCESS_CONTROL_ROLES[role];

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  if (!role) {
    throw new Error('Invalid role provided.');
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!collection) {
    throw new Error('Invalid collectionId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: collection.contract.id,
    wallet,
    walletSigner,
    func: 'grantRole',
    args: [ role, address ],
  });

  response.success(transaction);
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/roles:
 *    delete:
 *      operationId: revokeCollectionRole
 *      summary: Revoke collection role
 *      description:
 *        Revokes the provided role for the collection to the provided address or
 *        address associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                role:
 *                  type: string
 *                  description:
 *                    A valid MetaFab role or bytes string representing a role,
 *                    such as `minter` or `0xc9eb32e43bf5ecbceacf00b32281dfc5d6d700a0db676ea26ccf938a385ac3b7`
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to revoke the role from.
 *                walletId:
 *                  type: string
 *                  description: A wallet id within the MetaFab ecosystem to revoke the role from.
 *                  items:
 *                    type: string
 *              required:
 *                - role
 *      responses:
 *        200:
 *          description:
 *            Successfully revoked the provided role from the provided address
 *            or address associated with the provided walletId. Returns a transaction
 *            object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.delete('/', gameSecretKeyAuthorize);
router.delete('/', gameDecryptWallet);
router.delete('/', walletIdToAddressOptional);
router.delete('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { collectionId } = request.params;
  const { address } = request.body;
  let { role } = request.body;

  role = (role && role.includes('0x')) ? role : ACCESS_CONTROL_ROLES[role];

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  if (!role) {
    throw new Error('Invalid role provided.');
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!collection) {
    throw new Error('Invalid collectionId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: collection.contract.id,
    wallet,
    walletSigner,
    func: 'revokeRole',
    args: [ role, address ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
