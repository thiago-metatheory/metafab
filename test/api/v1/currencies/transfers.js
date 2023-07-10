const helpers = require('../../../helpers');

describe('Currency Transfers', () => {
  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/transfers', () => {
    it('200s with transaction object for transfer to address', done => {
      const fields = {
        address: testPlayer.wallet.address,
        amount: 10,
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transfer');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for transfer to address using backwards compatible x-password for game', done => {
      const fields = {
        address: testPlayer.wallet.address,
        amount: 10,
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Password', testGame.password)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transfer');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for transfer with reference to address of provided wallet id', done => {
      const fields = {
        walletId: testPlayer.wallet.id,
        amount: 20,
        reference: 123,
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 50,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithRef');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for player that has token balance to cover transaction', done => {
      const fields = {
        walletId: testGame.wallet.id,
        amount: 30,
      };

      helpers.mintTestCurrency({
        address: testPlayerWithToken.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testPlayerWithToken.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayerWithToken.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithFee');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for player gasless transfer', done => {
      const fields = {
        walletId: testGame.wallet.id,
        amount: 30,
      };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithFee');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for player gasless transfer using backwards compatible x-password for player', done => {
      const fields = {
        walletId: testGame.wallet.id,
        amount: 30,
      };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Password', testPlayer.password)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithFee');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction object for player gasless transfer with reference', done => {
      const fields = {
        walletId: testGame.wallet.id,
        amount: 51,
        reference: 36183,
      };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'transferWithFeeRef');
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, fields.amount);
            done();
          });
      });
    });

    it('200s with transaction objects for multiple player gasless transfers in parallel execution', async () => {
      await helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100000,
      });

      const transferRequests = [];

      for (let i = 0; i < 3; i++) {
        transferRequests.push(
          chai.request(server)
            .post(`/v1/currencies/${testCurrency.id}/transfers`)
            .set('X-Authorization', testPlayer.accessToken)
            .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
            .send({
              walletId: testGame.wallet.id,
              amount: i + 0.5,
            }),
        );
      }

      const results = (await Promise.all(transferRequests)).map(r => r.body);

      results.forEach(result => {
        result.id.should.be.a('string');
      });
    });

    it('200s with transaction objects for multiple player gasless transfers in near parallel execution', async () => {
      await helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100000,
      });

      const transferRequests = [];

      for (let i = 0; i < 10; i++) {
        transferRequests.push(
          new Promise(resolve => {
            chai.request(server)
              .post(`/v1/currencies/${testCurrency.id}/transfers`)
              .set('X-Authorization', testPlayer.accessToken)
              .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
              .send({
                walletId: testGame.wallet.id,
                amount: i + 0.5,
              })
              .end((error, response) => {
                helpers.logResponse(response);
                resolve(response);
              });
          }),
        );

        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 750)));
      }

      const results = (await Promise.all(transferRequests)).map(r => r.body);

      results.forEach(result => {
        result.id.should.be.a('string');
      });
    });

    it('400s when provided invalid address', done => {
      const fields = {
        address: 'wrong',
        amount: 10,
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
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

    it('400s when provided invalid walletId', done => {
      const fields = {
        walletId: '1284-huafhw',
        amount: 10,
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
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

    it('400s when batch argument lengths mismatch', done => {
      const fields = {
        batchAddresses: [ testPlayer.wallet.address, testPlayerTwo.wallet.address ],
        batchAmounts: [ 11, 31, 24 ],
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/transfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            response.should.have.status(400);
            done();
          });
      });
    });
  });
});
