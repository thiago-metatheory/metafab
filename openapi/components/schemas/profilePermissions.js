module.exports = {
  type: 'object',
  description: 'A properly formatted permissions object that validates against the MetaFab profile permissions schema.',
  additionalProperties: {
    type: 'object',
    description: 'Key should be the contract address, value is the permissions object request for the contract.',
    properties: {
      chain: {
        type: 'string',
        description: 'The target chain for the contract and related permissions.',
      },
      scopes: {
        type: 'array',
        description: 'An optional array of valid permissioning scopes.',
        items: {
          type: 'string',
        },
      },
      functions: {
        type: 'array',
        description: 'An optional array of contract functions to request permission for.',
        items: {
          type: 'string',
        },
      },
      erc20Limit: {
        type: 'integer',
        description: 'A maximum lifetime limit of erc20 that can be tranferred for this contract address.',
      },
      erc1155Limits: {
        type: 'object',
        description: 'An object mapping erc1155 ids to maximum lifetime transfer limits of each permitted item id supplied for this contract address.',
        additionalProperties: {
          type: 'integer',
        },
      },
    },
  },
};
