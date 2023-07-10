const Sentry = require('@sentry/node');

const _statusRouter = rootRequire('/routes/_status');

const collectionsRouter = rootRequire('/routes/v1/collections');
const collectionsApprovalsRouter = rootRequire('/routes/v1/collections/approvals');
const collectionsBalancesRouter = rootRequire('/routes/v1/collections/balances');
const collectionsBatchMintsRouter = rootRequire('/routes/v1/collections/batchMints');
const collectionsBatchTransfersRouter = rootRequire('/routes/v1/collections/batchTransfers');
const collectionsItemsRouter = rootRequire('/routes/v1/collections/items');
const collectionsItemBalancesRouter = rootRequire('/routes/v1/collections/items/balances');
const collectionsItemBurnsRouter = rootRequire('/routes/v1/collections/items/burns');
const collectionsItemMintsRouter = rootRequire('/routes/v1/collections/items/mints');
const collectionsItemSuppliesRouter = rootRequire('/routes/v1/collections/items/supplies');
const collectionsItemTimelocksRouter = rootRequire('/routes/v1/collections/items/timelocks');
const collectionsItemTransfersRouter = rootRequire('/routes/v1/collections/items/transfers');
const collectionsRolesRouter = rootRequire('/routes/v1/collections/roles');
const collectionsSuppliesRouter = rootRequire('/routes/v1/collections/supplies');

const contractsRouter = rootRequire('/routes/v1/contracts');
const contractsForwardersRouter = rootRequire('/routes/v1/contracts/forwarders');
const contractsOwnersRouter = rootRequire('/routes/v1/contracts/owners');
const contractsReadsRouter = rootRequire('/routes/v1/contracts/reads');
const contractsWritesRouter = rootRequire('/routes/v1/contracts/writes');

const currenciesRouter = rootRequire('/routes/v1/currencies');
const currenciesBalancesRouter = rootRequire('/routes/v1/currencies/balances');
const currenciesBatchTransfersRouter = rootRequire('/routes/v1/currencies/batchTransfers');
const currenciesBurnsRouter = rootRequire('/routes/v1/currencies/burns');
const currenciesFeesRouter = rootRequire('/routes/v1/currencies/fees');
const currenciesMintsRouter = rootRequire('/routes/v1/currencies/mints');
const currenciesRolesRouter = rootRequire('/routes/v1/currencies/roles');
const currenciesTransfersRouter = rootRequire('/routes/v1/currencies/transfers');

const ecosystemsRouter = rootRequire('/routes/v1/ecosystems');
const ecosystemsGamesRouter = rootRequire('/routes/v1/ecosystems/games');

const gamesRouter = rootRequire('/routes/v1/games');
const gamesVerifyRouter = rootRequire('/routes/v1/games/verify');
const gamesReadmeLoginRouter = rootRequire('/routes/v1/games/readmeLogin');

const lootboxManagersRouter = rootRequire('/routes/v1/lootboxManagers');
const lootboxManagersLootboxesRouter = rootRequire('/routes/v1/lootboxManagers/lootboxes');
const lootboxManagersLootboxesOpensRouter = rootRequire('/routes/v1/lootboxManagers/lootboxes/opens');

const playersRouter = rootRequire('/routes/v1/players');
const playersDataRouter = rootRequire('/routes/v1/players/data');
const playersWalletsRouter = rootRequire('/routes/v1/players/wallets');

const profilesRouter = rootRequire('/routes/v1/profiles');
const profilesGamesRouter = rootRequire('/routes/v1/profiles/games');
const profilesGamesPlayersRouter = rootRequire('/routes/v1/profiles/games/players');

const shopsRouter = rootRequire('/routes/v1/shops');
const shopsOffersRouter = rootRequire('/routes/v1/shops/offers');
const shopsOffersUsesRouter = rootRequire('/routes/v1/shops/offers/uses');
const shopsWithdrawalsRouter = rootRequire('/routes/v1/shops/withdrawals');

const transactionsRouter = rootRequire('/routes/v1/transactions');

const walletsRouter = rootRequire('/routes/v1/wallets');
const walletsBalancesRouter = rootRequire('/routes/v1/wallets/balances');
const walletsSignaturesRouter = rootRequire('/routes/v1/wallets/signatures');
const walletsTransactionsRouter = rootRequire('/routes/v1/wallets/transactions');

module.exports = app => {
  /**
   * API Route Definitions
   */

  app.use('/', _statusRouter);

  app.use('/v1/collections', collectionsRouter);
  app.use('/v1/collections/:collectionId/approvals', collectionsApprovalsRouter);
  app.use('/v1/collections/:collectionId/balances', collectionsBalancesRouter);
  app.use('/v1/collections/:collectionId/batchMints', collectionsBatchMintsRouter);
  app.use('/v1/collections/:collectionId/batchTransfers', collectionsBatchTransfersRouter);
  app.use('/v1/collections/:collectionId/items', collectionsItemsRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/balances', collectionsItemBalancesRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/burns', collectionsItemBurnsRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/mints', collectionsItemMintsRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/supplies', collectionsItemSuppliesRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/timelocks', collectionsItemTimelocksRouter);
  app.use('/v1/collections/:collectionId/items/:collectionItemId/transfers', collectionsItemTransfersRouter);
  app.use('/v1/collections/:collectionId/roles', collectionsRolesRouter);
  app.use('/v1/collections/:collectionId/supplies', collectionsSuppliesRouter);

  app.use('/v1/contracts', contractsRouter);
  app.use('/v1/contracts/:contractId/forwarders', contractsForwardersRouter);
  app.use('/v1/contracts/:contractId/owners', contractsOwnersRouter);
  app.use('/v1/contracts/:contractId/reads', contractsReadsRouter);
  app.use('/v1/contracts/:contractId/writes', contractsWritesRouter);

  app.use('/v1/currencies', currenciesRouter);
  app.use('/v1/currencies/:currencyId/balances', currenciesBalancesRouter);
  app.use('/v1/currencies/:currencyId/batchTransfers', currenciesBatchTransfersRouter);
  app.use('/v1/currencies/:currencyId/burns', currenciesBurnsRouter);
  app.use('/v1/currencies/:currencyId/fees', currenciesFeesRouter);
  app.use('/v1/currencies/:currencyId/mints', currenciesMintsRouter);
  app.use('/v1/currencies/:currencyId/roles', currenciesRolesRouter);
  app.use('/v1/currencies/:currencyId/transfers', currenciesTransfersRouter);

  app.use('/v1/ecosystems', ecosystemsRouter);
  app.use('/v1/ecosystems/:ecosystemId/games', ecosystemsGamesRouter);

  app.use('/v1/games', gamesRouter);
  app.use('/v1/games/:gameId/verify', gamesVerifyRouter);
  app.use('/v1/games/:gameId/readmeLogin', gamesReadmeLoginRouter);

  app.use('/v1/lootboxManagers', lootboxManagersRouter);
  app.use('/v1/lootboxManagers/:lootboxManagerId/lootboxes', lootboxManagersLootboxesRouter);
  app.use('/v1/lootboxManagers/:lootboxManagerId/lootboxes/:lootboxManagerLootboxId/opens', lootboxManagersLootboxesOpensRouter);

  app.use('/v1/players', playersRouter);
  app.use('/v1/players/:playerId/data', playersDataRouter);
  app.use('/v1/players/:playerId/wallets', playersWalletsRouter);

  app.use('/v1/profiles', profilesRouter);
  app.use('/v1/profiles/:profileId/games', profilesGamesRouter);
  app.use('/v1/profiles/:profileId/games/:gameId/players', profilesGamesPlayersRouter);

  app.use('/v1/shops', shopsRouter);
  app.use('/v1/shops/:shopId/offers', shopsOffersRouter);
  app.use('/v1/shops/:shopId/offers/:shopOfferId/uses', shopsOffersUsesRouter);
  app.use('/v1/shops/:shopId/withdrawals', shopsWithdrawalsRouter);

  // Deprecated, exchanges was transitioned to shops.
  app.use('/v1/exchanges', shopsRouter);
  app.use('/v1/exchanges/:shopId/offers', shopsOffersRouter);
  app.use('/v1/exchanges/:shopId/offers/:shopOfferId/uses', shopsOffersUsesRouter);
  app.use('/v1/exchanges/:shopId/withdrawals', shopsWithdrawalsRouter);
  // End Deprecated

  app.use('/v1/transactions', transactionsRouter);

  app.use('/v1/wallets', walletsRouter);
  app.use('/v1/wallets/:walletId/balances', walletsBalancesRouter);
  app.use('/v1/wallets/:walletId/signatures', walletsSignaturesRouter);
  app.use('/v1/wallets/:walletId/transactions', walletsTransactionsRouter);

  // Handle Various Errors
  app.use(Sentry.Handlers.errorHandler());
  app.use((error, request, response, next) => {
    if (error.responseCode) {
      return response.respond(error.responseCode, error.message);
    }

    if (error.message) {
      return response.error(error.message);
    }

    if (typeof error === 'object') {
      return response.error(error);
    }

    try {
      return response.error(JSON.parse(error));
    } catch (error) { /* noop */ }

    response.error('An unexpected error occurred.');
  });

  // Handle Nonexistent Routes
  app.use((request, response) => {
    response.respond(404, `${request.method} request for ${request.url} is not valid.`);
  });
};
