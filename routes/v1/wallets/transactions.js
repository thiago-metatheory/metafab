/*
 * Route: /wallets/:walletId/transactions
 */

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/wallets/{walletId}/transactions:
 *    get:
 *      operationId: getWalletTransactions
 *      summary: Get wallet transactions
 *      description:
 *        Returns an array of MetaFab initiated transactions performed by the
 *        provided walletId. Transactions returned are ordered chronologically
 *        from newest to oldest.
 *      tags:
 *        - Wallets
 *      parameters:
 *        - $ref: '#/components/parameters/pathWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of transactions performed
 *            by the provided walletId.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { walletId } = request.params;

  const transactions = await prisma.transaction.findMany({
    where: { walletId },
    orderBy: [ { createdAt: 'desc' } ],
  });

  response.success(transactions);
}));

/*
 * Export
 */

module.exports = router;
