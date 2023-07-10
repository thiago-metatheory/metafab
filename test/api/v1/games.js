const fs = require('fs');
const helpers = require('../../helpers');

describe('Games', () => {
  /*
   * GET
   */

  describe('GET /v1/games', () => {
    it('200s with game object and token credentials', done => {
      chai.request(server)
        .get('/v1/games/auth')
        .set('Authorization', `Basic ${btoa(`${testGame.email}:${testGame.password}`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.email.should.be.a('string');
          response.body.publishedKey.should.be.a('string');
          response.body.secretKey.should.be.a('string');
          response.body.updatedAt.should.be.a('string');
          response.body.createdAt.should.be.a('string');
          response.body.wallet.address.should.be.a('string');
          response.body.fundingWallet.address.should.be.a('string');

          response.body.should.not.have.property('password');
          response.body.wallet.should.not.have.property('ciphertext');
          response.body.fundingWallet.should.not.have.property('ciphertext');

          done();
        });
    });

    it('200s with game object for provided game id', done => {
      chai.request(server)
        .get(`/v1/games/${testGame.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.should.not.have.property('email');
          response.body.should.not.have.property('password');
          response.body.should.not.have.property('secretKey');
          done();
        });
    });

    it('401s when provided credentials are invalid', done => {
      chai.request(server)
        .get('/v1/games/auth')
        .set('Authorization', `Basic ${btoa(`${testGame.email}:badpassword`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });


    it('400s when provided invalid gameId', done => {
      chai.request(server)
        .get('/v1/games/bad-id')
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

  describe('POST /v1/games', () => {
    it('200s with game object and creates internal management wallet', done => {
      const fields = {
        name: 'NFT Worlds',
        email: 'nftworldsproject@gmail.com',
        password: 'testing123',
      };

      chai.request(server)
        .post('/v1/games')
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.email.should.be.a('string');
          response.body.publishedKey.should.be.a('string');
          response.body.secretKey.should.be.a('string');
          response.body.updatedAt.should.be.a('string');
          response.body.createdAt.should.be.a('string');
          response.body.wallet.address.should.be.a('string');
          response.body.verified.should.equal(false);
          response.body.fundingWallet.address.should.be.a('string');

          response.body.should.not.have.property('password');
          response.body.wallet.should.not.have.property('ciphertext');
          response.body.fundingWallet.should.not.have.property('ciphertext');

          done();
        });
    });

    it('400s when email address is in use', done => {
      const fields = {
        name: 'My Game',
        email: 'singleemail@gmail.com',
        password: 'hellohello123',
      };

      chai.request(server)
        .post('/v1/games')
        .send(fields)
        .end((error, response) => {
          response.should.have.status(200);

          chai.request(server)
            .post('/v1/games')
            .send(fields)
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(400);
              done();
            });
        });
    });
  });

  /*
   * PATCH
   */

  describe('PATCH /v1/games/:gameId', () => {
    it('200s and resets specified game credentials', done => {
      const fields = {
        resetPublishedKey: true,
        //resetSecretKey: true,
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.publishedKey.should.not.equal(testGame.publishedKey);

          // don't reset live key
          response.body.secretKey.should.equal(testGame.secretKey);
          done();
        });
    });

    it('200s and changes password and properly handles wallet decryption with new password', done => {
      const fields = {
        currentPassword: 'default',
        newPassword: 'someNewPassword',
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.walletDecryptKey.should.be.a('string');
          testGame.walletDecryptKey = response.body.walletDecryptKey;

          chai.request(server)
            .get('/v1/games/auth')
            .set('Authorization', `Basic ${btoa(`${testGame.email}:${fields.newPassword}`)}`)
            .end((error, response) => {
              response.should.have.status(200);
              response.body.should.have.property('id');

              chai.request(server)
                .post(`/v1/currencies/${testCurrency.id}/mints`)
                .set('X-Authorization', testGame.secretKey)
                .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
                .send({
                  address: testPlayer.wallet.address,
                  amount: 100,
                })
                .end((error, response) => {
                  response.should.have.status(200);
                  done();
                });
            });
        });
    });

    it('200s and updates game rpcs and removes game rpcs', done => {
      const fields = {
        rpcs: {
          MATIC: 'https://polygon-rpc.com',
        },
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          chai.request(server)
            .patch(`/v1/games/${testGame.id}`)
            .set('X-Authorization', testGame.secretKey)
            .send({ rpcs: { MATIC: null } })
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              Object.keys(response.body.rpcs).length.should.equal(0);
              done();
            });
        });
    });

    it('200s and updates redirectUris', done => {
      const fields = {
        redirectUris: [
          'http://localhost',
          'https://trymetafab.com',
        ],
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.redirectUris[0].should.equal(fields.redirectUris[0]);
          response.body.redirectUris[1].should.equal(fields.redirectUris[1]);
          done();
        });
    });

    it('200s and updates iconImageUrl and coverImageUrl', done => {
      const fields = {
        iconImageBase64: fs.readFileSync('test/assets/icon.webp').toString('base64'),
        coverImageBase64: fs.readFileSync('test/assets/cover.png').toString('base64'),
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.iconImageUrl.should.not.equal('');
          response.body.coverImageUrl.should.not.equal('');
          done();
        });
    });

    it('200s and updates primaryColorHex', done => {
      const fields = {
        primaryColorHex: '#AeCc1E',
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.primaryColorHex.should.equal(fields.primaryColorHex);
          done();
        });
    });

    it('200s and updates discordClientId', done => {
      const fields = {
        discordClientId: 'testing!',
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.discordClientId.should.equal(fields.discordClientId);
          done();
        });
    });

    it('200s and updates game name and email', done => {
      const fields = {
        name: 'New Name!',
        email: 'test@testing.com',
        currentPassword: 'default',
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.name.should.equal(fields.name);
          response.body.email.should.equal(fields.email);
          done();
        });
    });

    it('400s if provided invalid password when changing password', done => {
      const fields = {
        currentPassword: 'invalid',
        newPassword: 'someNewPassword',
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided invalid chain name for rpc', done => {
      const fields = {
        rpcs: {
          MATCC: 'https://polygon-rpc.com',
        },
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided invalid chain url for rpc', done => {
      const fields = {
        rpcs: {
          ETHEREUM: 'https://polygon-rpc.com',
        },
      };

      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('401s when access token is invalid', done => {
      chai.request(server)
        .patch(`/v1/games/${testGame.id}`)
        .set('X-Authorization', 'uht42ihgwi4')
        .send({ resetSecretKey: true })
        .end((error, response) => {
          response.should.have.status(401);
          done();
        });
    });
  });
});
