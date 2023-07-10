const helpers = require('../../../helpers');

describe('Ecosystem Games', () => {
  /*
   * GET
   */

  describe('GET /v1/ecosystems/:ecosystemId/games', () => {
    it('200s with approved games for provided ecosystemId', done => {
      chai.request(server)
        .get(`/v1/ecosystems/${testEcosystem.id}/games`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('array');
          response.body.length.should.equal(1);
          done();
        });
    });

    it('200s when provided approved game id', done => {
      chai.request(server)
        .get(`/v1/ecosystems/${testEcosystem.id}/games/${testGame.id}`)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          done();
        });
    });

    it('400s when provided game id that is not approved for ecosystem', done => {
      chai.request(server)
        .get(`/v1/ecosystems/${testEcosystem.id}/games/${testGameTwo.id}`)
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

  describe('POST /v1/ecosystems/:ecosystemId/games', () => {
    it('204s and sets game as approved within the authenticated ecosystem', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/ecosystems/${testEcosystem.id}/games`)
          .set('X-Authorization', testEcosystem.secretKey)
          .send({ gameId: testGameTwo.id })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(204);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/ecosystems/${testEcosystem.id}/games`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('array');
            response.body.length.should.equal(2);
            resolve();
          });
      });
    });

    it('401s when provided invalid ecosystem secret key', done => {
      chai.request(server)
        .post(`/v1/ecosystems/${testEcosystem.id}/games`)
        .set('X-Authorization', 'some-bad-key')
        .send({ gameId: testGameTwo.id })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });

    it('400s when provided a gameId that is already authorized', done => {
      chai.request(server)
        .post(`/v1/ecosystems/${testEcosystem.id}/games`)
        .set('X-Authorization', testEcosystem.secretKey)
        .send({ gameId: testGame.id })
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });

  /*
   * DELETE
   */

  describe('DELETE /v1/ecosystems/:ecosystemId/games', () => {
    it('204s and removes game as approved within the authenticated ecosystem', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/ecosystems/${testEcosystem.id}/games`)
          .set('X-Authorization', testEcosystem.secretKey)
          .send({ gameId: testGameTwo.id })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(204);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .delete(`/v1/ecosystems/${testEcosystem.id}/games/${testGame.id}`)
          .set('X-Authorization', testEcosystem.secretKey)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(204);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/ecosystems/${testEcosystem.id}/games`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('array');
            response.body.length.should.equal(1);
            resolve();
          });
      });
    });

    it('401s when provided invalid ecosystem secret key', done => {
      chai.request(server)
        .delete(`/v1/ecosystems/${testEcosystem.id}/games/${testGame.id}`)
        .set('X-Authorization', 'some-bad-key')
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });
  });
});
