module.exports = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    image: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    name: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    description: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    externalUrl: {
      type: 'string',
      description: 'This field has not had a description added.',
    },
    attributes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trait_type: {
            type: 'string',
            description: 'This field has not had a description added.',
          },
          value: {
            anyOf: [
              { type: 'string' },
              { type: 'number' },
            ],
            description: 'This field has not had a description added.',
          },
        },
      },
      description: 'This field has not had a description added.',
    },
    data: {
      type: 'object',
      description: 'This field has not had a description added.',
    },
  },
};
