const helpers = require('../../../../helpers');

describe('Collection Item Burns', () => {
  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/items/:collectionItemId/burns', () => {
    it('200s with transaction object for item burn', done => {
      const itemId = 1;
      const mintQuantity = 3;
      const fields = {
        quantity: 2,
      };

      helpers.batchMintTestCollectionItems({
        address: testGame.wallet.address,
        itemIds: [ itemId ],
        quantities: [ mintQuantity ],
      }).then(() => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/${itemId}/burns`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'burnFromAddress');

            chai.request(server)
              .get(`/v1/collections/${testCollection.id}/items/${itemId}/balances?address=${testGame.wallet.address}`)
              .end((error, response) => {
                helpers.logResponse(response);
                response.should.have.status(200);
                response.body.should.equal(`${mintQuantity - fields.quantity}`);
                done();
              });
          });
      });
    });

    it('200s with transaction object for gasless item burn', done => {
      const itemId = 1;
      const mintQuantity = 3;
      const fields = {
        quantity: 2,
      };

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds: [ itemId ],
        quantities: [ mintQuantity ],
      }).then(() => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/${itemId}/burns`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'burnFromAddress');

            chai.request(server)
              .get(`/v1/collections/${testCollection.id}/items/${itemId}/balances?address=${testPlayer.wallet.address}`)
              .end((error, response) => {
                helpers.logResponse(response);
                response.should.have.status(200);
                response.body.should.equal(`${mintQuantity - fields.quantity}`);
                done();
              });
          });
      });
    });
  });
});
