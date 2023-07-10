/*
 * Route: /lootboxManagers/:lootboxManagerId/lootboxes/:lootboxManagerLootboxId/opens
 */

const contractUtils = rootRequire('./libs/contractUtils');
const evmUtils = rootRequire('./libs/evmUtils');
const cacheUtils = rootRequire('/libs/cacheUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/lootboxManagers/{lootboxManagerId}/lootboxes/{lootboxManagerLootboxId}/opens:
 *    post:
 *      operationId: openLootboxManagerLootbox
 *      summary: Open lootbox manager lootbox
 *      description:
 *        Opens a lootbox manager lootbox. The required input item(s) are
 *        burned from the wallet or player wallet opening the lootbox. The given output
 *        item(s) are given to the wallet or player wallet opening the lootbox.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/pathLootboxManagerId'
 *        - $ref: '#/components/parameters/pathLootboxManagerLootboxId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      responses:
 *        200:
 *          description:
 *            Successfully opened provided lootbox manager lootbox. Returns an array of transaction objects.
 *            The first transaction object being for the lootbox opening, the second for claiming its contents.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameOrPlayerAuthorizeDecryptWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { player, wallet, walletSigner } = request;
  const { lootboxManagerId, lootboxManagerLootboxId } = request.params;

  // get contract instance
  const lootboxManager = await prisma.lootboxManager.findUnique({
    where: { id: lootboxManagerId },
    include: {
      contract: true,
      game: {
        select: {
          id: true,
          rpcs: true,
        },
      },
    },
  });

  if (!lootboxManager) {
    throw new Error('Invalid lootboxManagerId provided.');
  }

  const provider = evmUtils.getProvider(lootboxManager.contract.chain, lootboxManager.game.rpcs);
  const connectedLootboxManagerContractInstance = contractUtils.getContractInstance(
    lootboxManager.contract.address,
    lootboxManager.contract.abi,
  ).connect(provider);

  // get lootbox from cache or on chain
  const lootboxLastUpdate = (await connectedLootboxManagerContractInstance.lootboxLastUpdate(lootboxManagerLootboxId))[1];

  let lootbox = await cacheUtils.getCachedLootbox(lootboxManagerId, lootboxManagerLootboxId, lootboxLastUpdate);

  if (!lootbox) {
    const contractLootboxResponse = await connectedLootboxManagerContractInstance.lootbox(lootboxManagerLootboxId);

    lootbox = await cacheUtils.normalizeAndCacheLootbox(lootboxManagerId, contractLootboxResponse);
  }

  // set approval if needed for input collection contract
  if (lootbox.inputCollection !== evmUtils.zeroAddress) {
    const metafabCollectionContract = await prisma.contract.findFirst({
      where: {
        gameId: lootboxManager.game.id,
        address: lootbox.inputCollection,
        chain: lootboxManager.contract.chain,
      },
      select: { id: true },
    });

    if (!metafabCollectionContract) {
      throw new Error('MetaFab does not support transaction for non-metafab input collection contracts at this time.');
    }

    const connectedCollectionContractInstance = contractUtils.getContractInstance(
      lootbox.inputCollection,
      contractUtils.getContractAbi('ERC1155'),
    ).connect(provider);

    const approved = await connectedCollectionContractInstance.isApprovedForAll(
      wallet.address,
      lootboxManager.contract.address,
    );

    if (!approved) {
      await transactionUtils.executeTransaction({
        contractId: metafabCollectionContract.id,
        wallet,
        walletSigner,
        allowGasless: !!player,
        func: 'setApprovalForAll',
        args: [ lootboxManager.contract.address, true ],
      });
    }
  }

  // determine delay before claiming
  const claimableBlockOffset = await connectedLootboxManagerContractInstance.claimableBlockOffset();
  const openBlock = await provider.getBlockNumber();

  // execute lootbox open
  const openTransaction = await transactionUtils.executeTransaction({
    contractId: lootboxManager.contract.id,
    wallet,
    walletSigner,
    allowGasless: !!player,
    func: 'openLootbox',
    args: [ lootboxManagerLootboxId ],
  });

  // wait for claim block
  await new Promise(resolve => {
    provider.on('block', block => {
      if (block > openBlock + claimableBlockOffset.toNumber()) {
        provider.off('block');
        resolve();
      }
    });
  });

  // execute lootbox claim
  const claimTransaction = await transactionUtils.executeTransaction({
    contractId: lootboxManager.contract.id,
    wallet,
    walletSigner,
    allowGasless: !!player,
    func: 'claimLootboxes',
    args: [ lootboxManagerLootboxId ],
  });

  response.success([ openTransaction, claimTransaction ]);
}));

/*
 * Export
 */

module.exports = router;
