const helpers = require('../../../../helpers');

describe('Collection Item Balance', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/items/:collectionItemId/balances', () => {
    it('200s with balance of collectionItemId for provided address', done => {
      const itemIds = [ 53 ];
      const quantities = [ 55 ];

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities,
      }).then(() => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/items/${itemIds[0]}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.equal(`${quantities[0]}`);

            done();
          });
      });
    });
  });
});
