/*
 * Route: /shops
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const forwarderUtils = rootRequire('/libs/forwarderUtils');
const gamePublishedKeyAuthorize = rootRequire('/middlewares/games/publishedKeyAuthorize');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/shops:
 *    get:
 *      operationId: getShops
 *      summary: Get shops
 *      description:
 *        Returns an array of active shops for the game associated
 *        with the provided `X-Game-Key`.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of shops for the game
 *            associated with the provided `X-Game-Key`
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  allOf:
 *                    - $ref: '#/components/schemas/ShopModel'
 *                    - type: object
 *                      properties:
 *                        contract:
 *                          $ref: '#/components/schemas/ContractModel'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', gamePublishedKeyAuthorize);
router.get('/', asyncMiddleware(async (request, response) => {
  const { game } = request;

  const shops = await prisma.shop.findMany({
    where: { gameId: game.id },
    include: { contract: true },
  });

  response.success(shops);
}));

/**
 *  @openapi
 *  /v1/shops:
 *    post:
 *      operationId: createShop
 *      summary: Create shop
 *      description:
 *        Creates a new game shop and deploys a shop contract on behalf of
 *        the authenticating game's primary wallet. The deployed shop contract allows you to create fixed
 *        price rates for players to buy specific items from any item collection or ERC1155 contract.
 *        Additionally, a shop allows you to create shop offers for some set of item(s) to another set of
 *        item(s) or any mix of currency. Shops completely support gasless player transactions.
 *      tags:
 *        - Shops
 *      parameters:
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  description:
 *                    The name of this item collection. This can be anything,
 *                    such as `Production - Game Shop`, `Testing - My Game Shop`, etc.
 *                chain:
 *                  type: string
 *                  description:
 *                    The blockchain you want to deploy this shop on.
 *                    Support for new blockchains are added over time.
 *                  example: SELECT ONE
 *                  enum: [ARBITRUM,ARBITRUMGOERLI,ARBITRUMNOVA,AVALANCHE,AVALANCHEFUJI,BINANCE,BINANCETESTNET,ETHEREUM,FANTOM,FANTOMTESTNET,GOERLI,MATIC,MATICMUMBAI,MOONBEAM,MOONBEAMTESTNET,THUNDERCORE,THUNDERCORETESTNET]
 *              required:
 *                - chain
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new shop and deployed its
 *            contract on the chain specified. Returns a shop object containing
 *            a contract property with the deployment transaction.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ShopModel'
 *                  - type: object
 *                    properties:
 *                      contract:
 *                        allOf:
 *                          - $ref: '#/components/schemas/ContractModel'
 *                          - type: object
 *                            properties:
 *                              transactions:
 *                                type: array
 *                                items:
 *                                  $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameSecretKeyAuthorize);
router.post('/', gameDecryptWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { game, wallet, walletSigner } = request;
  const { name, chain } = request.body;

  if (!chain) {
    throw new Error('chain must be provided.');
  }

  const type = 'Game_Shop';
  const provider = evmUtils.getProvider(chain, game.rpcs);
  const abi = contractUtils.getContractAbi(type);
  const forwarderAddress = forwarderUtils.getLatestForwarderAddress(chain);
  const systemId = evmUtils.hashMessage(game.id);
  const args = [ forwarderAddress, systemId ];

  const contract = await contractUtils.deployContract(
    walletSigner,
    provider,
    type,
    args,
  );

  await contract.deployTransaction.wait();

  const address = contract.address;
  const hash = contract.deployTransaction.hash;

  const shop = await prisma.shop.create({
    data: {
      name: name || `Unnamed ${chain} Shop`,
      contract: {
        create: {
          chain,
          abi,
          type,
          address,
          forwarderAddress,
          game: { connect: { id: game.id } },
          transactions: {
            create: {
              function: 'create',
              args,
              hash,
              wallet: { connect: { id: wallet.id } },
            },
          },
        },
      },
      game: { connect: { id: game.id } },
    },
    include: {
      contract: {
        include: { transactions: true },
      },
    },
  });

  response.success(shop);
}));

/*
 * Export
 */

module.exports = router;
