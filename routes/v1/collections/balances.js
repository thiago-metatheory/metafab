/*
 * Route: /collections/:collectionId/balances
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
 *  /v1/collections/{collectionId}/balances:
 *    get:
 *      operationId: getCollectionItemBalances
 *      summary: Get collection item balances
 *      description:
 *        Returns the current collection item balances of all collection items for the provided
 *        wallet address or the wallet address associated with the provided walletId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/queryAddress'
 *        - $ref: '#/components/parameters/queryWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved currency balances of all collection items owned by
 *            the provided address or walletId. Balances are returned as a an object,
 *            mapping key value pairs as itemId -> balance (string to handle uint256 numbers).
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                description:
 *                  Key value pairs represented as itemId -> balance for
 *                  the provided wallet or address.
 *                additionalProperties:
 *                  type: integer
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', walletIdToAddressOptional);
router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId } = request.params;
  const { address } = request.query;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const balances = await connectedContractInstance.balanceOfAll(address);
  const result = balances.reduce((balancesObj, balance) => {
    const itemId = formattingUtils.formatBigNumber(balance[0]);
    const itemBalance = formattingUtils.formatBigNumber(balance[1]);

    balancesObj[itemId] = itemBalance;

    return balancesObj;
  }, {});

  response.success(result);
}));

/*
 * Export
 */

module.exports = router;
