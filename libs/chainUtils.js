const chainIds = {
  ETHEREUM: 1,
  GOERLI: 5,
  MATIC: 137,
  MATICMUMBAI: 80001,
  ARBITRUM: 42161,
  ARBITRUMNOVA: 42170,
  ARBITRUMGOERLI: 421613,
  AVALANCHE: 43114,
  AVALANCHEFUJI: 43113,
  BINANCE: 56,
  BINANCETESTNET: 97,
  FANTOM: 250,
  FANTOMTESTNET: 4002,
  MOONBEAM: 1284,
  MOONBEAMTESTNET: 1287,
  THUNDERCORE: 108,
  THUNDERCORETESTNET: 18,
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: 31337 } : {}),
};

function getChainId(chain) {
  return chainIds[chain];
}

function getChainNameById(chainId) {
  return Object.keys(chainIds).find(key => chainIds[key] === chainId);
}

function getSupportedChains() {
  return Object.keys(chainIds);
}

function isSupportedChain(chain) {
  return !!chainIds[chain];
}

/*
 * Export
 */

module.exports = {
  chainIds,
  getChainId,
  getChainNameById,
  getSupportedChains,
  isSupportedChain,
};
