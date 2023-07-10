/*
 * Route: /
 */

const router = express.Router({
  mergeParams: true,
});

/*
 * GET
 */

router.get('/', async (request, response) => {

  // check the database connection status via math query
  try {
    await prisma.$queryRaw`SELECT 1+1 AS result`;

    return response.success({
      status: 'OK',
    });
  } catch (e) {
    return response.error('DATABASE_CONNECTION_ERROR');
  }

});

/*
 * Export
 */

module.exports = router;
