/*
 * Route: /collections/:collectionId/batchMints
 */

const evmUtils = rootRequire('/libs/evmUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/batchMints:
 *    post:
 *      operationId: batchMintCollectionItems
 *      summary: Batch mint collection items
 *      description:
 *        Creates (mints) the provided itemIds of the specified quantities
 *        to the provided wallet address or wallet address associated with the provided
 *        walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to create (mint) the items for. For example, `0x39cb70F972E0EE920088AeF97Dbe5c6251a9c25D`.
 *                itemIds:
 *                  type: array
 *                  description: An array of unique itemIds to create (mint).
 *                  items:
 *                    type: integer
 *                quantities:
 *                  type: array
 *                  description:
 *                    An array of the quantities of each of the unique itemIds provided to create (mint).
 *                    The quantity of each itemId in itemIds should be at the same index as the specific itemId
 *                    in the itemIds array. For example, quantities[2] defines the quantity to mint for itemIds[2], etc.
 *                  items:
 *                    type: integer
 *                walletId:
 *                  type: string
 *                  description: Any wallet id within the MetaFab ecosystem to create (mint) the items for.
 *              required:
 *                - itemIds
 *                - quantities
 *      responses:
 *        200:
 *          description:
 *            Successfully created (minted) the provided items of the provided
 *            quantities to the provided wallet address or wallet address of the
 *            provided walletId. Returns a transaction object.
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
  const { address, itemIds, quantities } = request.body;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  if (itemIds.length !== quantities.length) {
    throw new Error('itemIds and quantities size mismatch.');
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
    func: 'mintBatchToAddress',
    args: [ address, itemIds, quantities ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
