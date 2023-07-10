/*
 * Route: /currencies/:currencyId/batchTransfers
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
 *  /v1/currencies/{currencyId}/batchTransfers:
 *    post:
 *      operationId: batchTransferCurrency
 *      summary: Batch transfer currency
 *      description:
 *        Transfers multiple amounts of currency to multiple provided wallet addresses
 *        or wallet addresses associated with the provided walletIds. You may also
 *        provide a combination of addresses and walletIds in one request, the proper
 *        receipients will be automatically determined, with `addresses` getting `amounts`
 *        order priority first.
 *
 *
 *        Optional references may be included for the transfer. References are
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
 *                addresses:
 *                  type: array
 *                  description: An array of valid EVM based addresses to transfer currency to.
 *                  items:
 *                    type: string
 *                walletIds:
 *                  type: array
 *                  description: An array of wallet ids within the MetaFab ecosystem to transfer currency to.
 *                  items:
 *                    type: string
 *                amounts:
 *                  type: array
 *                  description: An array of currency amounts to transfer. Ordering corresponds to the ordering of provided `addresses` and/or `walletIds`. If both `addresses` and `walletIds` are provided, `addresses` are first in the order.
 *                  items:
 *                    type: number
 *                    example: 10.0
 *                references:
 *                  type: array
 *                  description: An optional array of uint256 numbers to reference each transfer in the batch. Ordering corresponds to the ordering of provided `addresses` or `walletIds`. If both `addresses` and `walletIds` are provided, `addresses` are first in the order.
 *                  items:
 *                    type: number
 *              required:
 *                - amounts
 *      responses:
 *        200:
 *          description:
 *            Successfully transferred the currency amounts to the provided
 *            wallet addresses and/or wallet addresses of the provided walletIds.
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
  const { addresses, references } = request.body;
  const amounts = request.body.amounts.map(amount => formattingUtils.parseUnits(amount));

  let func = '';
  let args = [];

  if (!addresses || !addresses.length) {
    throw new Error('At least 1 address or valid walletId must be provided.');
  }

  addresses.forEach(batchAddress => {
    if (!evmUtils.isAddress(batchAddress)) {
      throw new Error(`Batch address ${batchAddress} is not valid.`);
    }
  });

  if (addresses.length !== amounts.length) {
    throw new Error('amounts size mistmatch.');
  }

  if (references && references.length) {
    if (addresses.length !== references.length) {
      throw new Error('batchReferences size mismatch.');
    }

    func = game ? 'batchTransferWithRefs' : 'batchTransferWithFeesRefs';
    args = [ addresses, amounts, references ];
  } else {
    func = game ? 'batchTransfer' : 'batchTransferWithFees';
    args = [ addresses, amounts ];
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
