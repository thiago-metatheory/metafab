/*
 * Rute: /transactions
 */

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/transactions/{transactionId}:
 *    get:
 *      operationId: getTransaction
 *      summary: Get transaction
 *      description:
 *        Returns an executed transaction object for the provided transactionId.
 *        Transactions are created by MetaFab when interacting with contracts,
 *        currencies, items and other MetaFab resources.
 *      tags:
 *        - Transactions
 *      parameters:
 *        - $ref: '#/components/parameters/pathTransactionId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved a transaction object for the provided
 *            transactionId.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:transactionId', asyncMiddleware(async (request, response) => {
  const { transactionId } = request.params;

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('No transaction found for provided transaction id.');
  }

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
