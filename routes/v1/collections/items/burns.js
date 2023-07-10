/*
 * Route: /collections/:collectionId/items/:collectionItemId/burns
 */

const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}/burns:
 *    post:
 *      operationId: burnCollectionItem
 *      summary: Burn collection item
 *      description:
 *        Removes (burns) the provided quantity of the collectionItemId from the
 *        authenticating game or players wallet. The quantity is permanently
 *        removed from the circulating supply of the item.
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
 *                quantity:
 *                  type: integer
 *                  description: The quantity of the collectionItemId to burn.
 *              required:
 *                - quantity
 *      responses:
 *        200:
 *          description:
 *            Successfully removed (burned) the quantity of the collectionItemId from
 *            the authenticating game or player's wallet. Returns a transaction object.
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
router.post('/', asyncMiddleware(async (request, response) => {
  const { player, wallet, walletSigner } = request;
  const { collectionId, collectionItemId } = request.params;
  const { quantity } = request.body;

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
    func: 'burnFromAddress',
    args: [ wallet.address, collectionItemId, quantity ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
