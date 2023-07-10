const helpers = require('../../../helpers');

describe('Collection Balances', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/balances', () => {
    it('200s with balance of all existing collection items for provided address', done => {
      const itemIds = [ 53, 12, 64 ];
      const quantities = [ 55, 10, 15 ];

      helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities,
      }).then(() => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('object');

            for (let i = 0; i < itemIds.length; i++) {
              const itemId = itemIds[i];
              response.body[itemId].should.equal(`${quantities[i]}`);
            }

            done();
          });
      });
    });
  });
});
