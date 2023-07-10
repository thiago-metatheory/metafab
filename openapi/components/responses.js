module.exports = {
  400: {
    description: 'An API level error occurred. This is often due to problematic data being provided by you.',
    content: {
      'application/json': {
        schema: { type: 'string' },
      },
    },
  },
  401: {
    description: 'An authorization error occured. This is often due to incorrect tokens or keys being provided, or accessing a resource that the provided tokens or keys do not have access to.',
    content: {
      'application/json': {
        schema: { type: 'string' },
      },
    },
  },
};
