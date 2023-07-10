const helpers = require('../../../helpers');

describe('Collection Batch Transfers', () => {
  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/batchTransfers', () => {
    it('200s with transaction object for items transferred to addresses', done => {
      const itemIds = [ 50, 60 ];
      const fields = {
        addresses: [ testGame.wallet.address, testPlayerTwo.wallet.address ],
        itemIds,
        quantities: [ 1, 2 ],
      };

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities: [ 2, 4 ],
      }).then(() => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/batchTransfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'bulkSafeBatchTransferFrom');
            done();
          });
      });
    });

    it('400s when provided mismatched length itemIds and quantities', done => {
      const itemIds = [ 50, 60 ];
      const fields = {
        addresses: [ testGame.wallet.address, testPlayerTwo.wallet.address ],
        itemIds,
        quantities: [ 1, 2, 4 ],
      };

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities: [ 2, 4 ],
      }).then(() => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/batchTransfers`)
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
});
