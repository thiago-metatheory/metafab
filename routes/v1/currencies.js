/*
 * Route: /currencies
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');
const forwarderUtils = rootRequire('/libs/forwarderUtils');
const gamePublishedKeyAuthorize = rootRequire('/middlewares/games/publishedKeyAuthorize');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/currencies:
 *    get:
 *      operationId: getCurrencies
 *      summary: Get currencies
 *      description:
 *        Returns an array of active currencies for the game associated
 *        with the provided `X-Game-Key`.
 *      tags:
 *        - Currencies
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of currencies for the game
 *            associated with the provided `X-Game-Key`
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  allOf:
 *                    - $ref: '#/components/schemas/CurrencyModel'
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

  const currencies = await prisma.currency.findMany({
    where: { gameId: game.id },
    include: { contract: true },
  });

  response.success(currencies);
}));

/**
 *  @openapi
 *  /v1/currencies:
 *    post:
 *      operationId: createCurrency
 *      summary: Create currency
 *      description:
 *        Creates a new game currency and deploys an ERC20 token contract on
 *        behalf of the authenticating game's primary wallet. The deployed
 *        ERC20 contract is preconfigured to fully support bridging across
 *        blockchains, batched transfers and gasless transactions on any supported blockchain
 *        as well as full support for gasless transactions from player managed wallets.
 *      tags:
 *        - Currencies
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
 *                  description: The name of this currency. This can be anything, such as `Bright Gems`, `Gold`, etc.
 *                  example: Bright Gems
 *                symbol:
 *                  type: string
 *                  description: The shorthand symbol to represent this currency. This can be anything, such as `BGEM`, `GLD`, etc.
 *                  example: BGEM
 *                supplyCap:
 *                  type: number
 *                  description: The maximum amount of this currency that can ever exist. Use `0` if you do not want this currency to have a maximum supply.
 *                  example: 15000.50
 *                chain:
 *                  type: string
 *                  description: The blockchain you want to deploy this currency on. Support for new blockchains are added over time.
 *                  example: SELECT ONE
 *                  enum: [ARBITRUM,ARBITRUMGOERLI,ARBITRUMNOVA,AVALANCHE,AVALANCHEFUJI,BINANCE,BINANCETESTNET,ETHEREUM,FANTOM,FANTOMTESTNET,GOERLI,MATIC,MATICMUMBAI,MOONBEAM,MOONBEAMTESTNET,THUNDERCORE,THUNDERCORETESTNET]
 *              required:
 *                - name
 *                - symbol
 *                - supplyCap
 *                - chain
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new currency and deployed its associated ERC20 token
 *            contract on the chain specified. Returns a currency object containing
 *            a contract property with the deployment transaction.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/CurrencyModel'
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
  const { name, symbol, chain } = request.body;
  const supplyCap = request.body.supplyCap || 0;

  if (!name || !symbol || !chain) {
    throw new Error('name, symbol and chain must be provided.');
  }

  const existingCurrencies = await prisma.currency.findMany({
    where: {
      gameId: game.id,
      symbol,
    },
    include: {
      contract: {
        select: { chain: true },
      },
    },
  });

  existingCurrencies.forEach(existingCurrency => {
    if (existingCurrency.contract.chain === chain) {
      throw new Error(`A currency with symbol ${symbol} on chain ${chain} already exists for your game.`);
    }
  });

  const type = 'ERC20_Game_Currency';
  const provider = evmUtils.getProvider(chain, game.rpcs);
  const abi = contractUtils.getContractAbi(type);
  const forwarderAddress = forwarderUtils.getLatestForwarderAddress(chain);
  const systemId = evmUtils.hashMessage(game.id);
  const args = [ name, symbol, formattingUtils.parseUnits(supplyCap), forwarderAddress, systemId ];

  const contract = await contractUtils.deployContract(
    walletSigner,
    provider,
    type,
    args,
  );

  await contract.deployTransaction.wait();

  const address = contract.address;
  const hash = contract.deployTransaction.hash;

  const currency = await prisma.currency.create({
    data: {
      name,
      symbol,
      supplyCap,
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

  response.success(currency);
}));

/*
 * Export
 */

module.exports = router;
