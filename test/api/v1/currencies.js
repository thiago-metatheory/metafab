const helpers = require('../../helpers');

describe('Currencies', () => {
  /*
   * GET
   */

  describe('GET /v1/currencies', () => {
    it('200s with an array of currencies for the game of the public key provided', done => {
      chai.request(server)
        .get('/v1/currencies')
        .set('X-Game-Key', testGame.publishedKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.body.forEach(currency => {
            currency.should.be.an('object');
            currency.id.should.be.a('string');
            currency.gameId.should.be.a('string');
            currency.name.should.be.a('string');
            currency.symbol.should.be.a('string');
            currency.supplyCap.should.be.a('number');
            currency.contract.should.be.an('object');
            currency.contract.chain.should.be.a('string');
            currency.contract.abi.should.be.an('array');
            currency.contract.address.should.be.a('string');
          });
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/currencies', () => {
    it('200s with currency object and deploys currency contract', done => {
      const fields = {
        name: 'WRLD Token',
        symbol: 'WRLD',
        supplyCap: 1000,
        chain: 'LOCAL',
      };

      chai.request(server)
        .post('/v1/currencies')
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
          response.body.symbol.should.equal(fields.symbol);
          response.body.supplyCap.should.equal(fields.supplyCap);
          response.body.contract.should.be.an('object');
          response.body.contract.chain.should.equal(fields.chain);
          response.body.contract.abi.should.be.an('array');
          response.body.contract.address.should.be.a('string');
          response.body.contract.transactions[0].args.should.be.an('array');
          response.body.contract.transactions[0].hash.should.be.a('string');
          done();
        });
    });

    it('200s with currency object and deploys currency contract for uncapped currency', done => {
      const fields = {
        name: 'WRLD Token',
        symbol: 'WRLD',
        supplyCap: 0,
        chain: 'LOCAL',
      };

      chai.request(server)
        .post('/v1/currencies')
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
          response.body.symbol.should.equal(fields.symbol);
          response.body.supplyCap.should.equal(fields.supplyCap);
          response.body.contract.should.be.an('object');
          response.body.contract.chain.should.equal(fields.chain);
          response.body.contract.abi.should.be.an('array');
          response.body.contract.address.should.be.a('string');
          response.body.contract.transactions[0].args.should.be.an('array');
          response.body.contract.transactions[0].hash.should.be.a('string');
          done();
        });
    });

    it('400s if the provided symbol for currency already exists for game', done => {
      const fields = {
        name: testCurrency.name,
        symbol: testCurrency.symbol,
        supplyCap: testCurrency.supplyCap,
        chain: 'LOCAL',
      };

      chai.request(server)
        .post('/v1/currencies')
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s if provided invalid chain', done => {
      const fields = {
        name: 'My Token',
        symbol: 'TOKEN',
        supplyCap: 10000,
        chain: 'BADCHAIN',
      };

      chai.request(server)
        .post('/v1/currencies')
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
