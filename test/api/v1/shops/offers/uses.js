const ethers = require('ethers');
const helpers = require('../../../../helpers');

describe('Shop Offer Uses', () => {
  /*
   * POST
   */

  describe('POST /v1/shops/:shopId/offers/:shopOfferId/uses', () => {
    it('200s with transaction object and uses offer that requires erc20 currency', async () => {
      // give player token
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            amount: 100,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mint');
            resolve();
          });
      });

      // allow shop to mint items, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOffer');
            resolve();
          });
      });

      // get item balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body['1'].should.equal('1');
            resolve();
          });
      });

      // check offer uses
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.id.should.equal(`${testShopOffer.id}`);
            resolve();
          });
      });
    });

    it('200s with transaction object and multi uses offer that requires erc20 currency', async () => {
      // give player token
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            amount: 200,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mint');
            resolve();
          });
      });

      // allow shop to mint items, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send({ times: 2 })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOfferMulti');
            resolve();
          });
      });

      // get item balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body['1'].should.equal('2');
            resolve();
          });
      });

      // check offer uses
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/shops/${testShop.id}/offers/${testShopOffer.id}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.id.should.equal(`${testShopOffer.id}`);
            response.body.uses.should.equal('2');
            resolve();
          });
      });
    });

    it('200s with transaction object and uses offer that requires erc1155 item', async () => {
      const testOffer = {
        id: 2,
        inputCollectionId: testCollection.id,
        inputCollectionItemIds: [ 1 ],
        inputCollectionItemAmounts: [ 1 ],
        outputCurrencyId: testCurrency.id,
        outputCurrencyAmount: 15,
      };

      // create new offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(testOffer)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      // give player item
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/1/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            quantity: 1,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mintToAddress');
            resolve();
          });
      });

      // allow shop to mint currency, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOffer');
            resolve();
          });
      });

      // get item balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body['1'].should.equal('0');
            resolve();
          });
      });

      // get token balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body.should.equal('15.0');
            resolve();
          });
      });
    });

    it('200s with transaction object and multi uses offer that requires erc1155 item', async () => {
      const testOffer = {
        id: 2,
        inputCollectionId: testCollection.id,
        inputCollectionItemIds: [ 1 ],
        inputCollectionItemAmounts: [ 1 ],
        outputCurrencyId: testCurrency.id,
        outputCurrencyAmount: 15,
      };

      // create new offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(testOffer)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      // give player item
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/collections/${testCollection.id}/items/1/mints`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            address: testPlayer.wallet.address,
            quantity: 2,
          }).end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'mintToAddress');
            resolve();
          });
      });

      // allow shop to mint currency, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send({ times: 2 })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOfferMulti');
            resolve();
          });
      });

      // get item balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body['1'].should.equal('0');
            resolve();
          });
      });

      // get token balances
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayer.wallet.address}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body.should.equal('30.0'); // 15 * 2
            resolve();
          });
      });
    });

    it('200s with transaction object and uses offer that required native chain token', async () => {
      const testOffer = {
        id: 2,
        inputCurrencyAmount: 0.2,
        outputCurrencyId: testCurrency.id,
        outputCurrencyAmount: 15,
      };

      // create new offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(testOffer)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      // allow shop to mint currency, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer as game
      const gamePreUseBalance = await testEthersWallet.provider.getBalance(testGame.wallet.address);

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOffer');
            resolve();
          });
      });

      const gamePostUseBalance = await testEthersWallet.provider.getBalance(testGame.wallet.address);
      gamePostUseBalance.add(ethers.utils.parseUnits(`${testOffer.inputCurrencyAmount}`)).lt(gamePreUseBalance).should.equal(true);

      // use offer as player
      const testPlayerWalletAddress = testPlayer.wallet.custodialAddress || testPlayer.wallet.address;

      await (await testEthersWallet.sendTransaction({
        to: testPlayerWalletAddress,
        value: ethers.utils.parseEther('1.0'),
      })).wait();

      const playerPreUseBalance = await testEthersWallet.provider.getBalance(testPlayerWalletAddress);

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOffer');
            resolve();
          });
      });

      const playerPostUseBalance = await testEthersWallet.provider.getBalance(testPlayerWalletAddress);
      playerPostUseBalance.add(ethers.utils.parseUnits(`${testOffer.inputCurrencyAmount}`)).lt(playerPreUseBalance).should.equal(true);

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayerWalletAddress}`)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });
    });

    it('200s with transaction object and multi uses offer that required native chain token', async () => {
      const testOffer = {
        id: 2,
        inputCurrencyAmount: 0.2,
        outputCurrencyId: testCurrency.id,
        outputCurrencyAmount: 15,
      };

      // create new offer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send(testOffer)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      // allow shop to mint currency, not just transfer
      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/currencies/${testCurrency.id}/roles`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .send({
            role: 'minter',
            address: testShop.contract.address,
          })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'grantRole');
            resolve();
          });
      });

      // use offer as game
      const gamePreUseBalance = await testEthersWallet.provider.getBalance(testGame.wallet.address);

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testGame.secretKey)
          .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOffer');
            resolve();
          });
      });

      const gamePostUseBalance = await testEthersWallet.provider.getBalance(testGame.wallet.address);
      gamePostUseBalance.add(ethers.utils.parseUnits(`${testOffer.inputCurrencyAmount}`)).lt(gamePreUseBalance).should.equal(true);

      // use offer as player
      const testPlayerWalletAddress = testPlayer.wallet.custodialAddress || testPlayer.wallet.address;

      await (await testEthersWallet.sendTransaction({
        to: testPlayerWalletAddress,
        value: ethers.utils.parseEther('1.0'),
      })).wait();

      const playerPreUseBalance = await testEthersWallet.provider.getBalance(testPlayerWalletAddress);

      await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/shops/${testShop.id}/offers/${testOffer.id}/uses`)
          .set('X-Authorization', testPlayer.accessToken)
          .set('X-Wallet-Decrypt-Key', testPlayer.walletDecryptKey)
          .send({ times: 2 })
          .end((error, response) => {
            helpers.logResponse(response);
            helpers.testTransactionResponse(response, 'useOfferMulti');
            resolve();
          });
      });

      const playerPostUseBalance = await testEthersWallet.provider.getBalance(testPlayerWalletAddress);
      playerPostUseBalance.add(ethers.utils.parseUnits(`${testOffer.inputCurrencyAmount}`)).lt(playerPreUseBalance).should.equal(true);

      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/currencies/${testCurrency.id}/balances?address=${testPlayerWalletAddress}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.body.should.equal('30.0');
            resolve();
          });
      });
    });
  });
});
