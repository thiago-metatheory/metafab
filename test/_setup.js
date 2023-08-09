/*
 * Import Environment Variables
 */

require('dotenv').config();

/*
 * Dependencies
 */

const ethers = require('ethers');
const contracts = require('metafab-contracts');
const { PrismaClient, PrismaClientInitializationError } = require('@prisma/client');


/*
 * Globals
 */

global.chai = require('chai');
global.chaiHttp = require('chai-http');
global.server = process.env.TEST_SUITE_LOCAL_URL || 'http://localhost:8001';
global.prisma = new PrismaClient();


global.testEcosystem = {
  name: 'Test Ecosystem',
  email: 'testecosystem@gmail.com',
  password: 'default',
};

global.testGame = {
  name: 'Test Game',
  email: 'testgame@gmail.com',
  password: 'default',
};

global.testGameTwo = {
  name: 'Test Game Two',
  email: 'testgametwo@gmail.com',
  password: 'default',
};

global.testProfile = {
  username: 'arkdev',
  password: 'default2',
};

global.testPlayer = {
  username: 'braydo25',
  password: 'default',
};

global.testPlayerTwo = {
  username: 'arkdev',
  password: 'default',
};

global.testPlayerWithToken = {
  username: 'wawaweewoo',
  password: 'default',
};

global.testCurrency = {
  name: 'Gold',
  symbol: 'GLD',
  supplyCap: 1000000,
  chain: 'LOCAL',
};

global.testCollection = { chain: 'LOCAL' };
global.testCollectionItem = {
  id: 1,
  name: 'Gold Ore',
  description: 'Some gold ore',
  imageUrl: 'https://picsum.photos/id/237/200/300',
};

global.testShop = { chain: 'LOCAL' };
global.testShopOffer = {
  id: 1,
  inputCurrencyId: null, // set in setup
  inputCurrencyAmount: 10,
  outputCollectionId: null, // set in setup
  outputCollectionItemIds: [ 1 ],
  outputCollectionItemAmounts: [ 1 ],
};

global.testEthersWallet = new ethers.Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // constant private key for hardhat test network, 10k eth balance
  new ethers.providers.JsonRpcProvider(process.env.HARDHAT_RPC || 'http://127.0.0.1:8545'),
);

global.testSystemDelegateApprover = new ethers.Contract(
  process.env.LOCAL_SYSTEM_DELEGATE_APPROVER_ADDRESS,
  contracts['System_Delegate_Approver'].abi,
  testEthersWallet,
);

global.testForwarder = new ethers.Contract(
  process.env.LOCAL_FORWARDER_ADDRESS,
  contracts['ERC2771_Trusted_Forwarder'].abi,
  testEthersWallet,
);

global.testLootboxManager = { chain: 'LOCAL' };
global.testLootboxManagerLootbox = {
  id: 1,
  inputCollectionId: null, // set in setup
  inputCollectionItemIds: [ 55 ],
  inputCollectionItemAmounts: [ 1 ],
  outputCollectionId: null, // set in setup
  outputCollectionItemIds: [ 3, 4, 5, 6, 7 ],
  outputCollectionItemAmounts: [ 1, 1, 1, 1, 1 ],
  outputCollectionItemWeights: [ 2, 4, 6, 8, 10 ],
  outputTotalItems: 1,
};

/*
 * Configure Chai
 */

chai.should();
chai.use(chaiHttp);

/*
 * Setup Test Environment
 */

before(async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await prisma.$connect();
      console.log('Connected to the database.');
      break; // If we reach this line, connection is successful, break the loop
    } catch (error) {
      if (error instanceof PrismaClientInitializationError) {
        console.error('Could not connect to database. Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw error;
      }
    }
  }
});

beforeEach(async () => {

  // clean tables before each test
  const tableNames = Object.keys(prisma._baseDmmf.modelMap).map(name => {
    return `${name[0].toLowerCase()}${name.substring(1)}`;
  });

  await prisma.$queryRaw`SET FOREIGN_KEY_CHECKS=0;`;

  for (const tableName of tableNames) {
    await prisma[tableName].deleteMany();
  }

  await prisma.$queryRaw`SET FOREIGN_KEY_CHECKS=1;`;

  // create test ecosystem
  const createdTestEcosystem = await chai.request(server)
    .post('/v1/ecosystems')
    .send(testEcosystem);
  Object.assign(testEcosystem, createdTestEcosystem.body);

  testProfile.ecosystemId = testEcosystem.id;

  // create test game
  const createdTestGame = await chai.request(server)
    .post('/v1/games')
    .send(testGame);
  Object.assign(testGame, createdTestGame.body);

  // create test game two
  const createdTestGameTwo = await chai.request(server)
    .post('/v1/games')
    .send(testGameTwo);
  Object.assign(testGameTwo, createdTestGameTwo.body);

  // create test ecosystem game
  await chai.request(server)
    .post(`/v1/ecosystems/${testEcosystem.id}/games`)
    .set('X-Authorization', testEcosystem.secretKey)
    .send({ gameId: testGame.id });

  // verify test game
  await chai.request(server)
    .get(`/v1/games/${testGame.id}/verify?code=testCode`);

  // verify test game two
  await chai.request(server)
    .get(`/v1/games/${testGameTwo.id}/verify?code=testCode`);

  // create test profile
  const createdTestProfile = await chai.request(server)
    .post('/v1/profiles')
    .set('X-Ecosystem-Key', testEcosystem.publishedKey)
    .send(testProfile);
  Object.assign(testProfile, createdTestProfile.body);

  // create test player
  const createdTestPlayer = await chai.request(server)
    .post('/v1/players')
    .set('X-Game-Key', testGame.publishedKey)
    .send(testPlayer);

  Object.assign(testPlayer, createdTestPlayer.body);

  // create second test player
  const createdTestPlayerTwo = await chai.request(server)
    .post('/v1/players')
    .set('X-Game-Key', testGame.publishedKey)
    .send(testPlayerTwo);

  Object.assign(testPlayerTwo, createdTestPlayerTwo.body);

  // create test player with token
  const createdTestPlayerWithToken = await chai.request(server)
    .post('/v1/players')
    .set('X-Game-Key', testGame.publishedKey)
    .send(testPlayerWithToken);

  Object.assign(testPlayerWithToken, createdTestPlayerWithToken.body);

  // deposit eth into test game wallet
  await (await testEthersWallet.sendTransaction({
    to: testGame.wallet.address,
    value: ethers.utils.parseEther('1.0'),
  })).wait();

  // deposit eth into test game funding wallet
  await (await testEthersWallet.sendTransaction({
    to: testGame.fundingWallet.address,
    value: ethers.utils.parseEther('10.0'),
  })).wait();

  // deploy system delegate approver
  const SystemDelegateApproverFactory = ethers.ContractFactory.fromSolidity(contracts['System_Delegate_Approver']);
  await SystemDelegateApproverFactory.connect(testEthersWallet).deploy();

  // deploy local gasless transaction forwarder
  const ForwarderContractFactory = ethers.ContractFactory.fromSolidity(contracts['ERC2771_Trusted_Forwarder']);
  await ForwarderContractFactory.connect(testEthersWallet).deploy(testSystemDelegateApprover.address); // only 1st deploy matters since local forwarder address is set in .env, but no easy way to check.

  // deposit eth into test player wallet
  await (await testEthersWallet.sendTransaction({
    to: testPlayerWithToken.wallet.address,
    value: ethers.utils.parseEther('1.0'),
  })).wait();

  // connect external wallet to test player
  const abiCoder = ethers.utils.defaultAbiCoder;
  const externalWallet = ethers.Wallet.createRandom();
  const nonce = Math.floor(Math.random() * 1000000000);
  const hash = ethers.utils.keccak256(abiCoder.encode(
    [ 'bytes32', 'address', 'bool', 'address', 'uint256' ],
    [ ethers.utils.id(testGame.id), testPlayer.wallet.address, true, externalWallet.address, nonce ],
  ));

  const signature = await externalWallet.signMessage(ethers.utils.arrayify(hash));

  const fields = {
    address: externalWallet.address,
    nonce,
    signature: signature,
    chain: 'LOCAL',
    forwarderAddress: testForwarder.address,
  };

  const setExternalWallet = await chai.request(server)
    .post(`/v1/players/${testPlayer.id}/wallets`)
    .set('X-Authorization', testPlayer.accessToken)
    .send(fields);

  testPlayer.wallet = {
    id: setExternalWallet.body.id,
    address: setExternalWallet.body.address,
    custodialId: testPlayer.wallet.id,
    custodialAddress: testPlayer.wallet.address,
  };

  // create test currency
  const createdTestCurrency = await chai.request(server)
    .post('/v1/currencies')
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testCurrency);

  Object.assign(testCurrency, createdTestCurrency.body);

  // create test collection
  const createdTestCollection = await chai.request(server)
    .post('/v1/collections')
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testCollection);

  Object.assign(testCollection, createdTestCollection.body);

  // create test collection item
  await chai.request(server)
    .post(`/v1/collections/${testCollection.id}/items`)
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testCollectionItem);

  // create test shop
  const createdTestShop = await chai.request(server)
    .post('/v1/shops')
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testShop);

  Object.assign(testShop, createdTestShop.body);

  // create test shop offer
  testShopOffer.inputCurrencyId = testCurrency.id;
  testShopOffer.outputCollectionId = testCollection.id;

  await chai.request(server)
    .post(`/v1/shops/${testShop.id}/offers`)
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testShopOffer);

  // create test lootbox manager
  const createdTestLootboxManager = await chai.request(server)
    .post('/v1/lootboxManagers')
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testLootboxManager);

  Object.assign(testLootboxManager, createdTestLootboxManager.body);

  // create test lootbox manager lootbox
  testLootboxManagerLootbox.inputCollectionId = testCollection.id;
  testLootboxManagerLootbox.outputCollectionId = testCollection.id;

  await chai.request(server)
    .post(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes`)
    .set('X-Authorization', testGame.secretKey)
    .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
    .send(testLootboxManagerLootbox);

});
