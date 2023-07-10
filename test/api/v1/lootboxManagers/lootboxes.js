const helpers = require('../../../helpers');

describe('Lootbox Manager Lootboxes', () => {
  /*
   * GET
   */

  describe('GET /v1/lootboxManagers/:lootboxManagerId/lootboxes', () => {
    it('200s with an array of created lootbox manager lootboxes', done => {
      chai.request(server)
        .get(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          for (let i = 0; i < response.body.length; i++) {
            const lootboxResponse = response.body[i];

            lootboxResponse.id.should.equal(`${testLootboxManagerLootbox.id}`);
            lootboxResponse.inputCollectionItemIds[0].should.equal(`${testLootboxManagerLootbox.inputCollectionItemIds[0]}`);
            lootboxResponse.inputCollectionItemAmounts[0].should.equal(`${testLootboxManagerLootbox.inputCollectionItemAmounts[0]}`);
            lootboxResponse.outputCollectionItemIds[0].should.equal(`${testLootboxManagerLootbox.outputCollectionItemIds[0]}`);
            lootboxResponse.outputCollectionItemAmounts[0].should.equal(`${testLootboxManagerLootbox.outputCollectionItemAmounts[0]}`);
            lootboxResponse.outputCollectionItemWeights[0].should.equal(`${testLootboxManagerLootbox.outputCollectionItemWeights[0]}`);
            lootboxResponse.outputTotalItems.should.equal(`${testLootboxManagerLootbox.outputTotalItems}`);
            lootboxResponse.should.have.property('lastUpdatedAt');
          }

          done();
        });
    });

    it('200s with a lootbox object for provided lootboxManagerLootboxId', done => {
      chai.request(server)
        .get(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes/${testLootboxManagerLootbox.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.id.should.equal(`${testLootboxManagerLootbox.id}`);
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/lootboxManagers/:lootboxManagerId/lootboxes', () => {
    it('200s with transaction object and creates lootbox', done => {
      const fields = {
        id: 13,
        inputCollectionId: testCollection.id,
        inputCollectionItemIds: [ 1 ],
        inputCollectionItemAmounts: [ 10 ],
        outputCollectionId: testCollection.id,
        outputCollectionItemIds: [ 11, 12 ],
        outputCollectionItemAmounts: [ 1, 1 ],
        outputCollectionItemWeights: [ 1, 1 ],
        outputTotalItems: 1,
      };

      chai.request(server)
        .post(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'setLootbox');
          done();
        });
    });
  });

  /*
   * DELETE
   */

  describe('DELETE /v1/lootboxManagers/:lootboxManagerId/lootboxes/:lootboxManagerLootboxId', () => {
    it('200s with transaction object and removes lootbox for provided lootboxManagerLootboxId', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .delete(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes/${testLootboxManagerLootbox.id}`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'removeLootbox');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.length.should.equal(0);
            resolve();
          });
      });
    });
  });
});
