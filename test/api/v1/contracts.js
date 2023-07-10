const helpers = require('../../helpers');

describe('Contracts', () => {
  /*
   * GET
   */

  describe('GET /v1/contracts', () => {
    it('200s with an array of contracts for the game of the public key provided', done => {
      chai.request(server)
        .get('/v1/contracts')
        .set('X-Game-Key', testGame.publishedKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.forEach(contract => {
            contract.should.be.an('object');
            contract.id.should.be.a('string');
            contract.chain.should.be.a('string');
            contract.abi.should.be.an('array');
            contract.type.should.be.a('string');
            contract.address.should.be.a('string');
          });
          done();
        });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/contracts', () => {
    it('200s with contract object for created contract entry that supports reads/writes', done => {
      const fields = {
        address: '0xD5d86FC8d5C0Ea1aC1Ac5Dfab6E529c9967a45E9',
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: 'account',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        chain: 'ETHEREUM',
      };

      chai.request(server)
        .post('/v1/contracts')
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.chain.should.equal(fields.chain);
          response.body.abi.should.be.an('array');
          response.body.type.should.be.a('string');
          response.body.address.should.equal(fields.address);

          chai.request(server)
            .get(`/v1/contracts/${response.body.id}/reads`)
            .query({
              func: 'balanceOf',
              args: '0x9A80c6437ad9b6E7a1608814cBab93dEeecf388a',
            })
            .end((error, response) => {
              helpers.logResponse(response);
              response.should.have.status(200);
              done();
            });
        });
    });

    it('200s with contract object for created contract entry that supports reads/writes with forwarder address', done => {
      const fields = {
        address: '0xD5d86FC8d5C0Ea1aC1Ac5Dfab6E529c9967a45E9',
        forwarderAddress: testForwarder.address,
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: 'account',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        chain: 'ETHEREUM',
      };

      chai.request(server)
        .post('/v1/contracts')
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(200);
          response.body.should.be.an('object');
          response.body.id.should.be.a('string');
          response.body.chain.should.equal(fields.chain);
          response.body.abi.should.be.an('array');
          response.body.type.should.be.a('string');
          response.body.address.should.equal(fields.address);

          chai.request(server)
            .get(`/v1/contracts/${response.body.id}/reads`)
            .query({
              func: 'balanceOf',
              args: '0x9A80c6437ad9b6E7a1608814cBab93dEeecf388a',
            })
            .end((error, response) => {
              response.should.have.status(200);
              done();
            });
        });
    });

    it('400s when provided contract address and chain that already exists for authenticated game', done => {
      const fields = {
        address: '0xD5d86FC8d5C0Ea1aC1Ac5Dfab6E529c9967a45E9',
        forwarderAddress: testForwarder.address,
        abi: [],
        chain: 'ETHEREUM',
      };

      chai.request(server)
        .post('/v1/contracts')
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          response.should.have.status(200);
          response.body.should.be.an('object');

          chai.request(server)
            .post('/v1/contracts')
            .set('X-Authorization', testGame.secretKey)
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
   * DELETE
   */

  describe('DELETE /v1/contracts/:id', () => {
    it('204s when contract is successfully deleted', done => {
      const fields = {
        address: '0xD5d86FC8d5C0Ea1aC1Ac5Dfab6E529c9967a45E9',
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: 'account',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        chain: 'ETHEREUM',
      };

      chai.request(server)
        .post('/v1/contracts')
        .set('X-Authorization', testGame.secretKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);

          chai.request(server)
            .delete(`/v1/contracts/${response.body.id}`)
            .set('X-Authorization', testGame.secretKey)
            .end((error, response) => {
              helpers.logResponse(response);
              response.body.should.be.empty;
              response.should.have.status(204);
              done();
            });
        });
    });

    it('400s when contract does not exist', done => {
      chai.request(server)
        .delete('/v1/contracts/some-bad-contract-id')
        .set('X-Authorization', testGame.secretKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });

    it('400s when contract is not custom type', done => {
      chai.request(server)
        .delete(`/v1/contracts/${testCurrency.contract.id}`)
        .set('X-Authorization', testGame.secretKey)
        .end((error, response) => {
          helpers.logResponse(response);
          response.should.have.status(400);
          done();
        });
    });
  });
});
