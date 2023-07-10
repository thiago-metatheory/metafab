const helpers = require('../../helpers');

describe('Wallets', () => {
  /*
   * GET
   */

  describe('GET /v1/wallets', () => {
    it('200s with wallet object when provided wallet id', done => {
      chai.request(server)
        .get(`/v1/wallets/${testGame.wallet.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.equal(testGame.wallet.id);
          response.body.address.should.be.a('string');
          response.body.should.not.have.property('ciphertext');
          done();
        });
    });
  });
});
