const formattingUtils = rootRequire('/libs/formattingUtils');
const redisUtils = rootRequire('/libs/redisUtils');

/*
 * Lootboxes
 */

async function getCachedLootbox(lootboxManagerId, lootboxId, lastUpdate) {
  const cacheKey = _generateLootboxManagerLootboxCacheKey(lootboxManagerId, lootboxId, lastUpdate);

  return redisUtils.getObject(cacheKey);
}

async function normalizeAndCacheLootbox(lootboxManagerId, lootbox) {
  const cacheKey = _generateLootboxManagerLootboxCacheKey(lootboxManagerId, lootbox.id, lootbox.lastUpdatedAt);

  lootbox = formattingUtils.normalizeContractResponse(lootbox);

  await redisUtils.setObject(cacheKey, lootbox);

  return lootbox;
}

function _generateLootboxManagerLootboxCacheKey(lootboxManagerId, lootboxId, lastUpdate) {
  return `lootbox-manager-${lootboxManagerId}-${lootboxId}-${lastUpdate}`;
}

/*
 * Shops
 */

async function getCachedOffer(shopId, offerId, lastUpdate) {
  const cacheKey = _generateShopOfferCacheKey(shopId, offerId, lastUpdate);

  return redisUtils.getObject(cacheKey);
}

async function normalizeAndCacheOffer(shopId, offer) {
  const cacheKey = _generateShopOfferCacheKey(shopId, offer.id, offer.lastUpdatedAt);

  offer = formattingUtils.normalizeContractResponse(offer);
  offer.inputCurrencyAmount = formattingUtils.formatUnits(offer.inputCurrencyAmount);
  offer.outputCurrencyAmount = formattingUtils.formatUnits(offer.outputCurrencyAmount);

  await redisUtils.setObject(cacheKey, offer);

  return offer;
}

function _generateShopOfferCacheKey(shopId, offerId, lastUpdate) {
  return `shop-${shopId}-${offerId}-${lastUpdate}`;
}

/*
 * Exports
 */

module.exports = {
  getCachedOffer,
  getCachedLootbox,
  normalizeAndCacheLootbox,
  normalizeAndCacheOffer,
};
