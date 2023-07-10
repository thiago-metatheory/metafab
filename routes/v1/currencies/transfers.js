/*
 * Route: /currencies/:currencyId/transfers
 */

const evmUtils = rootRequire('/libs/evmUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/currencies/{currencyId}/transfers:
 *    post:
 *      operationId: transferCurrency
 *      summary: Transfer currency
 *      description:
 *        Transfers an amount of currency to the provided wallet address or
 *        wallet address associated with the provided walletId. If you want to
 *        transfer to multiple wallets with different amounts and optional references
 *        in one API request, please see the Batch transfer currency documentation.
 *
 *
 *        An optional reference may be included for the transfer. References are
 *        useful for identifying transfers intended to pay for items, trades, services
 *        and more.
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
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to transfer currency to. For example, `0x39cb70F972E0EE920088AeF97Dbe5c6251a9c25D`.
 *                walletId:
 *                  type: string
 *                  description: Any wallet id within the MetaFab ecosystem to transfer currency to.
 *                amount:
 *                  type: number
 *                  description: The amount of currency to transfer.
 *                  example: 133.7
 *                reference:
 *                  type: number
 *                  description: An optional uint256 number to reference the transfer. Commonly used to identify transfers intended to pay for game items or services.
 *                  example: 1242
 *              required:
 *                - amount
 *      responses:
 *        200:
 *          description:
 *            Successfully transferred the currency amount to the provided
 *            wallet address or wallet address of the provided wallet Id.
 *            Returns a transaction object.
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
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { game, player, wallet, walletSigner } = request;
  const { currencyId } = request.params;
  const { address, reference } = request.body;
  const amount = formattingUtils.parseUnits(request.body.amount);

  let func = '';
  let args = [];

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
  }

  if (!amount || amount <= 0) {
    throw new Error('amout must be greater than 0');
  }

  if (reference) {
    func = game ? 'transferWithRef' : 'transferWithFeeRef';
    args = [ address, amount, reference ];
  } else {
    func = game ? 'transfer' : 'transferWithFee';
    args = [ address, amount ];
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
    func,
    args,
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
