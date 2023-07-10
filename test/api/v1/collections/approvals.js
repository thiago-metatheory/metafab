const helpers = require('../../../helpers');

describe('Collection Approvals', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/approvals', () => {
    it('200s with is approved boolean for operatorAddress and address or walletId', done => {
      chai.request(server)
        .get(`/v1/collections/${testCollection.id}/approvals?address=${testPlayer.wallet.address}&operatorAddress=${testGame.wallet.address}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.equal(false);
          done();
        });
    });

    it('400s when not provided address or operatorAddress', done => {
      chai.request(server)
        .get(`/v1/collections/${testCollection.id}/approvals?address=${testPlayer.wallet.address}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/approvals', () => {
    it('200s and sets approval for the provided address', done => {
      const fields = {
        approved: true,
        address: testGame.wallet.address,
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/approvals`)
        .set('X-Authorization', testPlayer.accessToken)
        .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'setApprovalForAll');

          chai.request(server)
            .get(`/v1/collections/${testCollection.id}/approvals?address=${testPlayer.wallet.address}&operatorAddress=${testGame.wallet.address}`)
            .end((error, response) => {
              response.body.should.equal(true);
              done();
            });
        });
    });
  });
});
