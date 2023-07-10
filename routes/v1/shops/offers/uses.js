/*
 * Route: /shops/:shopId/offers/:shopOfferId/uses
 */

const contractUtils = rootRequire('./libs/contractUtils');
const evmUtils = rootRequire('./libs/evmUtils');
const cacheUtils = rootRequire('/libs/cacheUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameOrPlayerAuthorizeDecryptWallet = rootRequire('/middlewares/gameOrPlayerAuthorizeDecryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/shops/{shopId}/offers/{shopOfferId}/uses:
 *    post:
 *      operationId: useShopOffer
 *      summary: Use shop offer
 *      description:
 *        Uses a shop offer. The required (input) item(s) and/or currency are
 *        removed from the wallet or player wallet using the offer. The given (output)
 *        item(s) and/or currency are given to the wallet or player wallet using the offer.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/pathShopId'
 *        - $ref: '#/components/parameters/pathShopOfferId'
 *        - $ref: '#/components/parameters/headerAuthorizationGameOrPlayer'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGameOrPlayer'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                times:
 *                  type: integer
 *                  description:
 *                    The number of times to use this offer. For example, if your
 *                    shop sells 1 item for 10 of your game currency, and a player wants
 *                    to buy 5 of that item, you can pass a value of `5`. This effectively
 *                    triggers the player to use the offer 5 times through a single API call
 *                    This is optional and defaults to a value of `1`.
 *                  example: 5
 *      responses:
 *        200:
 *          description:
 *            Successfully used provided shop offer. Returns a transaction object.
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
  const { shopId, shopOfferId } = request.params;
  const times = request.body.times || 1;

  // get contract instance
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
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

  if (!shop) {
    throw new Error('Invalid shopId provided.');
  }

  const provider = evmUtils.getProvider(shop.contract.chain, shop.game.rpcs);
  const connectedShopContractInstance = contractUtils.getContractInstance(
    shop.contract.address,
    shop.contract.abi,
  ).connect(provider);

  // get offer from cache or on chain
  const offerLastUpdate = (await connectedShopContractInstance.offerLastUpdate(shopOfferId))[1];

  let offer = await cacheUtils.getCachedOffer(shopId, shopOfferId, offerLastUpdate);

  if (!offer) {
    const contractOfferResponse = await connectedShopContractInstance.offer(shopOfferId);

    offer = await cacheUtils.normalizeAndCacheOffer(shopId, contractOfferResponse);
  }

  // set approval if needed for input collection contract
  if (offer.inputCollection !== evmUtils.zeroAddress) {
    const metafabCollectionContract = await prisma.contract.findFirst({
      where: {
        gameId: shop.game.id,
        address: offer.inputCollection,
        chain: shop.contract.chain,
      },
      select: { id: true },
    });

    if (!metafabCollectionContract) {
      throw new Error('MetaFab does not support transactions for non-metafab input collection contracts at this time.');
    }

    const connectedCollectionContractInstance = contractUtils.getContractInstance(
      offer.inputCollection,
      contractUtils.getContractAbi('ERC1155'),
    ).connect(provider);

    const approved = await connectedCollectionContractInstance.isApprovedForAll(
      wallet.address,
      shop.contract.address,
    );

    if (!approved) {
      await transactionUtils.executeTransaction({
        contractId: metafabCollectionContract.id,
        wallet,
        walletSigner,
        allowGasless: !!player,
        func: 'setApprovalForAll',
        args: [ shop.contract.address, true ],
      });
    }
  }

  // set approval if needed for input currency contract
  if (offer.inputCurrency !== evmUtils.zeroAddress) {
    const metafabCurrencyContract = await prisma.contract.findFirst({
      where: {
        gameId: shop.game.id,
        address: offer.inputCurrency,
        chain: shop.contract.chain,
      },
      select: { id: true },
    });

    if (!metafabCurrencyContract) {
      throw new Error('MetaFab does not support transactions for non-metafab input contracts at this time.');
    }

    const connectedCurrencyContractInstance = contractUtils.getContractInstance(
      offer.inputCurrency,
      contractUtils.getContractAbi('ERC20'),
    ).connect(provider);

    const allowance = await connectedCurrencyContractInstance.allowance(
      wallet.address,
      shop.contract.address,
    );

    if (formattingUtils.formatUnits(allowance) < 100 * 1000 * 1000 * 1000) { // 100 billion
      await transactionUtils.executeTransaction({
        contractId: metafabCurrencyContract.id,
        wallet,
        walletSigner,
        allowGasless: !!player,
        func: 'approve',
        args: [ shop.contract.address, evmUtils.maxUint256 ],
      });
    }
  }

  // execute offer use
  const value = offer.inputCurrency === evmUtils.zeroAddress && offer.inputCurrencyAmount > 0
    ? formattingUtils.parseUnits(offer.inputCurrencyAmount * times)
    : undefined;

  const transaction = await transactionUtils.executeTransaction({
    contractId: shop.contract.id,
    wallet,
    walletSigner,
    allowGasless: !!player && !value,
    func: times > 1 ? 'useOfferMulti' : 'useOffer',
    args: times > 1 ? [ shopOfferId, times ] : [ shopOfferId ],
    value,
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
