const fs = require('fs');
const helpers = require('../../helpers');

describe('Ecosystems', () => {
  /*
   * GET
   */

  describe('GET /v1/ecosystems', () => {
    it('200s with ecosystem object and credentials', done => {
      chai.request(server)
        .get('/v1/ecosystems/auth')
        .set('Authorization', `Basic ${btoa(`${testEcosystem.email}:${testEcosystem.password}`)}`)
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

          response.body.should.not.have.property('password');

          done();
        });
    });

    it('200s with ecosystem object for provided ecosystem id', done => {
      chai.request(server)
        .get(`/v1/ecosystems/${testEcosystem.id}`)
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
        .get('/v1/ecosystems/auth')
        .set('Authorization', `Basic ${btoa(`${testEcosystem.email}:badpassword`)}`)
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

  describe('POST /v1/ecosystems', () => {
    it('200s with ecosystem object', done => {
      const fields = {
        name: 'NFT Worlds',
        email: 'nftworldsproject@gmail.com',
        password: 'testing123',
      };

      chai.request(server)
        .post('/v1/ecosystems')
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

          response.body.should.not.have.property('password');

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
        .post('/v1/ecosystems')
        .send(fields)
        .end((error, response) => {
          response.should.have.status(200);

          chai.request(server)
            .post('/v1/ecosystems')
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

  describe('PATCH /v1/ecosystems/:ecosystemId', () => {
    it('200s and resets specified ecosystem credentials', done => {
      const fields = {
        resetPublishedKey: true,
      };

      chai.request(server)
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.publishedKey.should.not.equal(testEcosystem.publishedKey);

          // don't reset live key
          response.body.secretKey.should.equal(testEcosystem.secretKey);
          done();
        });
    });

    it('200s and changes password', done => {
      const fields = {
        currentPassword: 'default',
        newPassword: 'someNewPassword',
      };

      chai.request(server)
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);

          chai.request(server)
            .get('/v1/ecosystems/auth')
            .set('Authorization', `Basic ${btoa(`${testEcosystem.email}:${fields.newPassword}`)}`)
            .end((error, response) => {
              response.should.have.status(200);
              response.body.should.have.property('id');
              done();
            });
        });
    });

    it('200s and updates iconImageUrl and coverImageUrl', done => {
      const fields = {
        iconImageBase64: fs.readFileSync('test/assets/icon.webp').toString('base64'),
        coverImageBase64: fs.readFileSync('test/assets/cover.png').toString('base64'),
      };

      chai.request(server)
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
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
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.primaryColorHex.should.equal(fields.primaryColorHex);
          done();
        });
    });

    it('200s and updates ecosystem name and email', done => {
      const fields = {
        name: 'New Name!',
        email: 'test@testing.com',
        currentPassword: 'default',
      };

      chai.request(server)
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
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
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', testEcosystem.secretKey)
        .send(fields)
        .end((error, response) => {
          response.should.have.status(400);
          done();
        });
    });

    it('401s when access token is invalid', done => {
      chai.request(server)
        .patch(`/v1/ecosystems/${testEcosystem.id}`)
        .set('X-Authorization', 'uht42ihgwi4')
        .send({ resetSecretKey: true })
        .end((error, response) => {
          response.should.have.status(401);
          done();
        });
    });
  });
});
