const helpers = require('../../../helpers');

describe('Shop Offers', () => {
  /*
   * GET
   */

  describe('GET /v1/shops/:shopId/offers', () => {
    it('200s with an array of created shop offers', done => {
      chai.request(server)
        .get(`/v1/shops/${testShop.id}/offers`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          for (let i = 0; i < response.body.length; i++) {
            const offerResponse = response.body[i];

            offerResponse.id.should.equal(`${testShopOffer.id}`);
            offerResponse.outputCollectionItemIds[0].should.equal(`${testShopOffer.outputCollectionItemIds[0]}`);
            offerResponse.outputCollectionItemAmounts[0].should.equal(`${testShopOffer.outputCollectionItemAmounts[0]}`);
            offerResponse.inputCurrency.should.equal(testCurrency.contract.address);
            offerResponse.inputCurrencyAmount.should.equal(`${testShopOffer.inputCurrencyAmount}.0`);
            offerResponse.uses.should.equal('0');
            offerResponse.maxUses.should.equal('0');
            offerResponse.should.have.property('lastUpdatedAt');
          }

          done();
        });
    });

    it('200s with an offer object for provided shopOfferId', done => {
      chai.request(server)
        .get(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.id.should.equal(`${testShopOffer.id}`);
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/shops/:shopId/offers', () => {
    it('200s with transaction object and creates offer', done => {
      const fields = {
        id: 13,
        inputCollectionId: testCollection.id,
        inputCollectionItemIds: [ 1 ],
        inputCollectionItemAmounts: [ 10 ],
        outputCurrencyId: testCurrency.id,
        outputCurrencyAmount: 5,
      };

      chai.request(server)
        .post(`/v1/shops/${testShop.id}/offers`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'setOffer');
          done();
        });
    });
  });

  /*
   * DELETE
   */

  describe('DELETE /v1/shops/:shopId/offers/:shopOfferId', () => {
    it('200s with transaction object and removes offer for provided shopOfferId', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .delete(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'removeOffer');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/shops/${testShop.id}/offers`)
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
