const helpers = require('../../../helpers');

describe('Currency Fees', () => {
  /*
   * GET
   */

  describe('GET /v1/currencies/:currencyId/fees', () => {
    it('200s with an object representing currency fees', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/fees`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.have.property('recipientAddress');
          response.body.basisPoints.should.equal(0);
          response.body.fixedAmount.should.equal('0.0');
          response.body.capAmount.should.equal('0.0');
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/fees', () => {
    it('200s with transaction object for newly set fees and sets contract fees', done => {
      const fields = {
        recipientAddress: testPlayer.wallet.address,
        basisPoints: 75,
        fixedAmount: 50,
        capAmount: 1000,
      };

      chai.request(server)
        .post(`/v1/currencies/${testCurrency.id}/fees`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          chai.request(server)
            .get(`/v1/currencies/${testCurrency.id}/fees`)
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              response.body.basisPoints.should.equal(fields.basisPoints);
              response.body.fixedAmount.should.equal(`${fields.fixedAmount}.0`);
              response.body.capAmount.should.equal(`${fields.capAmount}.0`);
              done();
            });
        });
    });
  });
});
