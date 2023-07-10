/*
 * Route: /lootboxManagers/:lootboxManagerId/lootboxes
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const cacheUtils = rootRequire('/libs/cacheUtils');
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
 *  /v1/lootboxManagers/{lootboxManagerId}/lootboxes:
 *    get:
 *      operationId: getLootboxManagerLootboxes
 *      summary: Get lootbox manager lootboxes
 *      description:
 *        Returns all lootbox manager lootboxes as an array of lootbox objects.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/pathLootboxManagerId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved lootbox manager lootboxes.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/LootboxManagerLootbox'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { lootboxManagerId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'lootboxManager',
    lootboxManagerId,
  );

  const lootboxLastUpdates = await connectedContractInstance.allLootboxLastUpdates();
  const lootboxes = [];

  for (let i = 0; i < lootboxLastUpdates.length; i++) {
    const [ lootboxId, lastUpdate ] = lootboxLastUpdates[i];

    let lootbox = await cacheUtils.getCachedLootbox(lootboxManagerId, lootboxId, lastUpdate);

    if (!lootbox) {
      const contractLootboxResponse = await connectedContractInstance.lootbox(lootboxId);

      lootbox = await cacheUtils.normalizeAndCacheLootbox(lootboxManagerId, contractLootboxResponse);
    }

    lootboxes.push(lootbox);
  }

  response.success(lootboxes);
}));

/**
 *  @openapi
 *  /v1/lootboxManagers/{lootboxManagerId}/lootboxes/{lootboxManagerLootboxId}:
 *    get:
 *      operationId: getLootboxManagerLootbox
 *      summary: Get lootbox manager lootbox
 *      description:
 *        Returns a lootbox manager lootbox object for the provided lootboxManagerLootboxId.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/pathLootboxManagerId'
 *        - $ref: '#/components/parameters/pathLootboxManagerLootboxId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved lootbox manager lootbox.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/LootboxManagerLootbox'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:lootboxManagerLootboxId', asyncMiddleware(async (request, response) => {
  const { lootboxManagerId, lootboxManagerLootboxId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'lootboxManager',
    lootboxManagerId,
  );

  const lootboxLastUpdate = (await connectedContractInstance.lootboxLastUpdate(lootboxManagerLootboxId))[1];

  let lootbox = await cacheUtils.getCachedLootbox(lootboxManagerId, lootboxManagerLootboxId, lootboxLastUpdate);

  if (!lootbox) {
    const contractLootboxResponse = await connectedContractInstance.lootbox(lootboxManagerLootboxId);

    lootbox = await cacheUtils.normalizeAndCacheLootbox(lootboxManagerId, contractLootboxResponse);
  }

  response.success(lootbox);
}));

/**
 *  @openapi
 *  /v1/lootboxManagers/{lootboxManagerId}/lootboxes:
 *    post:
 *      operationId: setLootboxManagerLootbox
 *      summary: Set lootbox manager lootbox
 *      description:
 *        Sets a new lootbox manager lootbox or updates an existing one for the provided
 *        id. Lootboxes allow item(s) to be burned to receive a random set
 *        of possible item(s) based on probability weight.
 *
 *
 *        Lootboxes can require any number of unique types of items and quantities to
 *        open a created lootbox type within the system. A common pattern with lootboxes
 *        is to create a lootbox item type within an item collection, and require it
 *        as the input item type.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/pathLootboxManagerId'
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
 *                    A unique lootbox id to use for this lootbox for the lootbox manager.
 *                    If an existing lootbox id is used, the current lootbox will
 *                    be updated but the existing number of opens will be kept.
 *                    If you want to reset the number of opens for an existing lootbox,
 *                    first remove it using the remove lootbox endpoint, then set it.
 *                  example: 1337
 *                inputCollectionAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC1155 or MetaFab game items contract address that
 *                    represents the collection for input items required by this lootbox.
 *                    `inputCollectionAddress` or `inputCollectionId` can optionally be provided.
 *                inputCollectionId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab collection id that represents the collection
 *                    for input items required by this lootbox.
 *                    `inputCollectionAddress` or `inputCollectionId` can optionally be provided.
 *                inputCollectionItemIds:
 *                  type: array
 *                  description:
 *                    An array of item ids from the provided input collection that
 *                    are required to open this lootbox. Input items are burn upon
 *                    opening a lootbox.
 *                  items:
 *                    type: integer
 *                inputCollectionItemAmounts:
 *                  type: array
 *                  description:
 *                    An array of amounts for each item id from the provided input collection
 *                    that are required to open this lootbox. Item amounts array indices
 *                    are reflective of the amount required for a given item id at the same index.
 *                  items:
 *                    type: integer
 *                outputCollectionAddress:
 *                  type: string
 *                  description:
 *                    A valid EVM based ERC1155 or MetaFab game items contract address that
 *                    represents the collection for possible output items given by this lootbox.
 *                    `outputCollectionAddress` or `outputCollectionId` can optionally be provided.
 *                outputCollectionId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab collection id that represents the collection
 *                    for possible output items given by this lootbox.
 *                    `outputCollectionAddress` or `outputCollectionId` can optionally be provided.
 *                outputCollectionItemIds:
 *                  type: array
 *                  description:
 *                    An array of item ids from the provided output collection that
 *                    are possibly given by this lootbox. Randomly selected output items are
 *                    automatically minted if the lootbox manager contract has the `minter` role for the output
 *                    collection contract. Otherwise, they are transferred from the
 *                    item balance held by the lootbox manager contract.
 *                  items:
 *                    type: integer
 *                outputCollectionItemAmounts:
 *                  type: array
 *                  description:
 *                    An array of amounts for each item id that can be randomly selected from the
 *                    provided output collection that are given by this lootbox. Item amounts array indices
 *                    are reflective of the amount required for a given item id at the same index.
 *                  items:
 *                    type: integer
 *                outputCollectionItemWeights:
 *                  type: array
 *                  description:
 *                    An array of weights for each item id that can be randomly selected from the
 *                    provided output collection that are given by this lootbox. Any positive integer for
 *                    an item's weight can be provided. The weight for an item relative to the sum of all
 *                    possible item weights determines the probability that an item will be picked
 *                    upon a lootbox being opened. Item weights array indices are reflective of
 *                    the probability weight for a given item id at the same index.
 *                  items:
 *                    type: integer
 *                outputTotalItems:
 *                  type: integer
 *                  description:
 *                    The number of items randomly selected from the possible output items
 *                    when this lootbox is open. If you provide a value greater than 1, it
 *                    is possible for the same item to be selected more than once, giving the
 *                    opener more than one of that item's output from the lootbox.
 *              required:
 *                - id
 *      responses:
 *        200:
 *          description:
 *            Successfully created or updated an lootbox manager lootbox for the provided
 *            lootbox id. Returns a transaction object.
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
  const { lootboxManagerId } = request.params;
  const {
    id,
    inputCollectionAddress,
    inputCollectionItemIds,
    inputCollectionItemAmounts,
    outputCollectionAddress,
    outputCollectionItemIds,
    outputCollectionItemAmounts,
    outputCollectionItemWeights,
    outputTotalItems,
  } = request.body;

  if (id === undefined) {
    throw new Error('id must be provided');
  }

  if (!outputTotalItems) {
    throw new Error('outputTotalItems must be at least 1');
  }

  const lootboxManager = await prisma.lootboxManager.findUnique({
    where: { id: lootboxManagerId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!lootboxManager) {
    throw new Error('Invalid lootboxManagerId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: lootboxManager.contract.id,
    wallet,
    walletSigner,
    func: 'setLootbox',
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
      outputCollectionItemWeights ,
      outputTotalItems,
    ],
  });

  response.success(transaction);
}));

/**
 *  @openapi
 *  /v1/lootboxManagers/{lootboxManagerId}/lootboxes/{lootboxManagerLootboxId}:
 *    delete:
 *      operationId: removeLootboxManagerLootbox
 *      summary: Remove lootbox manager lootbox
 *      description:
 *        Removes the provided lootbox by lootboxId from the provided lootbox manager. Removed
 *        lootboxes can no longer be used.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/pathLootboxManagerId'
 *        - $ref: '#/components/parameters/pathLootboxManagerLootboxId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      responses:
 *        200:
 *          description:
 *            Successfully removed the provided lootbox from the provided lootbox manager.
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

router.delete('/:lootboxManagerLootboxId', gameSecretKeyAuthorize);
router.delete('/:lootboxManagerLootboxId', gameDecryptWallet);
router.delete('/:lootboxManagerLootboxId', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { lootboxManagerId, lootboxManagerLootboxId } = request.params;

  const lootboxManager = await prisma.lootboxManager.findUnique({
    where: { id: lootboxManagerId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!lootboxManager) {
    throw new Error('Invalid lootboxManagerId provided.');
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: lootboxManager.contract.id,
    wallet,
    walletSigner,
    func: 'removeLootbox',
    args: [ lootboxManagerLootboxId ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
