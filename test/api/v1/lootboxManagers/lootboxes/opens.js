const ethers = require('ethers');
const helpers = require('../../../../helpers');

describe('Lootbox Manager Lootbox Opens', () => {
  /*
   * POST
   */

  describe('POST /v1/lootboxManagers/:lootboxManagerId/lootboxes/:lootboxManagerLootboxId/opens', () => {
    it('200s with transaction objects and opens lootbox that requires erc155 item', async () => {
      // give player lootbox item
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/55/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            quantity: 5,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mintToAddress');
            resolve();
          });
      });

      // allow lootbox to mint items, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testLootboxManager.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // open lootbox
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes/${testLootboxManagerLootbox.id}/opens`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body[0].function.should.equal('openLootbox');
            response.body[1].function.should.equal('claimLootboxes');
            resolve();
          });

        setTimeout(async () => {
          await testEthersWallet.provider.send('evm_mine');
          await new Promise(resolve => setTimeout(resolve, 1500));
          await testEthersWallet.provider.send('evm_mine');
          await new Promise(resolve => setTimeout(resolve, 1500));
          await testEthersWallet.provider.send('evm_mine');
        }, 1000);
      });

      // get item balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            Object.keys(response.body).length.should.equal(3);
            resolve();
          });
      });
    });

    it('200s with transaction objects and opens multiple lootboxes in parallel', async () => {
      // give player lootbox item
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/55/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            quantity: 5,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mintToAddress');
            resolve();
          });
      });

      // allow lootbox to mint items, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testLootboxManager.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // setup block mining..
      setTimeout(async () => {
        await testEthersWallet.provider.send('evm_mine');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await testEthersWallet.provider.send('evm_mine');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await testEthersWallet.provider.send('evm_mine');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await testEthersWallet.provider.send('evm_mine');
      }, 1500);

      // open lootboxes
      await Promise.all([
        new Promise(resolve => {
          chai.request(server)
            .post(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes/${testLootboxManagerLootbox.id}/opens`)
            .set('X-Authorization', testPlayer.accessToken)
            .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
            .end((error, response) => {
              helpers.logResponse(response);
              response.body[0].function.should.equal('openLootbox');
              response.body[1].function.should.equal('claimLootboxes');
              resolve();
            });
        }),
        new Promise(resolve => {
          setTimeout(() => {
            chai.request(server)
              .post(`/v1/lootboxManagers/${testLootboxManager.id}/lootboxes/${testLootboxManagerLootbox.id}/opens`)
              .set('X-Authorization', testPlayer.accessToken)
              .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
              .end((error, response) => {
                helpers.logResponse(response);
                response.body[0].function.should.equal('openLootbox');
                response.body[1].function.should.equal('claimLootboxes');
                resolve();
              });
          }, 1500);
        }),
      ]);
    });
  });
});
