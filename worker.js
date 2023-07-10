const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const app = express();

/**
 * Setup Sentry Debugging
 */

if (process.env.SENTRY_IO_DSN) {
  Sentry.init({
    environment: process.env.NODE_ENV || 'local',
    maxValueLength: 1000,
    dsn: process.env.SENTRY_IO_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: 1.0,   // Set tracesSampleRate to 1.0 to capture 100%
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

/**
 * Setup & Start Service
 */

require('./setup/globals');
require('./setup/database');
rootRequire('/setup/aws');
rootRequire('/setup/prototypes');
rootRequire('/setup/middlewares')(app);
rootRequire('/setup/routes')(app);

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.eventLog('worker-start', { port: PORT });
});

module.exports = app;
