const helpers = require('../../../helpers');

describe('Wallet Balances', () => {
  /*
   * GET
   */

  describe('GET /v1/wallets/:walletId/balances', () => {
    it('200s with the native token balances of the provided walletId for supported chains', done => {
      chai.request(server)
        .get(`/v1/wallets/${testPlayer.wallet.id}/balances`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          Object.keys(response.body).forEach(key => {
            response.body[key].should.be.a('string');
          });
          done();
        });
    });

    it('400s when provided an invalid walletId', done => {
      chai.request(server)
        .get('/v1/wallets/bad-wallet-id/balances')
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
