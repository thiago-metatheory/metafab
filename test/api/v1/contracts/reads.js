const helpers = require('../../../helpers');

describe('Contract Reads', () => {
  /*
   * GET
   */

  describe('GET /v1/contracts/:contractId/reads', () => {
    it('200s with result of contract read', done => {
      const query = {
        func: 'decimals',
      };

      chai.request(server)
        .get(`/v1/contracts/${testCurrency.contractId}/reads`)
        .query(query)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.equal(18);
          done();
        });
    });

    it('400s when provided invalid function name', done => {
      const query = {
        func: 'notReal',
      };

      chai.request(server)
        .get(`/v1/contracts/${testCurrency.contractId}/reads`)
        .query(query)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
