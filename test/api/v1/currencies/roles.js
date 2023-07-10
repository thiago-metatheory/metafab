const helpers = require('../../../helpers');

describe('Currency Roles', () => {
  /*
   * GET
   */

  describe('GET /v1/currencies/:currencyId/roles', () => {
    it('200s with has role boolean for role and address or walletId', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/roles?address=${testPlayer.wallet.address}&role=minter`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.equal(false);
          done();
        });
    });

    it('400s when not provided address or role', done => {
      chai.request(server)
        .get(`/v1/currencies/${testCurrency.id}/roles?address=${testPlayer.wallet.address}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/roles', () => {
    it('200s with transaction object and grants role to the provided address', done => {
      const fields = {
        role: 'minter',
        address: testPlayer.wallet.address,
      };

      chai.request(server)
        .post(`/v1/currencies/${testCurrency.id}/roles`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'grantRole');

          chai.request(server)
            .get(`/v1/currencies/${testCurrency.id}/roles?address=${testPlayer.wallet.address}&role=${fields.role}`)
            .end((error, response) => {
              response.body.should.equal(true);
              done();
            });
        });
    });
  });

  /*
   * DELETE
   */

  describe('DELETE /v1/currencies/:currencyId/roles', () => {
    it('200s with transaction object and removes role for the provided address', async () => {
      const fields = {
        role: 'minter',
        address: testPlayer.wallet.address,
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/roles?address=${testPlayer.wallet.address}&role=${fields.role}`)
          .end((error, response) => {
            response.body.should.equal(true);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .delete(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'revokeRole');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/roles?address=${testPlayer.wallet.address}&role=${fields.role}`)
          .end((error, response) => {
            response.body.should.equal(false);
            resolve();
          });
      });
    });
  });
});
