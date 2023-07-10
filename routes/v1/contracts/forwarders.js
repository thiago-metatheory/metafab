/*
 * Route: /contracts/:contractId/forwarders
 */

const evmUtils = rootRequire('/libs/evmUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecrypWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/contracts/{contractId}/forwarders:
 *    post:
 *      operationId: upgradeContractTrustedForwarder
 *      summary: Upgrade contract trusted forwarder
 *      description:
 *        In rare circumstances, you may need to upgrade the underlying trusted forwarder
 *        contract address attached to your game's contracts. Using this endpoint,
 *        you can provide a new trusted forwarder contract address to assign to
 *        any of your contracts that implement the `upgradeTrustedForwarder` function.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/pathContractId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                forwarderAddress:
 *                  type: string
 *                  description:
 *                    A ERC2771 forwarder smart contract address to assign as the new
 *                    trusted forwarder of the target smart contract.
 *              required:
 *                - forwarderAddress
 *      responses:
 *        200:
 *          description: Successfully upgraded the trusted forwarder for the target contract. Returns a transaction object.
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
router.post('/', gameDecrypWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { contractId } = request.params;
  const { wallet, walletSigner } = request;
  const { forwarderAddress } = request.body;

  if (!evmUtils.isAddress(forwarderAddress)) {
    throw new Error('Provided forwarderAddress is not a valid address.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId,
    wallet,
    walletSigner,
    func: 'upgradeTrustedForwarder',
    args: [ forwarderAddress ],
  });

  await prisma.contract.update({
    where: { id: contractId },
    data: { forwarderAddress },
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
