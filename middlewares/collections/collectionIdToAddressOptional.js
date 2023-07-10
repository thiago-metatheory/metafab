/*
 * Optional Collection ID To Address For Matching Routes
 * Posible Route Usage: /{any}
 *
 * Checks for an optional set of collectionId properties in the request body
 * and retrieves the associated address, sets an equivalently named address property
 * in the request body.
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  const keys = [ 'collectionId', 'inputCollectionId', 'outputCollectionId' ];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const id = request.body[key];

    if (!id) {
      continue;
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        contract: {
          select: { address: true },
        },
      },
    });

    if (collection) {
      request.body[key.replace('Id', 'Address')] = collection.contract.address;
    }
  }

  next();
});
