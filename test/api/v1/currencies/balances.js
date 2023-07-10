const helpers = require('../../../helpers');

describe('Currency Balances', () => {
  /*
   * GET
   */

  describe('GET /v1/currencies/:currencyId/balances', () => {
    it('200s with the balance for provided address', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayer.wallet.address}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.a('string');
          done();
        });
    });

    it('200s with the balance for provided walletId', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/balances?walletId=${testPlayer.wallet.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.a('string');
          done();
        });
    });

    it('400s when provided invalid address', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/balances?address=badaddress`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
