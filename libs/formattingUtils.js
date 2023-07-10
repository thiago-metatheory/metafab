const ethers = require('ethers');

function parseUnits(value, unit = 'ether') {
  return ethers.utils.parseUnits(`${value}`, unit);
}

function formatUnits(value, unit = 'ether') {
  return ethers.utils.formatUnits(value, unit);
}

function formatBigNumber(bigNumber) {
  return bigNumber.toString();
}

function isBigNumber(obj) {
  return ethers.BigNumber.isBigNumber(obj);
}

function normalizeContractResponse(response) {
  const keys = Object.keys(response);
  const result = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let value = response[key];

    if (!isNaN(key)) {
      continue; // throw out numeric keys
    }

    if (Array.isArray(value)) {
      const newValue = [];

      for (let j = 0; j < value.length; j++) {
        if (isBigNumber(value[j])) {
          newValue.push(formatBigNumber(value[j]));
        }
      }

      value = newValue;
    }

    result[key] = isBigNumber(value)
      ? formatBigNumber(value)
      : value;
  }

  return result;
}

/*
 * Export
 */

module.exports = {
  parseUnits,
  formatUnits,
  formatBigNumber,
  normalizeContractResponse,
};
