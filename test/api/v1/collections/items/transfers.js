const helpers = require('../../../../helpers');

describe('Collection Item Transfers', () => {
  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/items/:collectionItemId/transfers', () => {
    it('200s with transaction object for transferred item', done => {
      const itemId = 44;
      const fields = {
        address: testGame.wallet.address,
        quantity: 3,
      };

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds: [ itemId ],
        quantities: [ 5 ],
      }).then(() => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/${itemId}/transfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'safeTransferFrom');

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
});
