const helpers = require('../../helpers');

describe('Profiles', () => {
  /*
   * GET
   */

  describe('GET /v1/profiles', () => {
    it('200s with profile object', done => {
      chai.request(server)
        .get('/v1/profiles/auth')
        .set('X-Ecosystem-Key', testEcosystem.publishedKey)
        .set('Authorization', `Basic ${btoa(`${testProfile.username}:${testProfile.password}`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.walletId.should.be.a('string');
          response.body.username.should.equal(testProfile.username);
          response.body.accessToken.should.be.a('string');
          response.body.wallet.address.should.be.a('string');
          response.body.custodialWallet.address.should.be.a('string');

          response.body.should.not.have.property('password');
          done();
        });
    });

    it('401s when provided credentials are invalid', done => {
      chai.request(server)
        .get('/v1/profiles/auth')
        .set('X-Ecosystem-Key', testEcosystem.publishedKey)
        .set('Authorization', `Basic ${btoa(`${testProfile.username}:badpassword`)}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/profiles', () => {
    it('200s with profile object and creates internal management wallet for profile', done => {
      const fields = {
        username: 'tester123',
        password: 'abc123',
      };

      chai.request(server)
        .post('/v1/profiles')
        .set('X-Ecosystem-Key', testEcosystem.publishedKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.custodialWallet.address.should.be.a('string');
          done();
        });
    });

    it('200s and changes password using backup code and cannot use backup code again', async () => {
      const fields = {
        id: testProfile.id,
        backupCode: testProfile.backupCodes[0],
        newPassword: 'newpass',
      };

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
          .get('/v1/profiles/auth')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testProfile.username}:${fields.newPassword}`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            resolve();
          });
      });
    });

    it('200s and recovers profile account and updates password using email recovery process', async () => {
      let recoveryCredentials;
      let accessToken;

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/profiles/${testProfile.id}`)
          .set('X-Authorization', testProfile.accessToken)
          .send({
            currentPassword: testProfile.password,
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
          .post('/v1/profiles/startRecover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send({
            username: testProfile.username,
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
          .get('/v1/profiles/auth')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testProfile.username}:mynewpassword`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            accessToken = response.body.accessToken;
            resolve();
          });
      });

      await new Promise(resolve => { // shouldn't be able to reuse code.
        chai.request(server)
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send({
            username: testProfile.username,
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
          .patch(`/v1/profiles/${testProfile.id}`)
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
          .post('/v1/profiles/startRecover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send({
            username: testProfile.username,
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
          .get('/v1/profiles/auth')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testProfile.username}:mynewpassword2`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });
    });

    it('400s when username is in use', done => {
      const fields = {
        username: testProfile.username,
        password: 'test123',
      };

      chai.request(server)
        .post('/v1/profiles')
        .set('X-Ecosystem-Key', testEcosystem.publishedKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided invalid backup code', done => {
      chai.request(server)
        .post('/v1/profiles/recover')
        .set('X-Ecosystem-Key', testEcosystem.publishedKey)
        .send({
          username: testProfile.username,
          backupCode: 'badcode',
          newPassword: 'newpass',
        })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s when recoveryEmailLookup is in use for existing player of game', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/profiles')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
          .post('/v1/profiles')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
  });

  /*
   * PATCH
   */

  describe('PATCH /v1/profiles/:profileId', () => {
    it('200s and resets access token', done => {
      const fields = {
        resetAccessToken: true,
      };

      chai.request(server)
        .patch(`/v1/profiles/${testProfile.id}`)
        .set('X-Authorization', testProfile.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.custodialWallet.address.should.be.a('string');
          response.body.accessToken.should.not.equal(testProfile.accessToken);
          done();
        });
    });

    it('200s and changes password and properly handles wallet decryption with new password', done => {
      const fields = {
        currentPassword: 'default2',
        newPassword: 'aNewPassword',
      };

      chai.request(server)
        .patch(`/v1/profiles/${testProfile.id}`)
        .set('X-Authorization', testProfile.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          chai.request(server)
            .get('/v1/profiles/auth')
            .set('Authorization', `Basic ${btoa(`${testProfile.username}:${fields.newPassword}`)}`)
            .set('X-Ecosystem-Key', testEcosystem.publishedKey)
            .end(async (error, response) => {
              response.should.have.status(200);
              response.body.should.have.property('id');
              done();
            });
        });
    });

    it('200s and resets backup codes', async () => {
      let newBackupCodes;

      await new Promise(resolve => {
        chai.request(server)
          .patch(`/v1/profiles/${testProfile.id}`)
          .set('X-Authorization', testProfile.accessToken)
          .send({
            resetBackupCodes: true,
            currentPassword: testProfile.password,
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
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send({
            username: testProfile.username,
            backupCode: newBackupCodes[0],
            newPassword: 'newpass',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.have.property('id');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/profiles/auth')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testProfile.username}:newpass`)}`)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/profiles/recover')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
          .send({
            username: testProfile.username,
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
        .patch(`/v1/profiles/${testProfile.id}`)
        .set('X-Authorization', testProfile.accessToken)
        .send(fields)
        .end((error, response) => {
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided recoveryEmail that is already in use', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post('/v1/profiles')
          .set('X-Ecosystem-Key', testEcosystem.publishedKey)
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
          .patch(`/v1/profiles/${testProfile.id}`)
          .set('X-Authorization', testProfile.accessToken)
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
        .patch(`/v1/profiles/${testProfile.id}`)
        .set('X-Authorization', `wrong${testProfile.accessToken}`)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });
  });
});
