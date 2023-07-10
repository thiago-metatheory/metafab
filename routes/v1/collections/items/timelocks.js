/*
 * Route: /collections/:collectionId/items/:collectionItemId/timelocks
 */

const contractUtils = rootRequire('/libs/contractUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}/timelocks:
 *    get:
 *      operationId: getCollectionItemTimelock
 *      summary: Get collection item timelock
 *      description:
 *        Returns a timestamp (in seconds) for when the provided collectionItemId's
 *        transfer timelock expires. A value of 0 means the provided collectionItemId
 *        does not have a timelock set. Timelocks prevent items of a specific collectionItemId
 *        from being transferred until the set timelock timestamp has been surpassed.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/pathCollectionItemId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved the collectionItemId's timelock. The timelock
 *            is returned as a unix timestamp in seconds. A return value of 0
 *            means the collectionItemId does not have a timelock set.
 *          content:
 *            application/json:
 *              schema:
 *                type: integer
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId, collectionItemId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const timelock = await connectedContractInstance.itemTransferTimelocks(collectionItemId);

  response.success(formattingUtils.formatBigNumber(timelock));
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}/timelocks:
 *    post:
 *      operationId: setCollectionItemTimelock
 *      summary: Set collection item timelock
 *      description:
 *        Sets the item timelock for the provided collection itemId. The timelock
 *        is a unix timestamp (in seconds) that defines a period in time of when
 *        an item may be transferred by players. Until the timelock timestamp has passed,
 *        the itemId for the given timelock may not be transferred, sold, traded, etc.
 *        A timelock of 0 (default) means that there is no timelock set on the itemId
 *        and it can be freely transferred, traded, etc.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/pathCollectionItemId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
  *                timelock:
 *                  type: integer
 *                  description: A unix timestamp (in seconds) defining when the set timelock expires.
 *                  example: 1665786026
 *              required:
 *                - timelock
 *      responses:
 *        200:
 *          description:
 *            Successfully set the provided timelock for the provided itemId.
 *            Returns a transaction object.
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
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { collectionId, collectionItemId } = request.params;
  const { timelock } = request.body;

  if (timelock === undefined) {
    throw new Error('timelock must be provided.');
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
    func: 'setItemTransferTimelock',
    args: [ collectionItemId, timelock ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
