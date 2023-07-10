/*
 * Route: /contracts
 */

const chainUtils = rootRequire('/libs/chainUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const gamePublishedKeyAuthorize = rootRequire('/middlewares/games/publishedKeyAuthorize');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/contracts:
 *    get:
 *      operationId: getContracts
 *      summary: Get contracts
 *      description:
 *        Returns an array of active contracts deployed by the game associated with
 *        the provided `X-Game-Key`.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/headerGameKey'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved an array of contracts for the game
 *            associated with the provided `X-Game-Key`.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/ContractModel'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', gamePublishedKeyAuthorize);
router.get('/', asyncMiddleware(async (request, response) => {
  const { game } = request;

  const contracts = await prisma.contract.findMany({
    where: { gameId: game.id },
  });

  response.success(contracts);
}));

/**
 *  @openapi
 *  /v1/contracts:
 *    post:
 *      operationId: createContract
 *      summary: Create custom contract
 *      description:
 *        Create a MetaFab custom contract entry from an existing contract address
 *        and contract abi. This allows the game and players belonging to the
 *        authenticated game to interact with the contract's read and write
 *        functions through MetaFab's read and write contract endpoints.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                address:
 *                  type: string
 *                  description: The address of the existing contract.
 *                forwarderAddress:
 *                  type: string
 *                  description: The address of the ERC2771 forwarding contract trusted by the contract.
 *                abi:
 *                  type: string
 *                  description: JSON of the abi.
 *                chain:
 *                  type: string
 *                  description: The blockchain you want to deploy this currency on. Support for new blockchains are added over time.
 *                  example: SELECT ONE
 *                  enum: [ARBITRUM,ARBITRUMGOERLI,ARBITRUMNOVA,AVALANCHE,AVALANCHEFUJI,BINANCE,BINANCETESTNET,ETHEREUM,FANTOM,FANTOMTESTNET,GOERLI,MATIC,MATICMUMBAI,MOONBEAM,MOONBEAMTESTNET,THUNDERCORE,THUNDERCORETESTNET]
 *              required:
 *                - address
 *                - abi
 *                - chain
 *      responses:
 *        200:
 *          description:
 *            Successfully created a MetaFab contract entry. Returns a
 *            contract object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ContractModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameSecretKeyAuthorize);
router.post('/', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { address, forwarderAddress, abi, chain } = request.body;

  if (!address || !abi || !chain) {
    throw new Error('address, abi and chain must be provided.');
  }

  if (!evmUtils.isAddress(address)) {
    throw new Error(`address ${address} is not valid.`);
  }

  if (!evmUtils.isAbi(abi)) {
    throw new Error('abi provided is not valid.');
  }

  if (!chainUtils.isSupportedChain(chain)) {
    throw new Error(`chain ${chain} is not a valid chain supported by MetaFab.`);
  }

  const hasExistingContract = await prisma.contract.count({
    where: {
      gameId: game.id,
      address,
      chain,
    },
  });

  if (hasExistingContract) {
    throw new Error(`Contract instance on ${chain} for address ${address} already exists for this game.`);
  }

  const contract = await prisma.contract.create({
    data: {
      chain,
      abi,
      type: 'Custom',
      address,
      forwarderAddress,
      game: { connect: { id: game.id } },
    },
  });

  response.success(contract);
}));

/**
 *  @openapi
 *  /v1/contracts/{contractId}:
 *    delete:
 *      operationId: deleteContract
 *      summary: Delete custom contract
 *      description:
 *        Delete a MetaFab custom contract entry. This will prevent the game and players
 *        belonging to the authenticated game from interacting with the contract's read
 *        and write functions through MetaFab's read and write contract endpoints.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/pathContractId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *      responses:
 *        204:
 *          description:
 *            Successfully deleted the MetaFab contract entry.
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.delete('/:contractId', gameSecretKeyAuthorize);
router.delete('/:contractId', asyncMiddleware(async (request, response) => {
  const { game } = request;
  const { contractId } = request.params;

  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      gameId: game.id,
    },
  });

  if (!contract) {
    throw new Error(`Contract ${contractId} not found for game ${game.id}.`);
  }

  if (contract.type !== 'Custom') {
    throw new Error(`Contract ${contractId} is not a custom contract.`);
  }

  await prisma.contract.delete({
    where: { id: contractId },
  });

  response.success();
}));

/*
 * Export
 */

module.exports = router;
