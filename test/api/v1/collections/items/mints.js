const helpers = require('../../../../helpers');

describe('Collection Item Mints', () => {
  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/items/:collectionItemId/mints', () => {
    it('200s with transaction object for minted item', done => {
      const itemId = 2;
      const fields = {
        address: testPlayer.wallet.address,
        quantity: 5,
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/items/${itemId}/mints`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'mintToAddress');

          chai.request(server)
            .get(`/v1/collections/${testCollection.id}/items/${itemId}/balances?address=${fields.address}`)
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              response.body.should.equal(`${fields.quantity}`);
              done();
            });
        });
    });
  });
});
