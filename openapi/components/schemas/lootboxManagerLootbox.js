module.exports = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
      description: 'The id of this lootbox.',
    },
    inputCollection: {
      type: 'string',
      description: 'The address of the ERC1155 or MetaFab game items contract for input items required by this lootbox.',
    },
    inputCollectionItemIds: {
      type: 'array',
      description: 'An array of item ids from the input collection that are required for this lootbox.',
      items: {
        type: 'integer',
      },
    },
    inputCollectionItemAmounts: {
      type: 'array',
      description: 'An array of amounts for each item id for the input collection that are required to open this lootbox.',
      items: {
        type: 'integer',
      },
    },
    outputCollection: {
      type: 'string',
      description: 'The address of the ERC1155 of MetaFab game items contract for possible output items given by this lootbox.',
    },
    outputCollectionItemIds: {
      type: 'array',
      description: 'An array of item ids from the output collection that are possibly given by this lootbox.',
      items: {
        type: 'integer',
      },
    },
    outputCollectionItemAmounts: {
      type: 'array',
      description: 'An array of amounts for each item id for the output collection that are possibly given by this lootbox.',
      items: {
        type: 'integer',
      },
    },
    outputCollectionItemWeights: {
      type: 'array',
      description: 'An array of weights for each item id for the output collection that are possibly given by this lootbox.',
      items: {
        type: 'integer',
      },
    },
    outputTotalItems: {
      type: 'integer',
      description: 'The number of items randomly selected when this lootbox is opened.',
    },
    lastUpdatedAt: {
      type: 'integer',
      description: 'A unix timestamp in seconds that represents the last time this offer was set or updated.',
    },
  },
};
