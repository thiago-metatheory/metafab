const helpers = require('../../../helpers');

describe('Wallet Transactions', () => {
  /*
   * GET
   */

  describe('GET /v1/wallets/:walletId/transactions', () => {
    it('200s with an array of transactions for the provided walletId', done => {
      chai.request(server)
        .get(`/v1/wallets/${testGame.wallet.id}/transactions`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('array');
          response.body.forEach(transaction => {
            transaction.id.should.be.a('string');
            transaction.contractId.should.be.a('string');
            transaction.walletId.should.be.a('string');
            transaction.function.should.be.a('string');
            transaction.args.should.be.an('array');
            transaction.hash.should.be.a('string');
          });
          done();
        });
    });
  });
});
