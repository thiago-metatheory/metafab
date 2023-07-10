module.exports = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    walletId: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    username: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    updatedAt: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    createdAt: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    custodialWallet: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'This field has not had a description added.',
        },
        address: {
          type: 'string',
          description: 'This field has not had a description added.',
        },
      },
    },
    wallet: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'This field has not had a description added.',
        },
        address: {
          type: 'string',
          description: 'This field has not had a description added.',
        },
      },
    },
  },
};
