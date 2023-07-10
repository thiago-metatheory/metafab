const helpers = require('../../../helpers');

describe('Currency Batch Transfers', () => {
  /*
   * POST
   */

  describe('POST /v1/currencies/:currencyId/batchTransfers', () => {
    it('200s with transaction object for batch transfer to addresses', done => {
      const fields = {
        addresses: [ testPlayer.wallet.address, testPlayerTwo.wallet.address ],
        amounts: [ 11, 31 ],
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/batchTransfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'batchTransfer');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, fields.amounts[0]);
            await helpers.testAddressCurrencyBalance(testPlayerTwo.wallet.address, fields.amounts[1]);
            done();
          });
      });
    });

    it('200s with transaction object for batch transfer to walletIds with references', done => {
      const fields = {
        walletIds: [ testPlayer.wallet.id, testPlayerTwo.wallet.id ],
        amounts: [ 22, 44 ],
        references: [ 101, 102 ],
      };

      helpers.mintTestCurrency({
        address: testGame.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/batchTransfers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'batchTransferWithRefs');
            await helpers.testAddressCurrencyBalance(testPlayer.wallet.address, fields.amounts[0]);
            await helpers.testAddressCurrencyBalance(testPlayerTwo.wallet.address, fields.amounts[1]);
            done();
          });
      });
    });

    it('200s with transaction object for gasless batch transfer to addresses', done => {
      const fields = {
        addresses: [ testPlayerTwo.wallet.address, testGame.wallet.address ],
        amounts: [ 63, 19 ],
      };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/batchTransfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'batchTransferWithFees');
            await helpers.testAddressCurrencyBalance(fields.addresses[0], fields.amounts[0]);
            await helpers.testAddressCurrencyBalance(fields.addresses[1], fields.amounts[1]);
            done();
          });
      });
    });

    it('200s with transaction object for gasless batch transfer to walletIds with references', done => {
      const fields = {
        walletIds: [ testPlayerTwo.wallet.id, testGame.wallet.id ],
        amounts: [ 22, 44 ],
        references: [ 101, 102 ],
      };

      helpers.mintTestCurrency({
        address: testPlayer.wallet.address,
        amount: 100,
      }).then(() => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/batchTransfers`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send(fields)
          .end(async (error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'batchTransferWithFeesRefs');
            await helpers.testAddressCurrencyBalance(testPlayerTwo.wallet.address, fields.amounts[0]);
            await helpers.testAddressCurrencyBalance(testGame.wallet.address, fields.amounts[1]);
            done();
          });
      });
    });
  });
});
