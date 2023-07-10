const helpers = require('../../../helpers');

describe('Currency Mints', () => {
  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/mints', () => {
    it('200s with transaction object for minted currency to address', done => {
      const fields = {
        address: testPlayer.wallet.address,
        amount: 100,
      };

      chai.request(server)
        .post(`/v1/currencies/${testCurrency.id}/mints`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'mint');

          chai.request(server)
            .get(`/v1/currencies/${testCurrency.id}/balances?address=${fields.address}`)
            .end((error, response) => {
              response.should.have.status(200);
              response.body.should.equal(`${fields.amount}.0`);
              done();
            });
        });
    });

    it('200s with transaction object for minted currency to address of wallet id', done => {
      const fields = {
        walletId: testPlayer.wallet.id,
        amount: 200,
      };

      chai.request(server)
        .post(`/v1/currencies/${testCurrency.id}/mints`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          chai.request(server)
            .get(`/v1/currencies/${testCurrency.id}/balances?walletId=${fields.walletId}`)
            .end((error, response) => {
              response.should.have.status(200);
              response.body.should.equal(`${fields.amount}.0`);
              done();
            });
        });
    });

    it('200s with transaction objects when doing multiple mints in parallel', async () => {
      const mintRequests = [];

      for (let i = 0; i < 3; i++) {
        mintRequests.push(
          chai.request(server)
            .post(`/v1/currencies/${testCurrency.id}/mints`)
            .set('X-Authorization', testGame.secretKey)
            .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
            .send({
              walletId: testPlayer.wallet.id,
              amount: 10,
            }),
        );
      }

      const results = (await Promise.all(mintRequests)).map(r => r.body);

      results.forEach(result => {
        result.id.should.be.a('string');
      });
    });
  });
});
