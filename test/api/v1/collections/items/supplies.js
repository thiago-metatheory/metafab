const helpers = require('../../../../helpers');

describe('Collection Item Supplies', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/items/:collectionItemId/supplies', () => {
    it('200s with supply of collectionItemId', async () => {
      const itemIds = [ 53 ];
      const quantities = [ 55 ];

      await helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities,
      });

      await helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities,
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/items/${itemIds[0]}/supplies`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.equal(`${quantities[0] * 2}`);

            resolve();
          });
      });
    });
  });
});
