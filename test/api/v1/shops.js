const helpers = require('../../helpers');

describe('Shops', () => {
  /*
   * GET
   */

  describe('GET /v1/shops', () => {
    it('200s with an array of shops for the game of the public key provided', done => {
      chai.request(server)
        .get('/v1/shops')
        .set('X-Game-Key', testGame.publishedKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.body.forEach(shop => {
            shop.should.be.an('object');
            shop.id.should.be.a('string');
            shop.gameId.should.be.a('string');
            shop.contract.should.be.an('object');
            shop.contract.chain.should.be.a('string');
            shop.contract.abi.should.be.an('array');
            shop.contract.address.should.be.a('string');
          });
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/shops', () => {
    it('200s with shop object and deploys shop contract', done => {
      const fields = {
        name: 'My great shop',
        chain: 'LOCAL',
      };

      chai.request(server)
        .post('/v1/shops')
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.gameId.should.be.a('string');
          response.body.name.should.equal(fields.name);
          response.body.contract.should.be.an('object');
          response.body.contract.chain.should.equal(fields.chain);
          response.body.contract.abi.should.be.an('array');
          response.body.contract.address.should.be.a('string');
          response.body.contract.transactions[0].args.should.be.an('array');
          response.body.contract.transactions[0].hash.should.be.a('string');
          done();
        });
    });

    it('400s if provided invalid chain', done => {
      const fields = {
        chain: 'BADCHAIN',
      };

      chai.request(server)
        .post('/v1/shops')
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
