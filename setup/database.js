const { PrismaClientInitializationError } = require('@prisma/client');
const redisUtils = rootRequire('/libs/redisUtils');

/*
 * Before the entire server starts, we want to ensure a MYSQL connection is established.
 * If this isn't done, then the server will fail on a route being called. The server should
 * fail fast instead.
 */

(async function main() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await prisma.$connect();
      console.log('Connected to the database.');
      break; // If we reach this line, connection is successful, break the loop
    } catch (error) {
      if (error instanceof PrismaClientInitializationError) {
        console.error('Could not connect to database. Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {

        // end the process
        console.error(error);
        process.exit(1);

      }
    }
  }
})();

/**
 * This will check to see if redis is connected.
 */

(async function main() {
  console.log('Checking redis connection...');
  const redisConnected = await redisUtils.isConnected;
  console.log('redisConnected', redisConnected);
  if (redisConnected) {
    console.log('Connected to redis.');
  } else {
    console.error('Could not connect to redis.');
    process.exit(1);
  }
})();
