const contractUtils = rootRequire('./libs/contractUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const gasUtils = rootRequire('/libs/gasUtils');
const forwarderUtils = rootRequire('/libs/forwarderUtils');
const walletUtils = rootRequire('/libs/walletUtils');

async function executeDelegateApprovalForSystemTransaction({ systemId, delegateAddress, approved, signerAddress, nonce, signature, fundingWalletCiphertext, chain, rpcs }) {
  const systemDelegateApproverAddress = forwarderUtils.getLatestSystemDelegateApproverAddress(chain);
  const systemDelegateApproverContractInstance = contractUtils.getSystemDelegateApproverContractInstance(systemDelegateApproverAddress);
  const provider = evmUtils.getProvider(chain, rpcs);

  const existingApproval = await systemDelegateApproverContractInstance.connect(provider).isDelegateApprovedForSystem(
    signerAddress,
    systemId,
    delegateAddress,
  );

  if (existingApproval === approved) {
    return false;
  }

  // fix for hardware & ledger wallets generating non-standard signatures.
  signature = signature.slice(-2) === '00' ? signature.slice(0, -2) + '1b' : signature;
  signature = signature.slice(-2) === '01' ? signature.slice(0, -2) + '1c' : signature;

  return _executeTransactionWithForwardingWalletNonceRetry({
    contractInstance: systemDelegateApproverContractInstance,
    fundingWalletCiphertext,
    provider,
    chain,
    func: 'setDelegateApprovalForSystemBySignature',
    args: [ systemId, delegateAddress, approved, signerAddress, nonce, signature ],
  });
}

async function executeTransaction({ contractId, wallet, walletSigner, allowGasless, func, args, value, gaslessOverrides }) {
  // get contract
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      chain: true,
      address: true,
      forwarderAddress: true,
      abi: true,
      game: {
        select: {
          rpcs: true,
          ...(allowGasless ? { fundingWallet: true } : {}),
        },
      },
    },
  });

  const contractInstance = contractUtils.getContractInstance(contract.address, contract.abi);

  if (!contractInstance[func]) {
    throw new Error(`Function ${func} is not valid for contract id ${contract.id}`);
  }

  args = args || []; // args must be an array, otherwise ethers throws.

  //let permissionUsage;
  //if (wallet.permissions) { // need to pre-empt limit updates prior to tx completion to prevent tx flooding vulnerability.
  //  permissionUsage = profileUtils.getAndCheckPermissionUsage(wallet.permissions, contract.address, contract.abi, func, args);
  //}

  // get provider & current gas price
  const { chain } = contract;
  const provider = evmUtils.getProvider(chain, contract.game.rpcs);

  // see if wallet can put tx through itself before using gasless strategy
  let gasPrice;
  let gasEstimate;

  if (allowGasless) {
    const walletSignerBalance = await evmUtils.getChainBalance(await walletSigner.getAddress(), chain, provider);

    if (walletSignerBalance > 0) {
      gasPrice = await gasUtils.getChainGasPrice(chain, provider);
      gasEstimate = await gasUtils.estimateTransactionGas(contractInstance, walletSigner, provider, func, args, { gasPrice, value });
      allowGasless = walletSignerBalance < gasUtils.getTransactionGasCost(gasEstimate, gasPrice, true);
    }
  }

  const tx = allowGasless && contract.forwarderAddress
    ? await _executeGaslessTransactionWithNonceRetry(
      contractInstance,
      contract.forwarderAddress,
      wallet,
      walletSigner,
      contract.game.fundingWallet.ciphertext,
      provider,
      chain,
      func,
      args,
      gaslessOverrides,
    )
    : await _executeStandardTransactionWithNonceRetry(
      contractInstance,
      walletSigner,
      provider,
      chain,
      func,
      args,
      value,
      gasPrice,
      gasEstimate,
    );

  // create tx db entry as transaction
  const transaction = await prisma.transaction.create({
    data: {
      function: func,
      args,
      hash: tx.hash,
      contract: { connect: { id: contract.id } },
      wallet: { connect: { id: wallet.id } },
    },
  });

  /*if (wallet.permissions) {
    await prisma.player.update({
      where: { id: wallet.playerId },
      data: { profilePermissions: profileUtils.updatePermissions(wallet.permissions, contract.address, permissionUsage) },
    });
  }*/

  return transaction;
}

async function executeTransfer({ chain, walletSigner, toAddress, value }) {
  const provider = evmUtils.getProvider(chain, {});
  const connectedWalletSigner = walletSigner.connect(provider);
  let gasPrice = await gasUtils.getChainGasPrice(chain, provider);

  return _nonceRetryTransaction(async retryCount => {
    gasPrice = retryCount > 0 && retryCount % 2 === 0 // recalculate gas every other attempt.
      ? await gasUtils.getChainGasPrice(chain, provider)
      : gasPrice;

    return await walletUtils.getHandledWalletNextNonce(connectedWalletSigner, async nonce => {
      const tx = await connectedWalletSigner.sendTransaction({
        to: toAddress,
        gasPrice,
        value,
        nonce,
      });

      await tx.wait();

      return tx;
    }, retryCount > 0);
  }, chain);
}

async function _executeStandardTransactionWithNonceRetry(contractInstance, walletSigner, provider, chain, func, args, value, gasPrice, gasLimit) {
  const connectedWalletSigner = walletSigner.connect(provider);

  gasPrice = gasPrice || await gasUtils.getChainGasPrice(chain, provider);

  if (!gasLimit) {
    gasLimit = await gasUtils.estimateTransactionGas(contractInstance, walletSigner, provider, func, args, { gasPrice, value });
  }

  return _nonceRetryTransaction(async retryCount => {
    gasPrice = retryCount > 0 && retryCount % 2 === 0 // recalculate gas every other attempt.
      ? await gasUtils.getChainGasPrice(chain, provider)
      : gasPrice;

    return await walletUtils.getHandledWalletNextNonce(connectedWalletSigner, async nonce => {
      const tx = await contractInstance.connect(connectedWalletSigner)[func](...args, {
        gasPrice,
        value,
        nonce,
        gasLimit,
      });

      await tx.wait();

      return tx;
    }, retryCount > 0);
  }, chain);
}

async function _executeGaslessTransactionWithNonceRetry(contractInstance, forwarderAddress, wallet, walletSigner, fundingWalletCiphertext, provider, chain, func, args, overrides = {}) {
  const forwarderContractInstance = contractUtils.getForwarderContractInstance(forwarderAddress);
  const forwardRequestArgs = await forwarderUtils.generateForwardRequestArgs(
    contractInstance,
    forwarderAddress,
    wallet,
    walletSigner,
    provider,
    func,
    args,
    overrides,
  );

  return _executeTransactionWithForwardingWalletNonceRetry({
    contractInstance: forwarderContractInstance,
    fundingWalletCiphertext,
    provider,
    chain,
    func: 'execute',
    args: forwardRequestArgs,
    gasLimit: overrides.gasLimit,
  });
}

async function _executeTransactionWithForwardingWalletNonceRetry({ contractInstance, fundingWalletCiphertext, provider, chain, func, args, gasLimit }) {
  const decryptedFundingWallet = cryptoUtils.aesDecryptWallet(
    await cryptoUtils.kmsSymmetricDecrypt(fundingWalletCiphertext),
    process.env.FUNDING_WALLETS_PASSWORD,
  );

  const forwardingWalletSigner = await walletUtils.getWalletSigner(decryptedFundingWallet.privateKey);
  const connectedForwardingWalletSigner = forwardingWalletSigner.connect(provider);

  let gasPrice = await gasUtils.getChainGasPrice(chain, provider);

  if (!gasLimit) {
    gasLimit = await gasUtils.estimateTransactionGas(contractInstance, forwardingWalletSigner, provider, func, args, { gasPrice });
  }

  return _nonceRetryTransaction(async retryCount => {
    gasPrice = retryCount > 0 && retryCount % 2 === 0 // recalculate gas every other attempt.
      ? await gasUtils.getChainGasPrice(chain, provider)
      : gasPrice;

    return await walletUtils.getHandledWalletNextNonce(connectedForwardingWalletSigner, async nonce => {
      const tx = await contractInstance.connect(connectedForwardingWalletSigner)[func](...args, {
        gasLimit,
        gasPrice,
        nonce,
      });

      await tx.wait();

      return tx;
    }, retryCount > 0);
  }, chain);
}

async function _nonceRetryTransaction(wrappedAsyncFunc, chain, retries = 20) {
  let trackedError;

  for (let i = 0; i < retries; i++) {
    try {
      return await wrappedAsyncFunc(i);
    } catch (error) {
      trackedError = error;

      if (error.code && [ 'NONCE_EXPIRED', 'REPLACEMENT_UNDERPRICED', 'TRANSACTION_REPLACED', 'UNPREDICTABLE_GAS_LIMIT', 'SERVER_ERROR', 'CALL_EXCEPTION' ].includes(error.code)) {
        // Any nonce error likely due to race condition on redis transactionCount for nonce.
        await new Promise(resolve => setTimeout(resolve, i * 50));
      } else {
        throw new Error(evmUtils.normalizeRPCErrorMessage(error, chain));
      }
    }
  }

  throw new Error(`Transaction reached maximum amount of retries: ${evmUtils.normalizeRPCErrorMessage(trackedError, chain)}`);
}

/*
 * Export
 */

module.exports = {
  executeDelegateApprovalForSystemTransaction,
  executeTransaction,
  executeTransfer,
};
