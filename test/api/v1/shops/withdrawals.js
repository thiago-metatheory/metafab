const ethers = require('ethers');
const helpers = require('../../../helpers');

describe('Shop Withdrawals', () => {
  /*
   * POST
   */

  describe('POST /v1/shops/:shopId/withdrawals', () => {
    it('200s with transaction object and withdraws native token', async () => {
      await (await testEthersWallet.sendTransaction({
        to: testShop.contract.address,
        value: ethers.utils.parseEther('10.0'),
      })).wait();

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/withdrawals`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({ address: testPlayer.wallet.address })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'withdrawTo');
            resolve();
          });
      });
    });

    it('200s with transaction object and withdraws currency (ERC20)', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testShop.contract.address,
            amount: '500',
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mint');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/withdrawals`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            currencyId: testCurrency.id,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'withdrawCurrencyTo');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body.should.equal('500.0');
            resolve();
          });
      });
    });

    it('200s with transaction object and withdraws collection (ERC1155) items', async () => {
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/batchMints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            itemIds: [ 1, 5 ],
            quantities: [ 2, 2 ],
            walletId: testPlayer.wallet.id,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mintBatchToAddress');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/withdrawals`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            collectionId: testCollection.id,
            itemIds: [ 1, 5 ],
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'withdrawItemsTo');
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body['1'].should.equal('2');
            response.body['5'].should.equal('2');
            resolve();
          });
      });
    });
  });
});
