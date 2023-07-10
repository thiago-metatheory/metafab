/*
 * Route: /collections/:collectionId/items/:collectionItemId/balances
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}/balances:
 *    get:
 *      operationId: getCollectionItemBalance
 *      summary: Get collection item balance
 *      description:
 *        Returns the current collection item balance of the provided
 *        collectionItemId for the provided wallet address or the wallet address
 *        associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/pathCollectionItemId'
 *        - $ref: '#/components/parameters/queryAddress'
 *        - $ref: '#/components/parameters/queryWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved collection item balance of the
 *            provided collectionItemId for address or walletId. Balance is
 *            returned as a string to handle uint256 numbers.
 *          content:
 *            application/json:
 *              schema:
 *                type: integer
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', walletIdToAddressOptional);
router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId, collectionItemId } = request.params;
  const { address } = request.query;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const balance = await connectedContractInstance.balanceOf(address, collectionItemId);

  response.success(formattingUtils.formatBigNumber(balance));
}));

/*
 * Export
 */

module.exports = router;
