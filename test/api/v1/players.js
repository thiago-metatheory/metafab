const helpers = require('../../helpers');

describe('Players', () => {
  /*
   * GET
   */

  describe('GET /v1/players', () => {
    it('200s with player object', done => {
      chai.request(server)
        .get('/v1/players/auth')
        .set('X-Game-Key', testGame.publishedKey)
        .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${testPlayer.password}`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.gameId.should.equal(testGame.id);
          response.body.walletId.should.be.a('string');
          response.body.username.should.equal(testPlayer.username);
          response.body.accessToken.should.be.a('string');
          response.body.wallet.address.should.be.a('string');
          response.body.walletDecryptKey.should.be.a('string');
          response.body.custodialWallet.address.should.be.a('string');

          if (response.body.accessTokenExpiresAt !== null) {
            throw new Error('Expected accessTokenExpiresAt to be null.');
          }

          response.body.should.not.have.property('password');
          done();
        });
    });

    it('200s with player object and sets access token expiration', async () => {
      const expiration = Math.floor(Date.now() / 1000) + 3;

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/players/auth?accessTokenExpiresAt=${expiration}`)
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${testPlayer.password}`)}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('object');
            response.body.id.should.be.a('string');
            response.body.gameId.should.equal(testGame.id);
            response.body.walletId.should.be.a('string');
            response.body.username.should.equal(testPlayer.username);
            response.body.accessToken.should.be.a('string');
            response.body.wallet.address.should.be.a('string');
            response.body.walletDecryptKey.should.be.a('string');
            response.body.custodialWallet.address.should.be.a('string');
            response.body.accessToken.should.not.equal(testPlayer.accessToken);
            Math.floor((new Date(response.body.accessTokenExpiresAt)).getTime() / 1000).should.equal(expiration);

            response.body.should.not.have.property('password');

            testPlayer.accessToken = response.body.accessToken;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', testPlayer.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', testPlayer.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(401);
            resolve();
          });
      });
    });

    it('200s with an array of player objects for authenticated game', done => {
      chai.request(server)
        .get('/v1/players')
        .set('X-Authorization', testGame.secretKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('array');
          response.body.forEach(player => {
            player.custodialWallet.address.should.be.a('string');
            player.should.not.have.property('password');
            player.should.not.have.property('accessToken');
          });
          done();
        });
    });

    it('200s with player object for provided player id', done => {
      chai.request(server)
        .get(`/v1/players/${testPlayer.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.custodialWallet.address.should.be.a('string');
          response.body.should.not.have.property('password');
          response.body.should.not.have.property('accessToken');
          done();
        });
    });

    it('401s when provided credentials are invalid', done => {
      chai.request(server)
        .get('/v1/players/auth')
        .set('X-Game-Key', testGame.publishedKey)
        .set('Authorization', `Basic ${btoa(`${testPlayer.username}:badpassword`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });

    it('401s when no game authentication or player id is provided', done => {
      chai.request(server)
        .get('/v1/players')
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });

    it('400s when provided invalid playerId', done => {
      chai.request(server)
        .get('/v1/players/bad-id')
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

  describe('POST /v1/players', () => {
    it('200s with player object and properly sets access token expiration', async () => {
      const expiration = Math.floor(Date.now() / 1000) + 3;
      const fields = {
        username: 'tester123',
        password: 'abc123',
      };

      let player;

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players?accessTokenExpiresAt=${expiration}`)
          .set('X-Game-Key', testGame.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.custodialWallet.address.should.be.a('string');
            Math.floor((new Date(response.body.accessTokenExpiresAt)).getTime() / 1000).should.equal(expiration);
            player = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${player.id}`)
          .set('X-Authorization', player.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${player.id}`)
          .set('X-Authorization', player.accessToken)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(401);
            resolve();
          });
      });
    });

    it('200s with player object and creates internal management wallet for game', done => {
      const fields = {
        username: 'tester123',
        password: 'abc123',
      };

      chai.request(server)
        .post('/v1/players')
        .set('X-Game-Key', testGame.publishedKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.custodialWallet.address.should.be.a('string');
          done();
        });
    });

    it('200s with player object when username is in use by another game but not the target game', async () => {
      const gameFields =  {
        name: 'New Game',
        email: 'testing@gmail.com',
        password: '123121g2g',
      };

      const playerFields = {
        username: testPlayer.username,
        password: 'password',
      };

      let game;

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/games')
          .send(gameFields)
          .end((error, response) => {
            helpers.logResponse(response);
            game = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/games/${game.id}/verify?code=testing`)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players')
          .set('X-Game-Key', game.publishedKey)
          .send(playerFields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });
    });

    it('200s with player object for discord auth service', async () => {
      return;
      let createdPlayer;

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/games/${testGame.id}`)
          .send({ discordClientId: '1079988810315735052' })
          .set('X-Authorization', testGame.secretKey)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/auth/discord')
          .set('X-Game-Key', testGame.publishedKey)
          .send({ serviceCredential: 'dFFCddDXGBy1zUcBuP79sdD2ysQfm8' })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            createdPlayer = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/auth/discord')
          .set('X-Game-Key', testGame.publishedKey)
          .send({ serviceCredential: 'dFFCddDXGBy1zUcBuP79sdD2ysQfm8' })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.id.should.equal(createdPlayer.id);
            resolve();
          });
      });
    });

    it('200s with player object for discord auth service and sets username', async () => {
      return;
      const fields = {
        serviceCredential: 'dFFCddDXGBy1zUcBuP79sdD2ysQfm8',
        username: 'test123',
      };

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/games/${testGame.id}`)
          .send({ discordClientId: '1079988810315735052' })
          .set('X-Authorization', testGame.secretKey)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/auth/discord')
          .set('X-Game-Key', testGame.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.username.should.equal(fields.username);
            resolve();
          });
      });
    });

    it('200s with player object for wallet auth', async () => {
      const fields = {
        username: 'test14124',
        serviceCredential: JSON.stringify({
          message: 'test123',
          signature: await testEthersWallet.signMessage('test123'),
        }),
      };

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/auth/wallet')
          .set('X-Game-Key', testGame.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });
    });

    it('200s and changes password using backup code and cannot use backup code again', async () => {
      const fields = {
        id: testPlayer.id,
        backupCode: testPlayer.backupCodes[0],
        newPassword: 'newpass',
      };

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.have.property('id');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${fields.newPassword}`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('200s and recovers player account and updates password using email recovery process', async () => {
      let recoveryCredentials;
      let accessToken;

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', testPlayer.accessToken)
          .send({
            currentPassword: testPlayer.password,
            recoveryEmail: 'ark@trymetafab.com',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/startRecover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({ email: 'ark@trymetafab.com' })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200); // 200s for local tests, 204s and sends email in prod
            recoveryCredentials = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: testPlayer.username,
            recoveryEmailCode: recoveryCredentials.recoveryEmailCode,
            recoveryEmailDecryptKey: recoveryCredentials.recoveryEmailDecryptKey,
            newPassword: 'mynewpassword',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:mynewpassword`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            accessToken = response.body.accessToken;
            resolve();
          });
      });

      await new Promise(resolve => { // shouldn't be able to reuse code.
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: testPlayer.username,
            recoveryEmailCode: recoveryCredentials.recoveryEmailCode,
            recoveryEmailDecryptKey: recoveryCredentials.recoveryEmailDecryptKey,
            newPassword: 'mynewpassword',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', accessToken)
          .send({
            currentPassword: 'mynewpassword',
            recoveryEmail: 'ark2@trymetafab.com',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/startRecover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({ email: 'ark2@trymetafab.com' })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200); // 200s for local tests, 204s and sends email in prod
            recoveryCredentials = response.body;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: testPlayer.username,
            recoveryEmailCode: recoveryCredentials.recoveryEmailCode,
            recoveryEmailDecryptKey: recoveryCredentials.recoveryEmailDecryptKey,
            newPassword: 'mynewpassword2',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:mynewpassword2`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });
    });

    it('400s when username is in use for game', done => {
      const fields = {
        username: testPlayer.username,
        password: 'test123',
      };

      chai.request(server)
        .post('/v1/players')
        .set('X-Game-Key', testGame.publishedKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s when recoveryEmailLookup is in use for existing player of game', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: 'user1',
            password: 'teast123',
            recoveryEmail: 'test@trymetafab.com',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: 'user2',
            password: 'teast123',
            recoveryEmail: 'test@trymetafab.com',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('400s if provided invalid backup code', done => {
      chai.request(server)
        .post('/v1/players/recover')
        .set('X-Game-Key', testGame.publishedKey)
        .send({
          username: testPlayer.username,
          backupCode: 'badcode',
          newPassword: 'newpass',
        })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s if starting email recovery process for account with no recovery email', done => {
      chai.request(server)
        .post('/v1/players/startRecover')
        .set('X-Game-Key', testGame.publishedKey)
        .send({ email: 'ark@trymetafab.com' })
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

  describe('PATCH /v1/players/:playerId', () => {
    it('200s and resets access token', done => {
      const fields = {
        resetAccessToken: true,
      };

      chai.request(server)
        .patch(`/v1/players/${testPlayer.id}`)
        .set('X-Authorization', testPlayer.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.custodialWallet.address.should.be.a('string');
          response.body.accessToken.should.not.equal(testPlayer.accessToken);
          done();
        });
    });

    it('200s and changes password and properly handles wallet decryption with new password', done => {
      const fields = {
        currentPassword: 'default',
        newPassword: 'aNewPassword',
      };

      chai.request(server)
        .patch(`/v1/players/${testPlayer.id}`)
        .set('X-Authorization', testPlayer.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.walletDecryptKey.should.be.a('string');
          testPlayer.walletDecryptKey = response.body.walletDecryptKey;

          chai.request(server)
            .get('/v1/players/auth')
            .set('X-Game-Key', testGame.publishedKey)
            .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${fields.newPassword}`)}`)
            .end(async (error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              response.body.should.have.property('id');
              testPlayer.accessToken = response.body.accessToken;

              await helpers.mintTestCurrency({
                address: testPlayer.wallet.address,
                amount: 50,
              });

              chai.request(server)
                .post(`/v1/currencies/${testCurrency.id}/transfers`)
                .set('X-Authorization', testPlayer.accessToken)
                .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
                .send({
                  address: testGame.wallet.address,
                  amount: 50,
                })
                .end((error, response) => {
                  helpers.logResponse(response);
                  response.should.have.status(200);
                  done();
                });
            });
        });
    });

    it('200s and resets backup codes', async () => {
      let newBackupCodes;
      let newAccessToken;

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', testPlayer.accessToken)
          .send({
            resetBackupCodes: true,
            currentPassword: testPlayer.password,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.have.property('backupCodes');
            newBackupCodes = response.body.backupCodes;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players/recover')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: testPlayer.username,
            backupCode: newBackupCodes[0],
            newPassword: 'newpass',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.have.property('id');
            response.body.should.have.property('accessToken');
            response.body.should.have.property('walletDecryptKey');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:newpass`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            newAccessToken = response.body.accessToken;
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', newAccessToken)
          .send({
            backupCode: newBackupCodes[0],
            newPassword: 'newpass',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('400s if provided invalid password when changing password', done => {
      const fields = {
        currentPassword: 'wrongpassword',
        newPassword: 'aNewPassword',
      };

      chai.request(server)
        .patch(`/v1/players/${testPlayer.id}`)
        .set('X-Authorization', testPlayer.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided recoveryEmail that is already in use', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/players')
          .set('X-Game-Key', testGame.publishedKey)
          .send({
            username: 'test1',
            password: 'teast123',
            recoveryEmail: 'test@trymetafab.com',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/players/${testPlayer.id}`)
          .set('X-Authorization', testPlayer.accessToken)
          .send({ recoveryEmail: 'test@trymetafab.com' })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('401s when access token is invalid', done => {
      const fields = {
        resetAccessToken: true,
      };

      chai.request(server)
        .patch(`/v1/players/${testPlayer.id}`)
        .set('X-Authorization', `wrong${testPlayer.accessToken}`)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });
  });
});
