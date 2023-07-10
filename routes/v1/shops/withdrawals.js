/*
 * Route: /shops/:shopId/withdrawals
 */

const transactionUtils = rootRequire('/libs/transactionUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');
const collectionIdToAddressOptional = rootRequire('/middlewares/collections/collectionIdToAddressOptional');
const currencyIdToAddressOptional = rootRequire('/middlewares/currencies/currencyIdToAddressOptional');
const walletIdToAddressOptional = rootRequire('/middlewares/wallets/walletIdToAddressOptional');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/shops/{shopId}/withdrawals:
 *    post:
 *      operationId: withdrawFromShop
 *      summary: Withdraw from shop
 *      description:
 *        Withdraws native token, currency or items from a shop.
 *        Whenever a shop offer has input requirements, the native tokens, currencies
 *        or items for the requirements of that offer are deposited into the shop
 *        contract when the offer is used. These can be withdrawn to any other address.
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
 *                address:
 *                  type: string
 *                  description: A valid EVM based address to withdraw to. For example, `0x39cb70F972E0EE920088AeF97Dbe5c6251a9c25D`.
 *                walletId:
 *                  type: string
 *                  description: Any wallet id within the MetaFab ecosystem to withdraw to.
 *                currencyAddress:
 *                  type: string
 *                  description:
 *                    The address of the currency (ERC20) token to withdraw from
 *                    the shop. If no currencyAddress or currencyId, and no collectionAddress or
 *                    collectionId are provided, the native token held by the shop will be
 *                    withdrawn.
 *                currencyId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab currency id that represents the currency
 *                    token to withdraw from the shop. `currencyAddress` or
 *                    `currencyId` can be provided when withdrawing currency.
 *                collectionAddress:
 *                  type: string
 *                  description:
 *                    The address of the collection (ERC1155) for the items to withdraw from
 *                    the shop. If no currencyAddress and no collectionAddress
 *                    is provided, the native token held by the shop will be
 *                    withdrawn.
 *                collectionId:
 *                  type: string
 *                  description:
 *                    A valid MetaFab collection id that represents the collection
 *                    for the items to withdraw from the shop. `collectionAddress` or
 *                    `collectionId` can be provided when withdrawing items.
 *                itemIds:
 *                  type: array
 *                  description:
 *                    The specific itemIds of the provided collection
 *                    to withdraw from the shop.
 *                  items:
 *                    type: integer
 *      responses:
 *        200:
 *          description:
 *            Successfully performed a withdrawal to the provided
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
router.post('/', collectionIdToAddressOptional);
router.post('/', currencyIdToAddressOptional);
router.post('/', walletIdToAddressOptional);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { shopId } = request.params;
  const { address, currencyAddress, collectionAddress, itemIds } = request.body;

  if (!address) {
    throw new Error('An address to withdraw to must be provided.');
  }

  if (collectionAddress && !itemIds) {
    throw new Error('itemIds must be provided with collectionAddress.');
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

  let func;
  let args;

  // withdraw native token
  if (!currencyAddress && !collectionAddress) {
    func = 'withdrawTo';
    args = [ address ];
  }

  // withdraw currency
  if (currencyAddress) {
    func = 'withdrawCurrencyTo',
    args = [ currencyAddress, address ];
  }

  // withdraw collection items
  if (collectionAddress) {
    func = 'withdrawItemsTo';
    args = [ collectionAddress, itemIds, address ];
  }

  const transaction = await transactionUtils.executeTransaction({
    contractId: shop.contract.id,
    wallet,
    walletSigner,
    func,
    args,
  });

  return response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
