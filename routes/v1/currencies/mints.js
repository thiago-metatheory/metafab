/*
 * Route: /currencies/:currencyId/mints
 */

const evmUtils = rootRequire('/libs/evmUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/currencies/{currencyId}/mints:
 *    post:
 *      operationId: mintCurrency
 *      summary: Mint currency
 *      description:
 *        Creates (mints) the provided amount of currency to the provided
 *        wallet address or wallet address associated with the provided walletId.
 *      tags:
 *        - Currencies
 *      parameters:
 *        - $ref: '#/components/parameters/pathCurrencyId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                amount:
 *                  type: number
 *                  description: The amount of currency to create (mint).
 *                  example: 133.7
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to create (mint) currency for. For example, `0x39cb70F972E0EE920088AeF97Dbe5c6251a9c25D`.
 *                walletId:
 *                  type: string
 *                  description: Any wallet id within the MetaFab ecosystem to create (mint) currency for.
 *              required:
 *                - amount
 *      responses:
 *        200:
 *          description:
 *            Successfully created (minted) the currency amount to the provided
 *            wallet address or wallet address of the provided walletId.
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

router.post('/', gameSecretKeyAuthorize);
router.post('/', gameDecryptWallet);
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { currencyId } = request.params;
  const { address, amount } = request.body;

  if (!evmUtils.isAddress(address)) {
    throw new Error('Invalid address or walletId.');
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
    func: 'mint',
    args: [ address, formattingUtils.parseUnits(amount) ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
