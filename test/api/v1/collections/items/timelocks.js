const helpers = require('../../../../helpers');

describe('Collection Item Timelocks', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/items/:collectionItemId/timelocks', () => {
    it('200s and returns 0 for porvided collectionItemId that does not have a timelock', done => {
      chai.request(server)
        .get(`/v1/collections/${testCollection.id}/items/14/timelocks`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.equal('0');
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/items/:collectionItemId/timelocks', () => {
    it('200s with transaction object for successfully created item timelock', done => {
      const itemId = 10;
      const fields = {
        timelock: Math.floor(Date.now() / 1000),
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/items/${itemId}/timelocks`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'setItemTransferTimelock');

          chai.request(server)
            .get(`/v1/collections/${testCollection.id}/items/${itemId}/timelocks`)
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              response.body.should.equal(`${fields.timelock}`);
              done();
            });
        });
    });
  });
});
