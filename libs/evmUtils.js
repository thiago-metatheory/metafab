const ethers = require('ethers');
const { getParsedEthersError } = require('@enzoferey/ethers-error-parser');
const chainUtils = rootRequire('/libs/chainUtils');
const formattingUtils = rootRequire('/libs/formattingUtils');

const defaultProviders = {
  ETHEREUM: new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC || 'https://rpc.ankr.com/eth'),
  GOERLI: new ethers.providers.JsonRpcProvider(process.env.GOERLI_RPC || 'https://rpc.ankr.com/eth_goerli'),
  MATIC: new ethers.providers.JsonRpcProvider(process.env.MATIC_RPC || 'https://polygon-rpc.com'),
  MATICMUMBAI: new ethers.providers.JsonRpcProvider(process.env.MATICMUMBAI_RPC || 'https://rpc.ankr.com/polygon_mumbai'),
  ARBITRUM: new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC || 'https://rpc.ankr.com/arbitrum'),
  ARBITRUMNOVA: new ethers.providers.JsonRpcProvider(process.env.ARBITRUMNOVA_RPC || 'https://nova.arbitrum.io/rpc'),
  ARBITRUMGOERLI: new ethers.providers.JsonRpcProvider(process.env.ARBITRUMGOERLI_RPC || 'https://goerli-rollup.arbitrum.io/rpc'),
  AVALANCHE: new ethers.providers.JsonRpcProvider(process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc'),
  AVALANCHEFUJI: new ethers.providers.JsonRpcProvider(process.env.AVALANCHEFUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'),
  BINANCE: new ethers.providers.JsonRpcProvider(process.env.BINANCE_RPC || 'https://bscrpc.com'),
  BINANCETESTNET: new ethers.providers.JsonRpcProvider(process.env.BINANCETESTNET_RPC || 'https://data-seed-prebsc-1-s3.binance.org:8545'),
  FANTOM: new ethers.providers.JsonRpcProvider(process.env.FANTOM_RPC || 'https://rpcapi.fantom.network'),
  FANTOMTESTNET: new ethers.providers.JsonRpcProvider(process.env.FANTOMTESTNET_RPC || 'https://rpc.ankr.com/fantom_testnet/'),
  MOONBEAM:new ethers.providers.JsonRpcProvider( process.env.MOONBEAM_RPC || 'https://rpc.api.moonbeam.network'),
  MOONBEAMTESTNET: new ethers.providers.JsonRpcProvider(process.env.MOONBEAMTESTNET_RPC || 'https://rpc.api.moonbase.moonbeam.network'),
  THUNDERCORE: new ethers.providers.JsonRpcProvider(process.env.THUNDERCORE_RPC || 'https://mainnet-rpc.thundercore.com'),
  THUNDERCORETESTNET: new ethers.providers.JsonRpcProvider(process.env.THUNDERCORETESTNET_RPC || 'https://testnet-rpc.thundercore.com'),
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: new ethers.providers.JsonRpcProvider(process.env.HARDHAT_RPC ? process.env.HARDHAT_RPC : 'http://127.0.0.1:8545/') } : {}),
};

async function getChainBalances(address) {
  const balances = {};
  const providerNames = Object.keys(defaultProviders);

  for (let i = 0; i < providerNames.length; i++) {
    const providerName = providerNames[i];

    try {
      const balance = await defaultProviders[providerName].getBalance(address);
      balances[providerName] = formattingUtils.formatUnits(balance);
    } catch (error) {
      balances[providerName] = 'N/A';
    }

  }

  return balances;
}

async function getChainBalance(address, chain, optionalProvider) {
  const balance = optionalProvider
    ? await optionalProvider.getBalance(address)
    : await defaultProviders[chain].getBalance(address);

  return formattingUtils.formatUnits(balance);
}

function getProvider(chain, rpcs = {}) {
  const provider = rpcs[chain]
    ? new ethers.providers.JsonRpcProvider(rpcs[chain])
    : defaultProviders[chain];

  if (!provider) {
    const knownChains = Object.keys(defaultProviders);

    throw new Error(`Chain "${chain}" invalid or unsupported. Supported chains are ${knownChains.map(t => `"${t}"`).join(', ')}`);
  }

  return provider;
}

async function getProviderNetworkOptimized(provider) {
  return provider._network || await provider.getNetwork();
}

function isAbi(abi) {
  new ethers.utils.Interface(abi);

  return true;
}

function isAddress(address) {
  return ethers.utils.isAddress(address);
}

async function isValidRpcUrl(chain, url) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(url);
    const network = await getProviderNetworkOptimized(provider);

    if (network.chainId !== chainUtils.chainIds[chain]) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

function normalizeRPCErrorMessage(error, chain = '') {
  const parsedError = getParsedEthersError(error);

  let { errorCode, context } = parsedError;

  if (errorCode === 'UNKNOWN_ERROR') {
    errorCode = error.cause || errorCode;
    context = error.message || context;
  }

  if (!context) {
    if (errorCode === 'INSUFFICIENT_FUNDS_FOR_GAS') {
      context = `Wallet does not have sufficient native token balance${chain ? ` for ${chain} chain` : ''}.`;
    }

    context = context || 'No additional error details, please see error code.';
  }

  return `${context} (Error code: ${errorCode})`;
}

function hashMessage(message) {
  return ethers.utils.id(message);
}

function verifyMessageAndReturnAddress(message, signature) {
  return ethers.utils.verifyMessage(message, signature);
}

/*
 * Export
 */

module.exports = {
  getProvider,
  getProviderNetworkOptimized,
  getChainBalances,
  getChainBalance,
  isAbi,
  isAddress,
  isValidRpcUrl,
  normalizeRPCErrorMessage,
  hashMessage,
  verifyMessageAndReturnAddress,
  maxUint256: ethers.constants.MaxUint256,
  zeroAddress: ethers.constants.AddressZero,
};
