const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });

const isConnected = new Promise(resolve => client.connect().then(() => resolve(true)).catch(err => {console.error('redis connection error', err); resolve(false);}));

// Locking
async function autoLock(key, wrappedAsyncFunc, ttlSeconds = 2, acquireRetries = 10, acquireRetryInterval = 100) {
  const lockKey = `lock:${key}`;
  let lock;

  // attempt to acquire a lock
  for (let i = 0; i < acquireRetries; i++) {
    lock = await _setValue(lockKey, 1, {
      EX: ttlSeconds,
      NX: true,
    });

    if (lock === 'OK') {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, acquireRetryInterval));
  }

  try {
    await wrappedAsyncFunc();
  } finally {
    await _deleteValue(lockKey);
  }
}

// Address status
async function getAddressStatus(address, chain) {
  return _getValue(`${address}-${chain}:status`);
}

async function setAddressStatus(address, chain, status) {
  return _setValue(`${address}-${chain}:status`, status, {
    EX: 2 * 60, // 2 minute expire to prevent an edge case lockup
  });
}

// Address nonce usage
async function isAddressNonceUsed(address, chain, nonce) {
  return !!(await _getValue(`${address}-${chain}:nonce-${nonce}`));
}

async function setAddressNonceUsed(address, chain, nonce) {
  return _setValue(`${address}-${chain}:nonce-${nonce}`, 1, {
    EX: 2 * 60, // 2 min expiration, chain tx count will be above upon expire.
  });
}

async function setAddressNonceUnused(address, chain, nonce) {
  return _deleteValue(`${address}-${chain}:nonce-${nonce}`);
}

// Address current nonce
async function getAddressNonce(address, chain) {
  return _getValue(`${address}-${chain}:nonce`);
}

async function setAddressNonce(address, chain, nonce) {
  return _setValue(`${address}-${chain}:nonce`, nonce, {
    EX: 2 * 60, // 2 min expiration, prevents permanently stuck nonces.
  });
}

async function incrementAddressNonce(address, chain) {
  return _incrementValue(`${address}-${chain}:nonce`);
}

// Address tx rate
async function getAddressTransactionRate(address, chain) {
  return (await _getValue(`${address}-${chain}:tx-rate`)) || 0;
}

async function incrementAddressTransactionRate(address, chain) {
  const key = `${address}-${chain}:tx-rate`;

  await client.multi()
    .incr(key)
    .expire(key, 15) // 15s expiration
    .exec();
}

async function decrementAddressTransactionRate(address, chain) {
  await client.decr(`${address}-${chain}:tx-rate`);
}

// Generics
async function getObject(uri) {
  const stringifiedData = await _getValue(uri);

  if (!stringifiedData) {
    return false;
  }

  return JSON.parse(stringifiedData);
}

async function setObject(key, obj) {
  return _setValue(key, JSON.stringify(obj));
}

// Helpers
async function _getValue(key) {
  await isConnected;

  return client.get(key);
}

async function _setValue(key, value, options) {
  return await client.set(key, value, options);
}

async function _deleteValue(key) {
  await client.del(key);
}

async function _incrementValue(key) {
  await client.incr(key);
}

/*
 * Exports
 */

module.exports = {
  autoLock,
  getAddressStatus,
  isAddressNonceUsed,
  setAddressNonceUsed,
  setAddressNonceUnused,
  getAddressNonce,
  setAddressNonce,
  incrementAddressNonce,
  setAddressStatus,
  getAddressTransactionRate,
  incrementAddressTransactionRate,
  decrementAddressTransactionRate,
  getObject,
  setObject,
  isConnected,
};
