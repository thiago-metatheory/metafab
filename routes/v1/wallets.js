/*
 * Rute: /wallets
 */

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/wallets/{walletId}:
 *    get:
 *      operationId: getWallet
 *      summary: Get wallet
 *      description:
 *        Returns a wallet object for the provided walletId.
 *      tags:
 *        - Wallets
 *      parameters:
 *        - $ref: '#/components/parameters/pathWalletId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved a wallet object for the provided
 *            walletId.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/WalletModel'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:walletId', asyncMiddleware(async (request, response) => {
  const { walletId } = request.params;

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    throw new Error('No wallet found for provided wallet id.');
  }

  delete wallet.ciphertext;
  delete wallet.backupCiphertexts;

  response.success(wallet);
}));

/*
 * Export
 */

module.exports = router;
