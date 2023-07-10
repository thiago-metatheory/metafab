/*
 * Route: /collections
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
 *  /v1/collections:
 *    get:
 *      operationId: getCollections
 *      summary: Get collections
 *      description:
 *        Returns an array of active item collections for the game associated
 *        with the provided `X-Game-Key`.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of item collections for the game
 *            associated with the provided `X-Game-Key`
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  allOf:
 *                    - $ref: '#/components/schemas/CollectionModel'
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

  const collections = await prisma.collection.findMany({
    where: { gameId: game.id },
    include: { contract: true },
  });

  response.success(collections);
}));

/**
 *  @openapi
 *  /v1/collections:
 *    post:
 *      operationId: createCollection
 *      summary: Create collection
 *      description:
 *        Creates a new game item collection and deploys an extended functionality ERC1155
 *        contract on behalf of the authenticating game's primary wallet. The deployed
 *        ERC1155 contract is preconfigured to fully support creating unique item types,
 *        item transfer timelocks, custom metadata per item, gasless transactions from
 *        player managed wallets, and much more.
 *      tags:
 *        - Items
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
 *                    such as `Production - Item Collection`, `Testing - My Game Item Collection`, etc.
 *                chain:
 *                  type: string
 *                  description:
 *                    The blockchain you want to deploy this item collection on.
 *                    Support for new blockchains are added over time.
 *                  example: SELECT ONE
 *                  enum: [ARBITRUM,ARBITRUMGOERLI,ARBITRUMNOVA,AVALANCHE,AVALANCHEFUJI,BINANCE,BINANCETESTNET,ETHEREUM,FANTOM,FANTOMTESTNET,GOERLI,MATIC,MATICMUMBAI,MOONBEAM,MOONBEAMTESTNET,THUNDERCORE,THUNDERCORETESTNET]
 *              required:
 *                - chain
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new item collection and deployed its associated ERC1155
 *            contract on the chain specified. Returns a collection object containing
 *            a contract property with the deployment transaction.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/CollectionModel'
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

  const type = 'ERC1155_Game_Items_Collection';
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

  const collection = await prisma.collection.create({
    data: {
      name: name || `Unnamed ${chain} Collection`,
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

  response.success(collection);
}));

/*
 * Export
 */

module.exports = router;
