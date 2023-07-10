/*
 * Routes: /collections/:collectionId/items/:collectionItemId/mints
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
 *  /v1/collections/{collectionId}/items/{collectionItemId}/mints:
 *    post:
 *      operationId: mintCollectionItem
 *      summary: Mint collection item
 *      description:
 *        Creates (mints) the specified quantity of the provided collectionItemId to the
 *        provided wallet address or wallet address associated with the
 *        provided walletId.
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
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to create (mint) the item(s) for. For example, `0x39cb70F972E0EE920088AeF97Dbe5c6251a9c25D`.
 *                quantity:
 *                  type: integer
 *                  description: The quantity of the specified item id to create (mint).
 *                walletId:
 *                  type: string
 *                  description: Any wallet id within the MetaFab ecosystem to create (mint) the item(s) for.
 *              required:
 *                - quantity
 *      responses:
 *        200:
 *          description:
 *            Successfully created (minted) the item(s) to the provided
 *            wallet address or wallet address of the provided walletId.
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
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { collectionId, collectionItemId } = request.params;
  const { address, quantity } = request.body;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  if (!quantity) {
    throw new Error('quantity must be provided.');
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
    func: 'mintToAddress',
    args: [ address, collectionItemId, quantity ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
