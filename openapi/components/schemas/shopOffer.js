module.exports = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
      description: 'The id of this offer.',
    },
    inputCollection: {
      type: 'string',
      description: 'The address of the ERC1155 or MetaFab game items contract for input items required by this offer.',
    },
    inputCollectionItemIds: {
      type: 'array',
      description: 'An array of item ids from the input collection that are required for this offer.',
      items: {
        type: 'integer',
      },
    },
    inputCollectionItemAmounts: {
      type: 'array',
      description: 'An array of amounts for each item id for the input collection that are required to use this offer.',
      items: {
        type: 'integer',
      },
    },
    inputCurrency: {
      type: 'string',
      description: 'The address of the ERC20 or MetaFab game currency for the currency required by this offer.',
    },
    inputCurrencyAmount: {
      type: 'number',
      description: 'The amount of currency required by this offer.',
    },
    outputCollection: {
      type: 'string',
      description: 'The address of the ERC1155 or MetaFab game items contract for output items given by this offer.',
    },
    outputCollectionItemIds: {
      type: 'array',
      description: 'An array of item ids from the output collection that are given for this offer.',
      items: {
        type: 'integer',
      },
    },
    outputCollectionItemAmounts: {
      type: 'array',
      description: 'An array of amounts for each item id for the output collection that are given by this offer.',
      items: {
        type: 'integer',
      },
    },
    outputCurrency: {
      type: 'string',
      description: 'The address of the ERC20 or MetaFab game currency for the output currency given by this offer.',
    },
    outputCurrencyAmount: {
      type: 'number',
      description: 'The amount of currency given by this offer.',
    },
    uses: {
      type: 'integer',
      description: 'The number of times this offer has been used.',
    },
    maxUses: {
      type: 'integer',
      description: 'The maximum number of times this offer can be used. A value of `0` means there is no limit on how many times this offer can be used.',
    },
    lastUpdatedAt: {
      type: 'integer',
      description: 'A unix timestamp in seconds that represents the last time this offer was set or updated.',
    },
  },
};
