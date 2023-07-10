const helpers = require('../../../helpers');

describe('Contract Forwarders', () => {
  /*
   * POST
   */

  describe('POST /v1/contracts/:contractId/forwarders', () => {
    it('200s and updates the contracts trusted forwarder', done => {
      const fields = {
        ownerAddress: testPlayer.wallet.address,
      };

      chai.request(server)
        .post(`/v1/contracts/${testCurrency.contractId}/owners`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'transferOwnershipControl');
          done();
        });
    });
  });
});
