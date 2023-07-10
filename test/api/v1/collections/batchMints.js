const helpers = require('../../../helpers');

describe('Collection Batch Mints', () => {
  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/batchMints', () => {
    it('200s with transaction object for items minted to address', done => {
      const fields = {
        itemIds: [ 21, 53 ],
        quantities: [ 5, 5 ],
        walletId: testPlayer.wallet.id,
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/batchMints`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'mintBatchToAddress');
          done();
        });
    });

    it('400s when provided mismatched length itemIds and quantities', done => {
      const fields = {
        itemIds: [ 21, 53 ],
        quantities: [ 5, 5, 5 ],
        walletId: testPlayer.wallet.id,
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/batchMints`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
