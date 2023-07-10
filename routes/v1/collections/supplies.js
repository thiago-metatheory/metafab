/*
 * Route: /collections/:collectionId/supplies
 */

const contractUtils = rootRequire('/libs/contractUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/supplies:
 *    get:
 *      operationId: getCollectionItemSupplies
 *      summary: Get collection item supplies
 *      description:
 *        Returns the currency circulating supply of all collection items.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved the circulating supply of all collection items.
 *            Supplies are returned as a an object, mapping key value pairs as
 *            itemId -> balance (string to handle uint256 numbers).
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                description:
 *                  Key value pairs represented as itemId -> circulating supply.
 *                additionalProperties:
 *                  type: integer
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', walletIdToAddressOptional);
router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const supplies = await connectedContractInstance.allItemSupplies();
  const result = supplies.reduce((suppliesObj, supply) => {
    const itemId = formattingUtils.formatBigNumber(supply[0]);
    const itemBalance = formattingUtils.formatBigNumber(supply[1]);

    suppliesObj[itemId] = itemBalance;

    return suppliesObj;
  }, {});

  response.success(result);

}));

/*
 * Export
 */

module.exports = router;
