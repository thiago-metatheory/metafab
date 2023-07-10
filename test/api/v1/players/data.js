const helpers = require('../../../helpers');

describe('Player Data', () => {
  /*
   * GET
   */

  describe('GET /v1/players/:playerId/data', () => {
    it('200s with player data for provided player id', async () => {
      const fields = {
        publicData: {
          test: true,
          live: true,
        },
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testPlayer.accessToken)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/players/${testPlayer.id}/data`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.publicData.test.should.equal(true);
            response.body.publicData.live.should.equal(true);
            response.body.should.have.property('updatedAt');
            resolve();
          });
      });
    });

    it('400s when provided playerId that does not exist', done => {
      chai.request(server)
        .get('/v1/players/badid/data')
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

  describe('POST /v1/players/:playerId/data', () => {
    it('200s with player data and merge writes publicData as player', done => {
      const fields = {
        publicData: {
          live: false,
          preferences: {
            autosave: true,
            volume: 100,
          },
        },
      };

      chai.request(server)
        .post(`/v1/players/${testPlayer.id}/data`)
        .set('X-Authorization', testPlayer.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.publicData.live.should.equal(false);
          response.body.publicData.preferences.autosave.should.equal(true);
          done();
        });
    });

    it('200s with player data and merge writes publicData as game', async () => {
      const fields = {
        publicData: {
          live: false,
          preferences: {
            autosave: true,
            volume: 100,
          },
        },
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testGame.secretKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.publicData.live.should.equal(false);
            response.body.publicData.preferences.autosave.should.equal(true);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testGame.secretKey)
          .send({ publicData: { live: true } })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.publicData.live.should.equal(true);
            resolve();
          });
      });
    });

    it('200s with player data and merge writes protectedData as game', async () => {
      const fields = {
        protectedData: {
          level: 100,
          experience: 1241,
        },
      };

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testGame.secretKey)
          .send(fields)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.protectedData.level.should.equal(fields.protectedData.level);
            response.body.protectedData.experience.should.equal(fields.protectedData.experience);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testGame.secretKey)
          .send({ protectedData: { level: 101 } })
          .end((error, response) => {
            helpers.logResponse(response);
            response.body.protectedData.level.should.equal(101);
            response.body.protectedData.experience.should.equal(fields.protectedData.experience);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/data`)
          .set('X-Authorization', testPlayer.accessToken)
          .send({ publicData: { testing: 123 } })
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.publicData.testing.should.equal(123);
            resolve();
          });
      });
    });

    it('401s if writing publicData and not authenticated correct player or game', done => {
      const fields = {
        publicData: {
          live: false,
          preferences: {
            autosave: true,
            volume: 100,
          },
        },
      };

      chai.request(server)
        .post(`/v1/players/${testPlayer.id}/data`)
        .set('X-Authorization', testPlayerTwo.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });

    it('401s if writing protectedData and not authenticated correct game', done => {
      const fields = {
        protectedData: {
          live: false,
          preferences: {
            autosave: true,
            volume: 100,
          },
        },
      };

      chai.request(server)
        .post(`/v1/players/${testPlayer.id}/data`)
        .set('X-Authorization', testPlayer.accessToken)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(401);
          done();
        });
    });
  });
});
