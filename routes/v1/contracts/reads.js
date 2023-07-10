/*
 * Route: /contracts/:contractId/reads
 */

const contractUtils = rootRequire('/libs/contractUtils');
const evmUtils = rootRequire('/libs/evmUtils');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/contracts/{contractId}/reads:
 *    get:
 *      operationId: readContract
 *      summary: Read contract data
 *      description:
 *        Oftentimes you'll want to query and retrieve some data from a contract.
 *        This is incredibly easy to do for any contract deployed through MetaFab.
 *
 *
 *        Using this endpoint, you can get the data returned by any readable
 *        function listed in a contracts ABI. This could be things like querying
 *        the totalSupply of a currency contract, the number of owners of an items
 *        contract, and more.
 *      tags:
 *        - Contracts
 *      parameters:
 *        - $ref: '#/components/parameters/pathContractId'
 *        - $ref: '#/components/parameters/queryFunc'
 *        - $ref: '#/components/parameters/queryArgs'
 *      responses:
 *        200:
 *          description: Successfully retrieved value returned by contract function.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/AnyValue'
 *
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { contractId } = request.params;
  const { func, args } = request.query;

  let parsedArgs;

  try {
    parsedArgs = JSON.parse(args);
  } catch (error) {
    parsedArgs = args ? args.split(',') : undefined;
  }

  if (!func) {
    throw new Error('func must be provided.');
  }

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'contract',
    contractId,
  );

  if (!connectedContractInstance[func]) {
    throw new Error(`Function ${func} is not valid for contract id ${contractId}.`);
  }

  const result = parsedArgs
    ? await connectedContractInstance[func](...parsedArgs)
    : await connectedContractInstance[func]();

  response.success(result);
}));

/*
 * Export
 */

module.exports = router;
