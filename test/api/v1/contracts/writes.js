const helpers = require('../../../helpers');

describe('Contract Writes', () => {
  /*
   * POST
   */

  describe('POST /v1/contracts/:contractId/write', () => {
    it('200s with result of contract write', done => {
      const fields = {
        func: 'mint',
        args: [ testPlayer.wallet.address, 123 ],
      };

      chai.request(server)
        .post(`/v1/contracts/${testCurrency.contractId}/writes`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'mint');
          done();
        });
    });

    it('200s with result of gasless contract write', done => {
      const fields = {
        func: 'approve',
        args: [ testGame.wallet.address, 10000 ],
        gaslessOverrides: {
          gasLimit: 100000,
        },
      };

      chai.request(server)
        .post(`/v1/contracts/${testCurrency.contractId}/writes`)
        .set('X-Authorization', testPlayer.accessToken)
        .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'approve');
          done();
        });
    });

    it('400s when provided invalid function name', done => {
      const fields = {
        func: 'badFunc',
      };

      chai.request(server)
        .post(`/v1/contracts/${testCurrency.contractId}/writes`)
        .set('X-Authorization', testPlayer.accessToken)
        .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
