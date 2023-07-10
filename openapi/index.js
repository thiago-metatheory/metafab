const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');

const parameters = require('./components/parameters');
const responses = require('./components/responses');
const schemas = require('./components/schemas');
const securitySchemes = require('./components/securitySchemes');

const apiPackage = require('../package.json');

const specification = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MetaFab API',
      version: apiPackage.version,
      description: 'Complete MetaFab API references and guides can be found at: https://trymetafab.com',
      termsOfService: 'https://trymetafab.com',
      contact: {
        name: 'MetaFab Team',
        email: 'metafabproject@gmail.com',
        url: 'https://trymetafab.com',
      },
    },
    servers: [
      {
        description: 'MetaFab API Server',
        url: 'https://api.trymetafab.com',
      },
      {
        description: 'Local Development Server',
        url: 'http://localhost:9000',
      },
    ],
    components: {
      parameters,
      responses,
      schemas,
      securitySchemes,
    },
    tags: [
      {
        name: 'Contracts',
        description: 'Contract related operations',
      },
      {
        name: 'Currencies',
        description: 'Currency related operations',
      },
      {
        name: 'Shops',
        description: 'Shop related operations',
      },
      {
        name: 'Games',
        description: 'Game related operations',
      },
      {
        name: 'Items',
        description: 'Item related operations',
      },
      {
        name: 'Transactions',
        description: 'Transaction related operations',
      },
      {
        name: 'Players',
        description: 'Player related operations',
      },
      {
        name: 'Wallets',
        description: 'Wallet related operations',
      },
    ],
  },
  apis: [ './routes/**/*.js' ],
});

const util = require('util');
console.log(util.inspect(specification, false, null, true));

fs.writeFileSync('./openapi/spec/spec.json', JSON.stringify(specification));
