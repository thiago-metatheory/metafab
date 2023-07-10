const bodyParser = require('body-parser');
const cors = require('cors');
const readme = require('readmeio');
const { routeLogger } = rootRequire('/middlewares/routeLogger');

const { README_API_KEY } = process.env;

module.exports = app => {
  app.use(cors({ optionsSuccessStatus: 200 }));
  app.use(bodyParser.json({ limit: '50mb' }));

  // readme logging
  app.use((request, response, next) => {
    if (!README_API_KEY || request.path === '/') {
      return next();
    }

    readme.log(README_API_KEY, request, response, {
      apiKey: request.get('X-Authorization') || request.get('X-Game-Key') || 'no-set-api-key',
      label: request.get('X-Authorization') || request.get('X-Game-Key') || 'no-set-api-key',
    }, {
      development: process.env.NODE_ENV !== 'production',
      denyList: [ 'x-authorization', 'x-password' ],
    });

    return next();
  });
  
  app.use(routeLogger);
};
