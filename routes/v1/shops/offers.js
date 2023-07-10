/*
 * Route: /shops/:shopId/offers
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const cacheUtils = rootRequire('/libs/cacheUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const collectionIdToAddressOptional = rootRequire('/middlewares/collections/collectionIdToAddressOptional');
const currencyIdToAddressOptional = rootRequire('/middlewares/currencies/currencyIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/shops/{shopId}/offers:
 *    get:
 *      operationId: getShopOffers
 *      summary: Get shop offers
 *      description:
 *        Returns all shop offers as an array of shop offer objects.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/pathShopId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved shop offers.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/ShopOffer'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { shopId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'shop',
    shopId,
  );

  const offerLastUpdates = await connectedContractInstance.allOfferLastUpdates();
  const offers = [];

  for (let i = 0; i < offerLastUpdates.length; i++) {
    const [ offerId, lastUpdate ] = offerLastUpdates[i];

    let offer = await cacheUtils.getCachedOffer(shopId, offerId, lastUpdate);

    if (!offer) {
      const contractOfferResponse = await connectedContractInstance.offer(offerId);

      offer = await cacheUtils.normalizeAndCacheOffer(shopId, contractOfferResponse);
    }

    offers.push(offer);
  }

  response.success(offers);
}));

/**
 *  @openapi
 *  /v1/shops/{shopId}/offers/{shopOfferId}:
 *    get:
 *      operationId: getShopOffer
 *      summary: Get shop offer
 *      description:
 *        Returns a shop offer object for the provided shopOfferId.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/pathShopId'
 *        - $ref: '#/components/parameters/pathShopOfferId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved shop offer.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ShopOffer'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:shopOfferId', asyncMiddleware(async (request, response) => {
  const { shopId, shopOfferId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'shop',
    shopId,
  );

  const offerLastUpdate = (await connectedContractInstance.offerLastUpdate(shopOfferId))[1];

  let offer = await cacheUtils.getCachedOffer(shopId, shopOfferId, offerLastUpdate);

  if (!offer) {
    const contractOfferResponse = await connectedContractInstance.offer(shopOfferId);

    offer = await cacheUtils.normalizeAndCacheOffer(shopId, contractOfferResponse);
  }

  response.success(offer);
}));

/**
 *  @openapi
 *  /v1/shops/{shopId}/offers:
 *    post:
 *      operationId: setShopOffer
 *      summary: Set shop offer
 *      description:
 *        Sets a new shop offer or updates an existing one for the provided
 *        id. Shop offers allow currency to item, item to currency or item to
 *        item exchanges.
 *
 *
 *        All request fields besides `id` are optional. Any optional fields omitted will
 *        not be used for the offer. This allows you to create many different combinations
 *        of offers. For example, you can create an offer that may require 3 unique item
 *        ids of specified quantities from a given item collection and gives the user
 *        1 new unique item id in exchange.
 *
 *
 *        Another example, you may want to make a shop offer from one ERC20 token
 *        to another. This is also possible - simple set the input and output currency
 *        fields and leave the others blank.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/pathShopId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description:
 *                    A unique offer id to use for this offer for the shop.
 *                    If an existing offer id is used, the current offer will
 *                    be updated but the existing number of uses will be kept.
 *                    If you want to reset the number of uses for an existing offer,
 *                    first remove it using the remove offer endpoint, then set it.
 *                  example: 1337
 *                inputCollectionAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC1155 or MetaFab game items contract address that
 *                    represents the collection for input items required by this offer.
 *                    `inputCollectionAddress` or `inputCollectionId` can optionally be provided.
 *                inputCollectionId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab collection id that represents the collection
 *                    for input items required by this offer.
 *                    `inputCollectionAddress` or `inputCollectionId` can optionally be provided.
 *                inputCollectionItemIds:
 *                  type: array
 *                  description:
 *                    An array of item ids from the provided input collection that
 *                    are required to use this offer. Input items are transferred
 *                    from the wallet to the shop contract upon using an offer.
 *                  items:
 *                    type: integer
 *                inputCollectionItemAmounts:
 *                  type: array
 *                  description:
 *                    An array of amounts for each item id from the provided input collection
 *                    that are required to use this offer. Item amounts array indices
 *                    are reflective of the amount required for a given item id at the same index.
 *                  items:
 *                    type: integer
 *                inputCurrencyAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC20 or MetaFab game currency contract address that
 *                    for the currency required by this offer.
 *                inputCurrencyId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab currency id that represents the currency
 *                    required by this offer.
 *                inputCurrencyAmount:
 *                  type: number
 *                  description:
 *                    The amount of currency required by this offer. If an
 *                    inputCurrencyAmount is provided without in input currency address
 *                    or id, the native chain currency is used as the required currency.
 *                outputCollectionAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC1155 or MetaFab game items contract address that
 *                    represents the collection for output items given by this offer.
 *                    `outputCollectionAddress` or `outputCollectionId` can optionally be provided.
 *                outputCollectionId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab collection id that represents the collection
 *                    for output items given by this offer.
 *                    `outputCollectionAddress` or `outputCollectionId` can optionally be provided.
 *                outputCollectionItemIds:
 *                  type: array
 *                  description:
 *                    An array of item ids from the provided output collection that
 *                    are given by this offer. Output items are automatically minted
 *                    if the shop contract has the `minter` role for the output
 *                    collection contract. Otherwise, they are transferred from the
 *                    item balance held by the shop contract.
 *                  items:
 *                    type: integer
 *                outputCollectionItemAmounts:
 *                  type: array
 *                  description:
 *                    An array of amounts for each item id from the provided output collection
 *                    that are given by this offer. Item amounts array indices
 *                    are reflective of the amount required for a given item id at the same index.
 *                  items:
 *                    type: integer
 *                outputCurrencyAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC20 or MetaFab game currency contract address that
 *                    for the currency given by this offer. The output currency amount is
 *                    automatically minted if the shop contract has the `minter` role
 *                    for the output currency contract. Otherwise, they are transferred from
 *                    the currency balance held by the shop contract.
 *                outputCurrencyId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab currency id for the currency
 *                    given by this offer.
 *                outputCurrencyAmount:
 *                  type: number
 *                  description:
 *                    The amount of currency given by this offer. If an
 *                    outputCurrencyAmount is provided without an output currency address
 *                    or id, the native chain currency is used as the given currency.
 *                maxUses:
 *                  type: integer
 *                  description:
 *                    The maximum number of times this offer can be used in total.
 *                    maxUses is collective across all uses of the offer. If 5
 *                    unique players use an offer, that counts as 5 offer uses.
 *                    Exclude this or use 0 to allow unlimited uses.
 *              required:
 *                - id
 *      responses:
 *        200:
 *          description:
 *            Successfully created or updated a shop offer for the provided
 *            offer id. Returns a transaction object.
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
router.post('/', collectionIdToAddressOptional);
router.post('/', currencyIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { shopId } = request.params;
  const {
    id,
    inputCollectionAddress,
    inputCollectionItemIds,
    inputCollectionItemAmounts,
    inputCurrencyAddress,
    inputCurrencyAmount,
    outputCollectionAddress,
    outputCollectionItemIds,
    outputCollectionItemAmounts,
    outputCurrencyAddress,
    outputCurrencyAmount,
    maxUses,
  } = request.body;

  if (id === undefined) {
    throw new Error('id must be provided');
  }

  if (inputCurrencyAddress && !inputCurrencyAmount) {
    throw new Error('inputCurrencyAmount must be provided with inputCurrencyAddress or inputCurrencyId.');
  }

  if (outputCurrencyAddress && !outputCurrencyAmount) {
    throw new Error('outputCurrencyAmount must be provided with outputCurrencyAddress or outputCurrencyId.');
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!shop) {
    throw new Error('Invalid shopId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: shop.contract.id,
    wallet,
    walletSigner,
    func: 'setOffer',
    args: [
      id,
      [ // inputOutputCollections
        inputCollectionAddress || evmUtils.zeroAddress,
        outputCollectionAddress || evmUtils.zeroAddress,
      ],
      [ // inputOutputItemIds
        inputCollectionItemIds || [],
        outputCollectionItemIds || [],
      ],
      [ // inputOutputItemAmounts
        inputCollectionItemAmounts || [],
        outputCollectionItemAmounts || [],
      ],
      [ // inputOutputCurrency
        inputCurrencyAddress || evmUtils.zeroAddress,
        outputCurrencyAddress || evmUtils.zeroAddress,
      ],
      [ // inputOutputCurrencyAmounts
        formattingUtils.parseUnits(inputCurrencyAmount || 0),
        formattingUtils.parseUnits(outputCurrencyAmount || 0),
      ],
      maxUses || 0,
    ],
  });

  response.success(transaction);
}));

/**
 *  @openapi
 *  /v1/shops/{shopId}/offers/{shopOfferId}:
 *    delete:
 *      operationId: removeShopOffer
 *      summary: Remove shop offer
 *      description:
 *        Removes the provided offer by offerId from the provided shop. Removed
 *        offers can no longer be used.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/pathShopId'
 *        - $ref: '#/components/parameters/pathShopOfferId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      responses:
 *        200:
 *          description:
 *            Successfully removed the provided offer from the provided shop.
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

router.delete('/:shopOfferId', gameSecretKeyAuthorize);
router.delete('/:shopOfferId', gameDecryptWallet);
router.delete('/:shopOfferId', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { shopId, shopOfferId } = request.params;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!shop) {
    throw new Error('Invalid shopId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: shop.contract.id,
    wallet,
    walletSigner,
    func: 'removeOffer',
    args: [ shopOfferId ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
