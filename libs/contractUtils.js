const ethers = require('ethers');
const contracts = require('metafab-contracts');
const chainUtils = rootRequire('./libs/chainUtils');
const gasUtils = rootRequire('./libs/gasUtils');
const evmUtils = rootRequire('./libs/evmUtils');
const walletUtils = rootRequire('./libs/walletUtils');

async function deployContract(walletSigner, provider, type, args) {
  const contractFactory = getContractFactory(type);
  const connectedWalletSigner = walletSigner.connect(provider);
  const { chainId } = await evmUtils.getProviderNetworkOptimized(provider);
  const chain = chainUtils.getChainNameById(chainId);

  try {
    return await walletUtils.getHandledWalletNextNonce(connectedWalletSigner, async nonce => {
      return await contractFactory.connect(connectedWalletSigner).deploy(...args, {
        gasPrice: await gasUtils.getChainGasPrice(chain, provider),
        nonce,
      });
    });
  } catch (error) {
    throw new Error(evmUtils.normalizeRPCErrorMessage(error, chain));
  }
}

function getContractFactory(type) {
  return ethers.ContractFactory.fromSolidity(contracts[type]);
}

function getContractAbi(type) {
  const contract = contracts[type];

  if (!contract || !contract.abi) {
    throw new Error(`Could not find contract or abi for ${type}`);
  }

  return contract.abi;
}

function getContractInstance(address, abi) {
  return new ethers.Contract(address, abi);
}

function getForwarderContractInstance(forwarderAddress) {
  return getContractInstance(forwarderAddress, contracts.ERC2771_Trusted_Forwarder.abi);
}

function getSystemDelegateApproverContractInstance(systemDelegateApproverAddress) {
  return getContractInstance(systemDelegateApproverAddress, contracts.System_Delegate_Approver.abi);
}

async function getConnectedContractInstanceFromModel(modelType, id) {
  const isContractType = modelType === 'contract';

  const options = {
    where: { id },
  };

  if (isContractType) {
    options.select = {
      id: true,
      chain: true,
      address: true,
      abi: true,
      game: {
        select: { rpcs: true },
      },
    };
  } else {
    options.include = {
      contract: true,
      game: {
        select: { rpcs: true },
      },
    };
  }

  const modelInstance = await prisma[modelType].findUnique(options);

  if (!modelInstance) {
    throw new Error(`Invalid id for type ${modelType} provided.`);
  }

  const address = isContractType ? modelInstance.address : modelInstance.contract.address;
  const abi = isContractType ? modelInstance.abi : modelInstance.contract.abi;
  const chain = isContractType ? modelInstance.chain : modelInstance.contract.chain;
  const provider = evmUtils.getProvider(chain, modelInstance.game.rpcs);
  const contractInstance = getContractInstance(address, abi);

  return contractInstance.connect(provider);
}

/*
 * Export
 */

module.exports = {
  deployContract,
  getContractFactory,
  getContractAbi,
  getContractInstance,
  getForwarderContractInstance,
  getSystemDelegateApproverContractInstance,
  getConnectedContractInstanceFromModel,
};
