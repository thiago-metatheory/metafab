/*
 * Route: /lootboxManagers
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
 *  /v1/lootboxManagers:
 *    get:
 *      operationId: getLootboxManagers
 *      summary: Get lootbox managers
 *      description:
 *        Returns an array of active lootbox managers for the game associated
 *        with the provided `X-Game-Key`.
 *      tags:
 *        - Lootboxes
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of lootbox managers for the game
 *            associated with the provided `X-Game-Key`
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  allOf:
 *                    - $ref: '#/components/schemas/LootboxManagerModel'
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

  const lootboxManagers = await prisma.lootboxManager.findMany({
    where: { gameId: game.id },
    include: { contract: true },
  });

  response.success(lootboxManagers);
}));

/**
 *  @openapi
 *  /v1/lootboxManagers:
 *    post:
 *      operationId: createLootboxManager
 *      summary: Create lootbox manager
 *      description:
 *        Creates a new game lootbox manager and deploys a lootbox manager contract on behalf of
 *        the authenticating game's primary wallet. The deployed lootbox manager contract allows you to create
 *        lootbox behavior for existing items. For example, you can define item id(s) from one of your item collections
 *        as the requirement(s) to open a "lootbox". The required item(s) would be burned from the interacting player's
 *        wallet and the player would receive item(s) from a weighted randomized set of possible items the lootbox can
 *        contain.
 *      tags:
 *        - Lootboxes
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
 *                    The name of this item collection. This can be anything, such as
 *                    `Production - Lootbox Manager`, `Testing - My Game Lootbox Manager`, etc.
 *                chain:
 *                  type: string
 *                  description:
 *                    The blockchain you want to deploy this lootbox manager on.
 *                    Support for new blockchains are added over time.
 *                  example: SELECT ONE
 *                  enum: [ARBITRUM,ARBITRUMGOERLI,ARBITRUMNOVA,AVALANCHE,AVALANCHEFUJI,BINANCE,BINANCETESTNET,ETHEREUM,FANTOM,FANTOMTESTNET,GOERLI,MATIC,MATICMUMBAI,MOONBEAM,MOONBEAMTESTNET,THUNDERCORE,THUNDERCORETESTNET]
 *              required:
 *                - chain
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new lootbox manager and deployed its
 *            contract on the chain specified. Returns a lootbox manager object containing
 *            a contract property with the deployment transaction.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/LootboxManagerModel'
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

  const type = 'Game_Lootbox_Manager';
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

  const lootboxManager = await prisma.lootboxManager.create({
    data: {
      name: name || `Unnamed ${chain} Lootbox Manager`,
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

  response.success(lootboxManager);
}));

/*
 * Export
 */

module.exports = router;
