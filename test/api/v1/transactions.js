const helpers = require('../../helpers');

describe('Transactions', () => {
  /*
   * GET
   */

  describe('GET /v1/transactions', () => {
    it('200s with transaction object when provided transaction id', done => {
      chai.request(server)
        .get(`/v1/transactions/${testCurrency.contract.transactions[0].id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.equal(testCurrency.contract.transactions[0].id);
          response.body.contractId.should.be.a('string');
          response.body.walletId.should.be.a('string');
          response.body.function.should.be.a('string');
          response.body.args.should.be.a('array');
          response.body.hash.should.be.a('string');
          done();
        });
    });
  });
});
