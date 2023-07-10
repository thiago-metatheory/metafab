/*
 * Route: /contracts/:contractId/writes
 */

const transactionUtils = rootRequire('/libs/transactionUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/contracts/{contractId}/writes:
 *    post:
 *      operationId: writeContract
 *      summary: Write contract data
 *      description:
 *        MetaFab's convenience endpoints for contract interactions may not be
 *        flexible enough depending on your use case. For these situations,
 *        you can interact with contracts and create transactions directly.
 *
 *
 *        Using this endpoint, you can execute a transaction for any writeable
 *        contract method as defined in the contract's ABI for the MetaFab contractId
 *        provided. Both Games and Player resources have authority to use this
 *        endpoint to execute transactions against any valid MetaFab contractId.
 *
 *
 *        Additionally, MetaFab will automatically attempt to perform a gasless
 *        transaction for players interacting with a contract through this endpoint.
 *        Gasless transactions by players through this endpoint will only work if
 *        the target contract was deployed through MetaFab or supports MetaFab's
 *        ERC2771 trusted forwarder contract.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/pathContractId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                func:
 *                  type: string
 *                  description: A contract function name. This can be any valid function from the the ABI of the contract you are interacting with. For example, `mint`.
 *                args:
 *                  type: array
 *                  description: An array of args. This is optional and only necessary if the function being invoked requires arguments per the contract ABI. For example, `[123, "Hello", false]`.
 *                  items:
 *                    anyOf:
 *                      - type: string
 *                      - type: number
 *                      - type: boolean
 *                value:
 *                  type: number
 *                  description:
 *                    An optional amount of native chain token to send/pay. Please note
 *                    that because of EVM-compatible chain limitations, any transaction
 *                    attempting to send/pay a value of native token from a given wallet
 *                    will be done so using a standard transaction. This means that the
 *                    wallet must include enough native token to cover gas fees as well
 *                    as the amount being sent.
 *                  example: 12.7
 *                gaslessOverrides:
 *                  type: object
 *                  description:
 *                    Optionally provide this to override MetaFab's default arguments
 *                    used to generate and sign the typed data forward request and domain
 *                    used by the contract's target forwarder. This includes forwardRequest,
 *                    domain and types.
 *                  properties:
 *                    forwardRequest:
 *                      type: object
 *                      description: The forward request struct data used by your forwarder.
 *                    domain:
 *                      type: object
 *                      description: The domain used for signing your typed data.
 *                    types:
 *                      type: object
 *                      description: The forward request struct of encodable data types used when signing your typed data.
 *                    gasLimit:
 *                      type: number
 *                      description: The gas limit (in gas units) passed to the contract called by the meta transaction forwarder.
 *              required:
 *                - func
 *      responses:
 *        200:
 *          description: Successfully executed and confirmed the transaction. Returns a transaction object.
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
  const { contractId } = request.params;
  const { player, wallet, walletSigner } = request;
  const { func, args, value, gaslessOverrides } = request.body;

  if (!func) {
    throw new Error('func must be provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId,
    wallet,
    walletSigner,
    allowGasless: !!player,
    func,
    args,
    value: value ? formattingUtils.parseUnits(value) : undefined,
    gaslessOverrides,
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
