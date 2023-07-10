/*
 * Route: /currencies/:currencyId/balances
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
 *  /v1/currencies/{currencyId}/balances:
 *    get:
 *      operationId: getCurrencyBalance
 *      summary: Get currency balance
 *      description:
 *        Returns the current currency balance of the provided wallet address or
 *        or the wallet address associated with the provided walletId.
 *      tags:
 *        - Currencies
 *      parameters:
 *        - $ref: '#/components/parameters/pathCurrencyId'
 *        - $ref: '#/components/parameters/queryAddress'
 *        - $ref: '#/components/parameters/queryWalletId'
 *      responses:
 *        200:
 *          description: Successfully retrieved currency balance for the provided address or walletId. Balance is returned as a string to handle uint256 numbers.
 *          content:
 *            application/json:
 *              schema:
 *                type: number
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', walletIdToAddressOptional);
router.get('/', asyncMiddleware(async (request, response) => {
  const { currencyId } = request.params;
  const { address } = request.query;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'currency',
    currencyId,
  );

  const balance = await connectedContractInstance.balanceOf(address);

  response.success(formattingUtils.formatUnits(balance));
}));

/*
 * Export
 */

module.exports = router;
