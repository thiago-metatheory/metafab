/*
 * Route: /collections/:collectionId/items/:collectionItemId/transfers
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
 *  /v1/collections/{collectionId}/items/{collectionItemId}/transfers:
 *    post:
 *      operationId: transferCollectionItem
 *      summary: Transfer collection item
 *      description:
 *        Transfers specified quantity of itemId to the provided wallet address
 *        or wallet address associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/pathCollectionItemId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                address:
 *                  type: string
 *                  description: A valid EVM based addresses to transfer items to.
 *                walletId:
 *                  type: string
 *                  description: A wallet id within the MetaFab ecosystem to transfer items to.
 *                  items:
 *                    type: string
 *                quantity:
 *                  type: integer
 *                  description: The quantity of the collectionItemId to transfer.
 *              required:
 *                - quantity
 *      responses:
 *        200:
 *          description:
 *            Successfully transferred the provided quantity of the collectionItemId
 *            to the provided wallet address or wallet address of
 *            the provided walletId. Returns a transaction object.
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
  const { collectionId, collectionItemId } = request.params;
  const { address, quantity } = request.body;

  if (!evmUtils.isAddress(address)) {
    throw new Error(`Address ${address} is not valid.`);
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
    allowGasless: !!player,
    func: 'safeTransferFrom',
    args: [ wallet.address, address, collectionItemId, quantity, [] ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
