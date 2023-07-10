/*
 * Route: /contracts/:contractId/owners
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
 *  /v1/contracts/{contractId}/owners:
 *    post:
 *      operationId: transferContractOwnership
 *      summary: Transfer contract ownership
 *      description:
 *        Transfer ownership and control of a MetaFab deployed smart contract
 *        to another wallet you control. Transferring control does not disrupt your usage of
 *        MetaFab APIs and can be done so without causing any service outages for your game.
 *        The new owner wallet will have full control over any relevant item collections
 *        and marketplace related pages this contract may be associated with, such
 *        as for MetaFab item or NFT contracts.
 *
 *
 *        Your game's custodial wallet will retain a `MANAGER_ROLE` on your contracts,
 *        allowing you to still use MetaFab APIs without issue while you retain
 *        full contract ownership and the contract's administrator role. If ever you want
 *        eject from using the MetaFab APIs but still retain your deployed smart contracts,
 *        you can revoke the `MANAGER_ROLE` from your game's custodial wallet address
 *        for your contract. We do not lock you into our systems.
 *
 *
 *        Please be certain that the wallet address you transfer ownership to is one you
 *        control. Once ownership and admin permissions are transferred, your game's
 *        custodial wallet no longer has permission to reassign ownership or
 *        administrative priveleges for your contract.
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
 *                ownerAddress:
 *                  type: string
 *                  description:
 *                    A wallet address to assign as the new owner and administrator
 *                    of the target smart contract.
 *              required:
 *                - ownerAddress
 *      responses:
 *        200:
 *          description: Successfully transferred ownership of the target contract. Returns a transaction object.
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
  const { ownerAddress } = request.body;

  if (!evmUtils.isAddress(ownerAddress)) {
    throw new Error('Provided ownerAddress is not a valid address.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId,
    wallet,
    walletSigner,
    func: 'transferOwnershipControl',
    args: [ ownerAddress ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
