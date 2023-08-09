const ethers = require('ethers');
const { randomBytes } = require('crypto');
const { BigNumber } = require('ethers');
const evmUtils = rootRequire('/libs/evmUtils');
const gasUtils = rootRequire('/libs/gasUtils');

const forwarderAddresses = {
  ETHEREUM: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  GOERLI: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  MATIC: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  MATICMUMBAI: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  ARBITRUM: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  ARBITRUMNOVA: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  ARBITRUMGOERLI: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  AVALANCHE: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  AVALANCHEFUJI: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  BINANCE: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  BINANCETESTNET: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  FANTOM: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  FANTOMTESTNET: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  MOONBEAM: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  MOONBEAMTESTNET: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  THUNDERCORE: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  THUNDERCORETESTNET: '0x67652e376fe4E2530d6b3432475648886DA7BdA9',
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: process.env.LOCAL_FORWARDER_ADDRESS } : {}),
};

const systemDelegateApproverAddresses = {
  ETHEREUM: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  GOERLI: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  MATIC: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  MATICMUMBAI: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  ARBITRUM: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  ARBITRUMNOVA: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  ARBITRUMGOERLI: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  AVALANCHE: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  AVALANCHEFUJI: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  BINANCE: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  BINANCETESTNET: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  FANTOM: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  FANTOMTESTNET: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  MOONBEAM: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  MOONBEAMTESTNET: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  THUNDERCORE: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  THUNDERCORETESTNET: '0xF0FFBa09c49c0ab3042913245E86e89224fF1a5A',
  ...(process.env.NODE_ENV === 'local' ? { LOCAL: process.env.LOCAL_SYSTEM_DELEGATE_APPROVER_ADDRESS } : {}),
};

async function generateForwardRequestArgs(contractInstance, forwarderAddress, wallet, walletSigner, provider, func, args, overrides = {}) {
  const { chainId } = await evmUtils.getProviderNetworkOptimized(provider);
  const gasEstimateSigner = new ethers.VoidSigner(wallet.address);
  const callData = contractInstance.interface.encodeFunctionData(func, args);

  const forwardRequest = overrides.forwardRequest || {
    from: wallet.address,
    to: contractInstance.address,
    value: ethers.BigNumber.from(0),
    gas: (overrides && overrides.gasLimit) ? ethers.BigNumber.from(overrides.gasLimit) : BigNumber.from(await gasUtils.estimateTransactionGas(contractInstance, gasEstimateSigner, provider, func, args)),
    nonce: ethers.BigNumber.from(BigInt(`0x${randomBytes(32).toString('hex')}`)),
    data: callData,
  };

  const domain = overrides.domain || {
    chainId,
    name: 'ERC2771_Trusted_Forwarder',
    verifyingContract: forwarderAddress,
    version: '1.0.0',
  };

  const types = overrides.types || {
    ForwardRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
  };

  const signature = await walletSigner._signTypedData(domain, types, forwardRequest);

  return [ forwardRequest, signature ];
}

function getLatestForwarderAddress(chain) {
  const forwarderAddress = forwarderAddresses[chain];

  if (!forwarderAddress) {
    const knownForwarderAddresses = Object.keys(forwarderAddresses);

    throw new Error(`Chain "${chain}" invalid or unsupported for trusted forwarder. Supported chains are ${knownForwarderAddresses.map(t => `"${t}"`).join(', ')}`);
  }

  return forwarderAddress;
}

function getLatestSystemDelegateApproverAddress(chain) {
  const systemDelegateApproverAddress = systemDelegateApproverAddresses[chain];

  if (!systemDelegateApproverAddress) {
    const knownSystemDelegateApproverAddresses = Object.key(systemDelegateApproverAddresses);

    throw new Error(`Chain "${chain}" invalid or unsupported for delegate approver. Supported chains are ${knownSystemDelegateApproverAddresses.map(t => `"${t}"`).join(', ')}`);
  }

  return systemDelegateApproverAddress;
}

/*
 * Export
 */

module.exports = {
  generateForwardRequestArgs,
  getLatestForwarderAddress,
  getLatestSystemDelegateApproverAddress,
};
