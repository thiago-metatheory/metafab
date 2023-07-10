const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const schemas = require('./schemas/index');

const { modelMap } = prisma._baseDmmf;
const modelNames = Object.keys(modelMap);

const baseModelSchemas = {};

modelNames.forEach(modelName => {
  const schemaModelName = `${modelName}Model`;

  baseModelSchemas[schemaModelName] = {
    type: 'object',
    properties: {},
  };

  modelMap[modelName].fields.forEach(field => {
    if ([ 'password', 'ciphertext', 'backupCiphertexts', 'verificationCode' ].includes(field.name)) {
      return;
    }

    if (modelName === 'Wallet' && [ 'updatedAt', 'createdAt' ].includes(field.name)) {
      return;
    }

    if (field.relationName) { // don't include relations
      return;
    }

    let type = '';
    type = field.type === 'String' ? 'string' : type;
    type = field.type === 'DateTime' ? 'string' : type;
    type = field.type === 'BigInt' ? 'integer' : type;
    type = field.type === 'Json' ? 'object' : type;
    type = field.type === 'Chain' ? 'string' : type;
    type = field.type === 'Boolean' ? 'boolean' : type;

    baseModelSchemas[schemaModelName].properties[field.name] = {
      type,
      description: 'This field has not had a description added.',
    };
  });
});

// generate descriptions specific to fields
module.exports = {
  ...baseModelSchemas,
  ...schemas,
  AnyValue: {
    description: 'Can be anything. String, number, object, array, boolean, etc.',
  },
};
