/*
 * Route: /currencies/:currencyId/burns
 */

const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/currencies/{currencyId}/burns:
 *    post:
 *      operationId: burnCurrency
 *      summary: Burn currency
 *      description:
 *        Removes (burns) the provided amount of currency from the authenticating game or players wallet. The currency amount is permanently removed from the circulating supply of the currency.
 *      tags:
 *        - Currencies
 *      parameters:
 *        - $ref: '#/components/parameters/pathCurrencyId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                amount:
 *                  type: number
 *                  description: The amount of currency to remove (burn). The currency balance of the authenticating game or player's wallet must be equal to or greater than this amount.
 *                  example: 133.7
 *              required:
 *                - amount
 *      responses:
 *        200:
 *          description:
 *            Successfully removed (burned) the currency amount from the authenticating
 *            game or player's wallet. Returns a transaction object.
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
  const { currencyId } = request.params;
  const { amount } = request.body;

  if (!amount || amount <= 0) {
    throw new Error('amount must be greather than 0.');
  }

  const currency = await prisma.currency.findUnique({
    where: { id: currencyId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!currency) {
    throw new Error('Invalid currencyId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: currency.contract.id,
    wallet,
    walletSigner,
    allowGasless: !!player,
    func: player ? 'burnWithFee' : 'burn',
    args: [ formattingUtils.parseUnits(amount) ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
