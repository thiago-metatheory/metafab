const helpers = require('../../../helpers');

describe('Wallet Signatures', () => {
  /*
   * POST
   */

  describe('POST /v1/wallets/:walletId/signatures', () => {
    it('200s with message signature', done => {
      const fields = {
        message: 'This is a test message!',
      };

      chai.request(server)
        .post(`/v1/wallets/${testPlayer.custodialWallet.id}/signatures`)
        .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
        .send(fields)
        .end((error ,response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.signature.should.be.a('string');
          done();
        });
    });

    it('200s with message signature using backwards compatible x-password', done => {
      const fields = {
        message: 'This is a test message!',
      };

      chai.request(server)
        .post(`/v1/wallets/${testPlayer.custodialWallet.id}/signatures`)
        .set('X-Password', testPlayer.password)
        .send(fields)
        .end((error ,response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.signature.should.be.a('string');
          done();
        });
    });

    it('200s with message signature using profile decrypt key', done => {
      const fields = {
        message: 'This is a test message!',
      };

      chai.request(server)
        .post(`/v1/wallets/${testProfile.wallet.id}/signatures`)
        .set('X-Wallet-Decrypt-Key', testProfile.walletDecryptKey)
        .send(fields)
        .end((error ,response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.signature.should.be.a('string');
          done();
        });
    });

    it('200s with message signature using profile player', async () => {
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
          .post(`/v1/wallets/${profilePlayer.wallet.id}/signatures`)
          .set('X-Wallet-Decrypt-Key', profilePlayer.walletDecryptKey)
          .send({ message: 'This is a test message!' })
          .end((error ,response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.signature.should.be.a('string');
            resolve();
          });
      });
    });

    it('400s when wallet id mismatches profile player decrypt key', async () => {
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
          .post('/v1/wallets/aaa-aaa-aaa/signatures')
          .set('X-Wallet-Decrypt-Key', profilePlayer.walletDecryptKey)
          .send({ message: 'This is a test message!' })
          .end((error ,response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('400s when provided wallet id is an EOA', done => {
      const fields = {
        message: 'This is a test message!',
      };

      chai.request(server)
        .post(`/v1/wallets/${testPlayer.wallet.id}/signatures`)
        .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
