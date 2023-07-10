/*
 * Optional Wallet ID To Address For Matching Routes
 * Possible Route Usage: /{any}
 *
 * Checks for an optional walletId or walletIds property in the request body or query
 * and retrieves the associated address or addresses, setting an address or addresses
 * property in the request body or query respectively.
 *
 */

module.exports = asyncMiddleware(async (request, response, next) => {
  // single wallet id
  const walletIdRequestBody = request.body ? request.body.walletId : undefined;
  const walletIdQuery = request.query ? request.query.walletId : undefined;

  if (walletIdRequestBody || walletIdQuery) {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletIdRequestBody || walletIdQuery },
      select: { address: true },
    });

    if (wallet) {
      if (walletIdRequestBody) {
        request.body.address = wallet.address;
      }

      if (walletIdQuery) {
        request.query.address = wallet.address;
      }
    }
  }

  // multiple wallet ids
  const walletIdsRequestBody = request.body ? request.body.walletIds : undefined;
  const walletIdsQuery = request.query && request.query.walletIds
    ? request.query.walletIds.split(',')
    : undefined;

  if (walletIdsRequestBody || walletIdsQuery) {
    const wallets = await prisma.wallet.findMany({
      where: { id: { in: walletIdsRequestBody || walletIdsQuery } },
      select: { id: true, address: true },
    });

    if (wallets) {
      let addresses = walletIdsRequestBody
        ? Array.isArray(request.body.addresses) ? request.body.addresses : []
        : request.query.addresses ? request.query.addresses.split(',') : [];

      addresses = [
        ...addresses,
        ...((walletIdsRequestBody || walletIdsQuery).map(walletId => { // retain order
          return wallets.find(wallet => wallet.id === walletId).address;
        })),
      ];

      if (walletIdsRequestBody) {
        request.body.addresses = addresses;
      }

      if (walletIdsQuery) {
        request.query.addresses = addresses;
      }
    }
  }

  next();
});
