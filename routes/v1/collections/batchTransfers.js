// batch transfer X itemIds or Y quantity to Z addresses each

/*
 * Route: /collections/:collectionId/batchTransfers
 */

const evmUtils = rootRequire('/libs/evmUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/batchTransfers:
 *    post:
 *      operationId: batchTransferCollectionItems
 *      summary: Batch transfer collection items
 *      description:
 *        Transfers one or multiple items of specified quantities to the provided wallet addresses
 *        or wallet addresses associated with the provided walletIds. You may also
 *        provide a combination of addresses and walletIds in one request.
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
 *                addresses:
 *                  type: array
 *                  description: An array of valid EVM based addresses to transfer items to.
 *                  items:
 *                    type: string
 *                walletIds:
 *                  type: array
 *                  description: An array of wallet ids within the MetaFab ecosystem to transfer items to.
 *                  items:
 *                    type: string
 *                itemIds:
 *                  type: array
 *                  description: An array of unique itemIds to transfer. Each recipient will receive the same set of items provided.
 *                  items:
 *                    type: integer
 *                    example: 12
 *                quantities:
 *                  type: array
 *                  description: The quantities of each unique itemId to transfer. Each recipient will receive the same quantities of items provided.
 *                  items:
 *                    type: integer
 *                    example: 1
 *              required:
 *                - itemIds
 *                - quantities
 *      responses:
 *        200:
 *          description:
 *            Successfully transferred the itemIds of the provided quantities to
 *            each of the provided wallet addresses and/or wallet addresses of
 *            the provided walletIds. Returns a transaction object.
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
  const { addresses, itemIds, quantities } = request.body;

  if (!addresses || !addresses.length) {
    throw new Error('At least 1 address or valid walletId must be provided.');
  }

  addresses.forEach(batchAddress => {
    if (!evmUtils.isAddress(batchAddress)) {
      throw new Error(`Batch address ${batchAddress} is not valid.`);
    }
  });

  if (itemIds.length !== quantities.length) {
    throw new Error('itemIds and quantities size mistmatch.');
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
    func: 'bulkSafeBatchTransferFrom',
    args: [ wallet.address, addresses, itemIds, quantities ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
