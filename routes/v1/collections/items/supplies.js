/*
 * Route: /collections/:collectionId/items/:collectionItemId/supplies
 */

const contractUtils = rootRequire('/libs/contractUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}/supplies:
 *    get:
 *      operationId: getCollectionItemSupply
 *      summary: Get collection item supply
 *      description:
 *        Returns the current circulating supply of the provided
 *        collectionItemId.
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
 *            Successfully retrieved collection item supply. Supply is returned
 *            as a string to handle uint256 numbers.
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

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const supply = await connectedContractInstance.itemSupplies(collectionItemId);

  response.success(formattingUtils.formatBigNumber(supply));
}));

/*
 * Export
 */

module.exports = router;
