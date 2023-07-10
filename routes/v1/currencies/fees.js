/*
 * Route: /currencies/:currencyId/fees
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/currencies/{currencyId}/fees:
 *    get:
 *      operationId: getCurrencyFees
 *      summary: Get currency fees
 *      description:
 *        Returns the current fee recipient address and fees of the currency for the
 *        provided currencyId. Fees are only applicable for gasless transactions
 *        performed by default by players.
 *      tags:
 *        - Currencies
 *      parameters:
 *        - $ref: '#/components/parameters/pathCurrencyId'
 *      responses:
 *        200:
 *          description: Successfully retrieved currency fees for the currency of the provided currencyId.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  recipientAddress:
 *                    description:
 *                      The wallet address that fees from all applicable transactions
 *                      are automatically sent to.
 *                    type: string
 *                  basisPoints:
 *                    description:
 *                      The number of fee basis points. 100 basisPoints = 1% fee
 *                      of the total transaction amount deducted from the total
 *                      received by the recipient.
 *                    type: number
 *                  fixedAmount:
 *                    description:
 *                      The fixed number of currency as a fee regardless of
 *                      the total transaction amount. 10 = 10 of the currency as a fee
 *                      for any transaction, deducted from the total received by
 *                      the recipient.
 *                    type: number
 *                  capAmount:
 *                    description:
 *                      The maximum combined fee between basisPoints and fixedAmount.
 *                      If the total transaction fee is over this amount, the capAmount
 *                      will be used as the transaction fee deducted from the total
 *                      received by the recipient.
 *                    type: number
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { currencyId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'currency',
    currencyId,
  );

  const recipientAddress = await connectedContractInstance.feeRecipient();
  const basisPoints = (await connectedContractInstance.feeBps()).toNumber();
  const fixedAmount = formattingUtils.formatUnits(await connectedContractInstance.feeFixed());
  const capAmount = formattingUtils.formatUnits(await connectedContractInstance.feeCap());

  response.success({ recipientAddress, basisPoints, fixedAmount, capAmount });
}));

/**
 *  @openapi
 *  /v1/currencies/{currencyId}/fees:
 *    post:
 *      operationId: setCurrencyFees
 *      summary: Set currency fees
 *      description:
 *        Sets the recipient address, basis points, fixed amount and cap amount
 *        for a currency's fees.
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
 *                recipientAddress:
 *                  type: string
 *                  description: The recipient address of currency transaction fees.
 *                basisPoints:
 *                  type: number
 *                  description:
 *                    A percentage fee for every transaction represented in
 *                    basis points. To set a 1.5% fee, you would use a value of 150.
 *                    This value can be 0, denoting no percentage fees.
 *                fixedAmount:
 *                  type: number
 *                  description:
 *                    A fixed fee for every transaction. A value of 0.5 would mean
 *                    0.5 of the currency of a transaction is always taken as a fee.
 *                    This value can be 0, denoting no fixed fees.
 *                capAmount:
 *                  type: number
 *                  description:
 *                    The maximum fee amount for any single transaction.
 *                    The total fee of a transaction is calculated as the sum
 *                    of the basis points (percentage) fee, and fixed fee.
 *                    If a calculated fee is greater than this maximum fee value,
 *                    the maximum fee will be used instead.
 *              required:
 *                - recipientAddress
 *                - basisPoints
 *                - fixedAmount
 *                - capAmount
 *      responses:
 *        200:
 *          description:
 *            Successfuly set the currency's fees. Returns a transaction object.
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
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { currencyId } = request.params;
  const { recipientAddress, basisPoints, fixedAmount, capAmount } = request.body;

  if (!evmUtils.isAddress(recipientAddress)) {
    throw new Error('Invalid recipientAddress.');
  }

  if (basisPoints > 10000) {
    throw new Error('basisPoints cannot be greater than 100% (10,000 basisPoints).');
  }

  if (fixedAmount > capAmount) {
    throw new Error('fixedAmount cannot be greater than capAmount.');
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
    func: 'setFees',
    args: [
      recipientAddress,
      basisPoints || 0,
      formattingUtils.parseUnits(fixedAmount) || 0,
      formattingUtils.parseUnits(capAmount) || 0,
    ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
