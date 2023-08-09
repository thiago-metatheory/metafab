const formattingUtils = rootRequire('/libs/formattingUtils');

const chainGasPrices = {
  ETHEREUM: { price: 0, updating: false, updatedAt: null },
  GOERLI: { price: 0, updating: false, updatedAt: null },
  MATIC: { price: 0, updating: false, updatedAt: null },
  MATICMUMBAI: { price: 0, updating: false, updatedAt: null },
  ARBITRUM: { price: 0, updating: false, updatedAt: null },
  ARBITRUMNOVA: { price: 0, updating: false, updatedAt: null },
  ARBITRUMGOERLI: { price: 0, updating: false, updatedAt: null },
  AVALANCHE: { price: 0, updating: false, updatedAt: null },
  AVALANCHEFUJI: { price: 0, updating: false, updatedAt: null },
  BINANCE: { price: 0, updating: false, updatedAt: null },
  BINANCETESTNET: { price: 0, updating: false, updatedAt: null },
  FANTOM: { price: 0, updating: false, updatedAt: null },
  FANTOMTESTNET: { price: 0, updating: false, updatedAt: null },
  MOONBEAM: { price: 0, updating: false, updatedAt: null },
  MOONBEAMTESTNET: { price: 0, updating: false, updatedAt: null },
  THUNDERCORE: { price: 0, updating: false, updatedAt: null },
  THUNDERCORETESTNET: { price: 0, updating: false, updatedAt: null },
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: { price: 0, updatedAt: null } } : {}),
};

const gasSupplementStrategies = {
  ETHEREUM: formattingUtils.parseUnits('10', 'gwei'),
  GOERLI: formattingUtils.parseUnits('10', 'gwei'),
  MATIC: formattingUtils.parseUnits('10', 'gwei'),
  MATICMUMBAI: formattingUtils.parseUnits('10', 'gwei'),
  ARBITRUM: formattingUtils.parseUnits('0.01', 'gwei'),
  ARBITRUMNOVA: formattingUtils.parseUnits('0.01', 'gwei'),
  ARBITRUMGOERLI: formattingUtils.parseUnits('0.01', 'gwei'),
  AVALANCHE: formattingUtils.parseUnits('10', 'gwei'),
  AVALANCHEFUJI: formattingUtils.parseUnits('10', 'gwei'),
  BINANCE: formattingUtils.parseUnits('10', 'gwei'),
  BINANCETESTNET: formattingUtils.parseUnits('10', 'gwei'),
  FANTOM: formattingUtils.parseUnits('10', 'gwei'),
  FANTOMTESTNET: formattingUtils.parseUnits('10', 'gwei'),
  MOONBEAM: formattingUtils.parseUnits('10', 'gwei'),
  MOONBEAMTESTNET: formattingUtils.parseUnits('10', 'gwei'),
  THUNDERCORE: formattingUtils.parseUnits('10', 'gwei'),
  THUNDERCORETESTNET: formattingUtils.parseUnits('10', 'gwei'),
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: formattingUtils.parseUnits('10', 'gwei') } : {}),
};

async function estimateTransactionGas(contractInstance, walletSigner, provider, func, args, overrides = {}) {
  const connectedWalletSigner = walletSigner.connect(provider);

  let gasEstimate = await contractInstance.connect(connectedWalletSigner).estimateGas[func](...args, overrides);
  gasEstimate = gasEstimate.add(gasEstimate.div(10)); // Add +10% to mitigate risk of tx running out of gas.

  if (overrides.value) { // estimateGas won't fail if sender balance < required payment, check manually.
    const senderBalance = await connectedWalletSigner.getBalance();
    const minimumRequiredBalance = overrides.gasPrice
      ? overrides.value.add(gasEstimate.mul(overrides.gasPrice))
      : overrides.value;

    if (senderBalance.lt(minimumRequiredBalance)) {
      throw new Error(
        `Sender balance of ${formattingUtils.formatUnits(senderBalance)} is less than estimated required minimum payment + gas cost of ${formattingUtils.formatUnits(minimumRequiredBalance)}`,
        { cause: 'INSUFFICIENT_BALANCE' },
      );
    }
  }

  return gasEstimate;
}

async function getChainGasPrice(chain, provider) { // could use malicious provider to spoof a low gas price and rek infra, fix this.
  const chainGasPrice = chainGasPrices[chain];

  if ((!chainGasPrice.updatedAt || !chainGasPrice.updating) && chainGasPrice.updatedAt < Date.now() - (5 * 1000)) { // 5s interval to poll latest gas price
    try {
      chainGasPrice.updating = true; // prevents excessive gas estimations with high TPS.

      let gasPrice = await provider.getGasPrice();

      if (gasPrice.lt(formattingUtils.parseUnits('350', 'gwei'))) {
        gasPrice = gasPrice
          .add(gasSupplementStrategies[chain]) // Add base gwei depending on chain
          .add(gasPrice.div(10)); // Add +10% to get tx through fast.
      }

      if (gasPrice.gt(formattingUtils.parseUnits('750', 'gwei'))) {
        gasPrice = formattingUtils.parseUnits('750', 'gwei'); // Cap at 750 gwei
      }

      chainGasPrice.price = gasPrice;
      chainGasPrice.updating = false;
      chainGasPrice.updatedAt = Date.now();
    } catch (error) {
      chainGasPrice.updating = false;
    }
  }

  return chainGasPrice.price;
}

function getTransactionGasCost(gasEstimate, gasPrice, formatted = false) {
  const cost = gasEstimate.mul(gasPrice);

  return formatted ? formattingUtils.formatUnits(cost) : cost;
}

/*
 * Export
 */

module.exports = {
  estimateTransactionGas,
  getChainGasPrice,
  getTransactionGasCost,
};
