/*
 * Route: /wallets/:walletId/balances
 */

const evmUtils = rootRequire('/libs/evmUtils');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/wallets/{walletId}/balances:
 *    get:
 *      operationId: getWalletBalances
 *      summary: Get wallet balances
 *      description:
 *        Returns the current native token balance for all chains
 *        supported by MetaFab for the provided walletId. This
 *        includes balances like Eth, Matic and other native tokens from
 *        chains MetaFab supports.
 *      tags:
 *        - Wallets
 *      parameters:
 *        - $ref: '#/components/parameters/pathWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved native token balances of the provided
 *            walletId's address for each chain supported by MetaFab. If
 *            an error occurs while retrieving a balance for a chain,
 *            the balance for that chain will be `N/A`.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                additionalProperties:
 *                  type: number
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { walletId } = request.params;

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    select: { address: true },
  });

  if (!wallet) {
    throw new Error('Invalid walletId provided.');
  }

  const balances = await evmUtils.getChainBalances(wallet.address);

  response.success(balances);
}));

/*
 * Export
 */

module.exports = router;
