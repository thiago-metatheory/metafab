const path = require('path');
const { PrismaClient } = require('@prisma/client');

// FIXME: this will probably break on Linux
const rootPath = __dirname.replace('\\setup', '');

global.rootRequire = filePath => {
  return require(path.join(rootPath, filePath));
};

global.asyncMiddleware = fn => (request, response, next) => {
  Promise.resolve(fn(request, response, next)).catch(next);
};

global.express = require('express');
global.prisma = new PrismaClient({ log: [ 'warn', 'error' ] });

global.console.eventLog = (event, data) => {
  console.log(JSON.stringify({ event, data }));
};

global.ResponseError = class ResponseError extends Error {
  constructor(responseCode, message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.responseCode = responseCode;
  }
};
