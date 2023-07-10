const helpers = require('../../../helpers');

describe('Profile Games', () => {
  /*
   * GET
   */

  describe('GET /v1/profiles/:profileId/games', () => {
    it('200s with games for provided profileId', async () => {
      const fields = {
        username: 'newPlayer123123',
        permissions: {
          version: '1.0.0',
          [testCurrency.contract.address]: {
            chain: 'LOCAL',
            functions: [ 'transfer' ],
            erc20Limit: 400,
          },
        },
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/profiles/${testProfile.id}/games`)
          .set('X-Authorization', testProfile.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('array');
            response.body.length.should.equal(1);
            resolve();
          });
      });
    });

    it('200s with game for provided profileId and gameId', async () => {
      const fields = {
        username: 'yoyomcgee',
        permissions: {
          version: '1.0.0',
          [testCurrency.contract.address]: {
            chain: 'LOCAL',
            functions: [ 'transfer' ],
            erc20Limit: 400,
          },
        },
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/profiles/${testProfile.id}/games/${testGame.id}`)
          .set('X-Authorization', testProfile.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('object');
            response.body.id.should.equal(testGame.id);
            response.body.players.length.should.equal(1);
            resolve();
          });
      });
    });

    it('401s when not provided profile authorization', done => {
      chai.request(server)
        .get(`/v1/profiles/${testProfile.id}/games/${testGame.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });

    it('400s when provided profileId that does not exist', done => {
      chai.request(server)
        .get('/v1/profiles/bad-profile-id/games')
        .set('X-Authorization', testProfile.accessToken)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
