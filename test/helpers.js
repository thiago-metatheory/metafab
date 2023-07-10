const util = require('util');

/*
 * Helpers
 */

function logResponse(response) {
  const logHeader = `--- ${response.request.method.toUpperCase()} ${response.request.url} | API Response (${response.status}) ---`;
  const logFooter = `VVV${'-'.repeat(logHeader.length - 3)}`;

  console.log(`\n\n\t${logHeader}`);
  for (let i = 0; i < 4; i++) { console.group(); }
  console.log(util.inspect(response.body, true, 10));
  for (let i = 0; i < 4; i++) { console.groupEnd(); }
  console.log(`\t${logFooter}`);
}

async function mintTestCurrency(args) {
  return new Promise(resolve => {
    chai.request(server)
      .post(`/v1/currencies/${testCurrency.id}/mints`)
      .set('X-Authorization', testGame.secretKey)
      .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
      .send(args)
      .end((error, response) => {
        logResponse(response);
        response.should.have.status(200);
        resolve();
      });
  });
}

async function batchMintTestCollectionItems(args) {
  return new Promise(resolve => {
    chai.request(server)
      .post(`/v1/collections/${testCollection.id}/batchMints`)
      .set('X-Authorization', testGame.secretKey)
      .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
      .send(args)
      .end((error, response) => {
        logResponse(response);
        response.should.have.status(200);
        resolve();
      });
  });
}

async function testAddressCurrencyBalance(address, expectedAmount) {
  return new Promise(resolve => {
    chai.request(server)
      .get(`/v1/currencies/${testCurrency.id}/balances?address=${address}`)
      .end((error, response) => {
        response.should.have.status(200);
        (`${response.body * 1}`).should.equal(`${expectedAmount}`);
        resolve();
      });
  });
}

function testTransactionResponse(response, expectedFunction) {
  response.should.have.status(200);
  response.body.should.be.an('object');
  response.body.id.should.be.a('string');
  response.body.contractId.should.be.a('string');
  response.body.function.should.equal(expectedFunction);
  response.body.args.should.be.an('array');
  response.body.hash.should.be.a('string');
}

/*
 * Export
 */

module.exports = {
  batchMintTestCollectionItems,
  mintTestCurrency,
  testAddressCurrencyBalance,
  testTransactionResponse,
  logResponse,
};
