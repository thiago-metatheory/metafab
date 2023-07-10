/*
 * Route: /collections/:collectionId/approvals
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/approvals:
 *    get:
 *      operationId: getCollectionApproval
 *      summary: Get collection approval
 *      description:
 *        Returns a boolean (true/false) representing if the provided operatorAddress
 *        has approval to transfer and burn items from the current collection owned
 *        by the address or address associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/queryOperatorAddress'
 *        - $ref: '#/components/parameters/queryAddress'
 *        - $ref: '#/components/parameters/queryWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved the boolean value representing if the
 *            provided operatorAddress can transfer and burn owned items by the
 *            provided address or walletId.
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
  const { address, operatorAddress } = request.query;

  if (!evmUtils.isAddress(address) || !evmUtils.isAddress(operatorAddress)) {
    throw new Error('Invalid address or walletId.');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const isApproved = await connectedContractInstance.isApprovedForAll(address, operatorAddress);

  response.success(isApproved);
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/approvals:
 *    post:
 *      operationId: setCollectionApproval
 *      summary: Set collection approval
 *      description:
 *        Sets approval for the provided address or wallet address associated with
 *        the provided walletId to operate on behalf of the authenticating game
 *        or player's owned items for this collection. Setting an approved value of
 *        `true` allows the provided address or address associated with the provided
 *        walletId to transfer and burn items from this collection on behalf of
 *        the authenticated game or player's wallet address.
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
 *                approved:
 *                  type: boolean
 *                  description: A true or false value approves or disapproves the provided address or address associated with the provided walletId.
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to allow control over the authenticating game or player's wallet items for this collection.
 *                walletId:
 *                  type: string
 *                  description: A wallet id within the MetaFab ecosystem to allow control over the authenticating game or player's wallet items for this collection.
 *                  items:
 *                    type: string
 *              required:
 *                - approved
 *      responses:
 *        200:
 *          description:
 *            Successfully set approval for the provided address or address
 *            associated with the provided walletId to transfer and burn items
 *            from this collection on behalf of the authenticated game or player's
 *            wallet. Returns a transaction object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameOrPlayerAuthorizeDecryptWallet);
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { player, wallet, walletSigner } = request;
  const { collectionId } = request.params;
  const { address, approved } = request.body;

  if (!evmUtils.isAddress(address)) {
    throw new Error(`Address ${address} is not valid.`);
  }

  if (approved === undefined) {
    throw new Error('approved must be provided.');
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
    allowGasless: !!player,
    func: 'setApprovalForAll',
    args: [ address, approved ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
