const helpers = require('../../../../helpers');

describe('Profile Game Players', () => {
  /*
   * GET
   */

  describe('GET /v1/profiles/:profileId/games/:gameId/players/auth', () => {
    it('200s with player object and correct wallet key allowing transfers', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send({
            username: 'newPlayer123',
            permissions: {
              version: '1.0.0',
              [testCurrency.contract.address]: {
                chain: 'LOCAL',
                functions: [ '*' ],
                erc20Limit: 100,
              },
            },
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      let newPlayer;

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players/auth`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .set('X-Username', 'newPlayer123')
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.walletDecryptKey.should.be.a('string');
            newPlayer = response.body;
            resolve();
          });
      });

      await helpers.mintTestCurrency({
        address: newPlayer.wallet.address,
        amount: 100,
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', newPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', newPlayer.walletDecryptKey)
          .send({
            walletId: testGame.wallet.id,
            amount: 30,
          })
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithFee');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, 30);
            await helpers.testAddressCurrencyBalance(newPlayer.wallet.address, 70);
            resolve();
          });
      });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/profiles/:profileId/games/:gameId/players', () => {
    it('200s with created player object linked to profile with profile authorization', done => {
      chai.request(server)
        .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
        .set('X-Authorization', testProfile.accessToken)
        .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
        .send({ username: 'newPlayer123' })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          done();
        });
    });

    it('200s with created player object linked to profile with profile authorization with permissions', done => {
      chai.request(server)
        .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
        .set('X-Authorization', testProfile.accessToken)
        .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
        .send({
          username: 'newPlayer123',
          permissions: {
            version: '1.0.0',
            [testCurrency.contract.address]: {
              chain: 'LOCAL',
              functions: [ '*' ],
              erc20Limit: 100,
            },
          },
        })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          done();
        });
    });

    it('400s when username is already in use', done => {
      chai.request(server)
        .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
        .set('X-Authorization', testProfile.accessToken)
        .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
        .send({ username: testPlayer.username })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });

  /*
   * PATCH
   */

  describe('PATCH /v1/profiles/:profileId/games/:gameId/players/:playerId', () => {
    it('200s and updates profile player permissions', async () => {
      let profilePlayer;

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send({
            username: 'newPlayer123',
            permissions: {
              version: '1.0.0',
              [testCurrency.contract.address]: {
                chain: 'LOCAL',
                functions: [ '*' ],
                erc20Limit: 100,
              },
            },
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            profilePlayer = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players/${profilePlayer.id}`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send({
            permissions: {},
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });
    });

    it('400s when provided player id that is not associated with authenticated profile and/or provided gameId', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/profiles/${testProfile.id}/games/${testGame.id}/players/${testPlayerTwo.id}`)
          .set('X-Authorization', testProfile.accessToken)
          .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
          .send({
            permissions: {},
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });
  });
});
