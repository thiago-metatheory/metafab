/*
 * Route: /wallets/:walletId/signatures
 */

const decryptWallet = rootRequire('/middlewares/wallets/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/wallets/{walletId}/signatures:
 *    post:
 *      operationId: createWalletSignature
 *      summary: Create wallet signature
 *      description:
 *        Creates a wallet signature from a plaintext message using the wallet for
 *        the provided walletId and walletDecryptKey. Wallet signatures cannot be
 *        generated for EOA wallets.
 *      tags:
 *        - Wallets
 *      parameters:
 *        - $ref: '#/components/parameters/pathWalletId'
 *        - $ref: '#/components/parameters/headerWalletDecryptKey'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description:
 *                    The plaintext message to sign.
 *              required:
 *                - message
 *      responses:
 *        200:
 *          description:
 *            Successfully created a wallet signature from the provided message
 *            using the provided wallet.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  signature:
 *                    type: string
 *                    description: The generated signature.
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', decryptWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { walletSigner } = request;
  const { message } = request.body;

  const signature = await walletSigner.signMessage(message);

  response.success({ signature });
}));

/*
 * Export
 */

module.exports = router;
