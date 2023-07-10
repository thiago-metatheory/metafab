const ethers = require('ethers');

const ACCESS_CONTROL_ROLES = {
  minter: ethers.utils.id('METAFAB_MINTER_ROLE'),
  owner: ethers.utils.id('METAFAB_OWNER_ROLE'),
};

/*
 * Export
 */

module.exports = {
  ACCESS_CONTROL_ROLES,
};
