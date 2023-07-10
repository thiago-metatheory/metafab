const helpers = require('../../../helpers');

describe('Currency Burns', () => {
  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/burns', () => {
    it('200s with transaction object for burned currency', done => {
      const fields = { amount: 50 };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/burns`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'burn');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, 50);
            done();
          });
      });
    });

    it('200s with transaction object for gasless currency burn', done => {
      const fields = { amount: 70 };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/burns`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'burnWithFee');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, 30);
            done();
          });
      });
    });

    it('400s when no amount is provided', done => {
      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/burns`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            done();
          });
      });
    });
  });
});
