const chainUtils = rootRequire('/libs/chainUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const { parseUnits, formatUnits } = rootRequire('/libs/formattingUtils');

// this could be refactored way better if we used something like debug_traceCall
// and based usages off of simulated logs/events.

const SCOPES = {
  transfers: [
    'transfer', 'transferFrom', 'transferWithFee', 'transferWithFeeRef',
    'batchTransfer', 'batchTransferWithRefs', 'batchTransferWithFees',
    'batchTransferWithFeesRefs', 'withdraw', 'burn', 'burnWithFee',
    'safeTransferFrom', 'safeBatchTransferFrom', 'burnFromAddress',
    'burnBatchFromAddress', 'bulkSafeBatchTransferFrom',
  ],
  approvals: [
    'approve', 'increaseAllowance', 'decreaseAllowance',
    'setApprovalForAll',
  ],
};

const ERC20_PERMISSION_USAGE_CALCULATORS = {
  transfer: args => args[1], // transfer(address to, uint256 amount)
  transferFrom: args => args[2], // transferFrom(address from, address to, uint256 amount)
  increaseAllowance: args => args[1], // increaseAllowance(address spender, uint256 addedValue)
  approve: args => args[1], // approve(address spender, uint256 amount)
  transferWithFee: args => args[1], // transferWithFee(address recipient, uint256 amount)
  transferWithFeeRef: args => args[1], // transferWithFeeRef(address recipient, uint256 amount, uint256 ref)
  batchTransfer: args => args[1].reduce((sum, v) => sum ? sum.add(v) : v, null), // batchTransfer(address[] calldata recipients, uint256[] calldata amounts)
  batchTransferWithRefs: args => args[1].reduce((sum, v) => sum ? sum.add(v) : v, null), // batchTransferWithRefs(address[] calldata recipients, uint256[] calldata amounts, uint256[] calldata refs)
  batchTransferWithFees: args => args[1].reduce((sum, v) => sum ? sum.add(v) : v, null), // batchTransferWithFees(address[] calldata recipients, uint256[] calldata amounts)
  batchTransferWithFeesRefs: args => args[1].reduce((sum, v) => sum ? sum.add(v) : v, null), // batchTransferWithFeesRefs(address[] calldata recipients, uint256[] calldata amounts, uint256[] calldata refs)
  withdraw: args => args[0], // withdraw(uint256 amount)
  burnWithFee: args => args[0], // burnWithFee(uint256 amount)
};

const ERC1155_PERMISSION_USAGE_CALCULATORS = {
  safeTransferFrom: args => { // safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data)
    return { [args[2]]: args[3] };
  },
  safeBatchTransferFrom: args => { // safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
    return args[2].reduce((usage, id, index) => {
      usage[id.toString()] = usage[id.toString()] ? usage[id.toString()].add(args[3][index]) : args[3][index];

      return usage;
    }, {});
  },
  burnFromAddress: args => { // burnFromAddress(address _fromAddress, uint256 _itemId, uint256 _quantity)
    return { [args[1]]: args[2] };
  },
  burnBatchFromAddress: args => { // burnBatchFromAddress(address _fromAddress, uint256[] calldata _itemIds, uint256[] calldata _quantities)
    return args[1].reduce((usage, id, index) => {
      usage[id.toString()] = usage[id.toString()] ? usage[id.toString()].add(args[2][index]) : args[2][index];

      return usage;
    }, {});
  },
  bulkSafeBatchTransferFrom: args => { // bulkSafeBatchTransferFrom(address _fromAddress, address[] calldata _toAddresses, uint256[] calldata _itemIds, uint256[] calldata _quantitiesPerAddress)
    return args[2].reduce((usage, id, index) => {
      usage[id.toString()] = usage[id.toString()] ? usage[id.toString()].add(args[3][index].mul(args[1].length)) : args[3][index].mul(args[1].length);

      return usage;
    }, {});
  },
};

function getAndCheckPermissionUsage(permissions, contractAddress, abi, func, args) {
  const contractPermissions = permissions[contractAddress];

  if (!permissions['*'] && !contractPermissions) {
    return; // temp, disabled for now
    throw new ResponseError(401, `Wallet has not approved interactions with contract address ${contractAddress}.`);
  }

  if (contractPermissions === '*') {
    return;
  }

  // Function permissioning
  const permittedFunctions = contractPermissions.functions || [];
  const permittedScopes = contractPermissions.scopes || [];
  const funcInPermittedFunctions = permittedFunctions.includes('*') || permittedFunctions.includes(func);
  const funcInPermittedScopes = permittedScopes.some(scope => !!SCOPES[scope] && SCOPES[scope].includes(func));

  if (!funcInPermittedFunctions && !funcInPermittedScopes) {
    throw new ResponseError(401, `Wallet has not approved interactions with function "${func}" for contract address ${contractAddress}.`);
  }

  // ERC20 Permissioning
  if (ERC20_PERMISSION_USAGE_CALCULATORS[func]) {
    let permittedERC20Limit = contractPermissions.erc20Limit;

    if (!permittedERC20Limit) {
      throw new ResponseError(401, `Wallet has not approved an erc20 transfer allowance (erc20Limit) for contract address ${contractAddress}.`);
    }

    if (permittedERC20Limit === '*') {
      return;
    }

    permittedERC20Limit = parseUnits(`${contractPermissions.erc20Limit}`);

    const existingERC20Usage = contractPermissions.erc20Usage
      ? parseUnits(contractPermissions.erc20Usage)
      : parseUnits('0');

    const erc20Usage = ERC20_PERMISSION_USAGE_CALCULATORS[func](args);

    if (existingERC20Usage.add(erc20Usage).gt(permittedERC20Limit)) {
      throw new ResponseError(401, `ERC20 usage of ${formatUnits(erc20Usage)} added to existing usage of ${formatUnits(existingERC20Usage)} would exceed permitted total limit of ${formatUnits(permittedERC20Limit)} for contract address ${contractAddress}`);
    }

    return { erc20Usage };
  }

  // ERC1155 Permissioning
  if (ERC1155_PERMISSION_USAGE_CALCULATORS[func]) {
    const permittedERC1155Limits = contractPermissions.erc1155Limits;

    if (!permittedERC1155Limits) {
      throw new ResponseError(401, `Wallet has not approved erc1155 transfer allowances (erc1155Limits) for contract address ${contractAddress}.`);
    }

    if (permittedERC1155Limits === '*') {
      return;
    }

    const erc1155Usages = ERC1155_PERMISSION_USAGE_CALCULATORS[func](args);

    Object.keys(erc1155Usages).forEach(id => {
      const permittedERC1155Limit = permittedERC1155Limits[id] * 1;

      if (!permittedERC1155Limit) {
        throw new ResponseError(401, `Wallet has not approved an erc1155 transfer allowance (erc1155Limits) of token id ${id} for contract address ${contractAddress}.`);
      }

      if (permittedERC1155Limit === '*') {
        return;
      }

      const existingERC1155Usage = contractPermissions.erc1155Usages && contractPermissions.erc1155Usages[id]
        ? contractPermissions.erc1155Usages[id] * 1
        : 0;

      const erc1155Usage = erc1155Usages[id] * 1;

      if (existingERC1155Usage + erc1155Usage > permittedERC1155Limit) {
        throw new ResponseError(401, `ERC1155 token id ${id} usage of ${erc1155Usage} added to existing usage of ${existingERC1155Usage} would exceed permitted total limit of ${permittedERC1155Limit} for contract address ${contractAddress}`);
      }
    });

    return { erc1155Usages };
  }
}

function validatePermissions(permissionsObject) {
  if (typeof permissionsObject !== 'object') {
    throw new Error('permissions must be an object.');
  }

  const contractAddresses = Object.keys(permissionsObject);

  // validate version
  if (contractAddresses.length && (!permissionsObject.version || permissionsObject.version !== '1.0.0')) {
    throw new Error('Version specific for contract permissions is invalid. Must be one of allowed versions: 1.0.0');
  }

  contractAddresses.forEach(contractAddress => {
    if (contractAddress === 'version') {
      return;
    }

    if (!evmUtils.isAddress(contractAddress)) {
      throw new Error(`${contractAddress} is not a valid contract address.`);
    }

    const contractPermissions = permissionsObject[contractAddress];

    if (contractPermissions === '*') {
      return;
    }

    // validate permissions type
    if (typeof contractPermissions !== 'object') {
      throw new Error('Contract specific permissions must be an object or wildcard (*).');
    }

    // valiate chain for contract address
    if (!contractPermissions.chain || !chainUtils.chainIds[contractPermissions.chain]) {
      throw new Error(`Chain specified for contract address ${contractAddress} must be a valid supported chain (${Object.keys(chainUtils.chainIds).join(', ')}).`);
    }

    // validate contract addresses
    if (contractAddress !== '*' && !evmUtils.isAddress(contractAddress)) {
      throw new Error(`${contractAddress} is not a valid contract address or wildcard (*).`);
    }

    Object.keys(contractPermissions).forEach(key => {
      // validate contract properties
      if (![ 'chain', 'scopes', 'functions', 'erc20Limit', 'erc1155Limits' ].includes(key)) {
        throw new Error(`${key} is not a valid permissioning key.`);
      }

      // validate scopes data type
      if (key === 'scopes' && (!Array.isArray(contractPermissions[key]) || contractPermissions[key].some(v => !SCOPES[v]))) {
        throw new Error('"scopes" permissions property must be an array of valid scopes.');
      }

      // validate functions data types

      if (key === 'functions' && (!Array.isArray(contractPermissions[key]) || contractPermissions[key].some(v => typeof v !== 'string'))) {
        throw new Error('"functions" permissions property must be an array containing only strings.');
      }

      // validate erc20Limit
      if (key === 'erc20Limit' && typeof contractPermissions[key] !== 'number' && contractPermissions[key] !== '*') {
        throw new Error('"erc20Limit" must be a number or wildcard (*)');
      }

      // validate erc1155Limits
      if (key === 'erc1155Limits' && (typeof contractPermissions[key] !== 'object' || Object.values(contractPermissions[key]).some(v => !Number.isInteger(v) && v !== '*'))) {
        throw new Error('"erc1155Limits must be an object with only numbers or wildcard (*) as values."');
      }
    });
  });
}

function updatePermissions(permissions, contractAddress, permissionUsage) {
  const { erc20Usage, erc1155Usages } = permissionUsage;

  if (erc20Usage) {
    permissions[contractAddress].erc20Usage = permissions[contractAddress].erc20Usage
      ? formatUnits(parseUnits(permissions[contractAddress].erc20Usage).add(erc20Usage))
      : formatUnits(erc20Usage);
  }

  if (erc1155Usages) {
    permissions[contractAddress].erc1155Usages = permissions[contractAddress].erc1155Usages
      ? Object.keys(erc1155Usages).reduce((updatedUsages, id) => {
        updatedUsages[id] = updatedUsages[id]
          ? updatedUsages[id] + erc1155Usages[id]
          : erc1155Usages[id];

        return updatedUsages;
      }, permissions[contractAddress].erc1155Usages)
      : erc1155Usages;
  }

  return permissions;
}

/*
 * Export
 */

module.exports = {
  getAndCheckPermissionUsage,
  validatePermissions,
  updatePermissions,
};
