const helpers = require('../../../helpers');

describe('Collection Supplies', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/supplies', () => {
    it('200s with the supplies of all existing collection items', async () => {
      const itemIds = [ 22, 37, 6312 ];
      const quantities = [ 42, 667, 12 ];

      await helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities,
      });

      await helpers.batchMintTestCollectionItems({
        address: testPlayerTwo.wallet.address,
        itemIds,
        quantities,
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/supplies`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('object');

            for (let i = 0; i < itemIds.length; i++) {
              const itemId = itemIds[i];
              response.body[itemId].should.equal(`${quantities[i] * 2}`);
            }

            resolve();
          });
      });

    });
  });
});
