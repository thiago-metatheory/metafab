const ethers = require('ethers');
const helpers = require('../../../helpers');

const abiCoder = ethers.utils.defaultAbiCoder;

describe('Player Wallets', () => {
  /*
   * POST
   */

  describe('POST /v1/players/:playerId/wallets', () => {
    it('Should set connected wallet and allow same wallet to be connected to multiple accounts', async () => {
      const wallet = ethers.Wallet.createRandom();

      const connectWallet = async player => {
        const playerWalletAddress = player.wallet.custodialAddress || player.wallet.address;
        const nonce = Math.floor(Math.random() * 1000000000);
        const hash = ethers.utils.keccak256(abiCoder.encode(
          [ 'bytes32', 'address', 'bool', 'address', 'uint256' ],
          [ ethers.utils.id(testGame.id), playerWalletAddress, true, wallet.address, nonce ],
        ));

        const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

        const fields = {
          address: wallet.address,
          nonce,
          signature: signature,
          chain: 'LOCAL',
          forwarderAddress: testForwarder.address,
        };

        return new Promise(resolve => {
          chai.request(server)
            .post(`/v1/players/${player.id}/wallets`)
            .set('X-Authorization', player.accessToken)
            .send(fields)
            .end((error, response) => {
              helpers.logResponse(response);
              resolve(response.body);
            });
        });
      };

      const testWalletId = async (player, walletId) => {
        await new Promise(resolve => {
          chai.request(server)
            .get('/v1/players/auth')
            .set('X-Game-Key', testGame.publishedKey)
            .set('Authorization', `Basic ${btoa(`${player.username}:${player.password}`)}`)
            .end((error, response) => {
              helpers.logResponse(response);

              response.body.wallet.id.should.equal(walletId);
              resolve();
            });
        });

        await new Promise(resolve => {
          chai.request(server)
            .get(`/v1/players/${testPlayer.id}`)
            .end((error, response) => {
              helpers.logResponse(response);

              response.body.wallet.id.should.equal(walletId);
              resolve();
            });
        });
      };

      const walletId = (await connectWallet(testPlayer)).id;
      await connectWallet(testPlayerTwo);
      await testWalletId(testPlayer, walletId);
      await testWalletId(testPlayerTwo, walletId);
    });
  });

  describe('DELETE /v1/players/:playerId/wallets', () => {
    it('Should revert connected wallet to custodial wallet for player account', async () => {
      const wallet = ethers.Wallet.createRandom();

      // Set connected wallet
      const setPlayerWalletAddress = testPlayer.wallet.custodialAddress || testPlayer.wallet.address;
      const setNonce = 1234;
      const setHash = ethers.utils.keccak256(abiCoder.encode(
        [ 'bytes32', 'address', 'bool', 'address', 'uint256' ],
        [ ethers.utils.id(testGame.id), setPlayerWalletAddress, true, wallet.address, setNonce ],
      ));

      const setSignature = await wallet.signMessage(ethers.utils.arrayify(setHash));

      const setFields = {
        address: wallet.address,
        nonce: setNonce,
        signature: setSignature,
        chain: 'LOCAL',
        forwarderAddress: testForwarder.address,
      };

      const walletId = (await new Promise(resolve => {
        chai.request(server)
          .post(`/v1/players/${testPlayer.id}/wallets`)
          .set('X-Authorization', testPlayer.accessToken)
          .send(setFields)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve(response.body);
          });
      })).id;

      testPlayer.wallet.id.should.not.equal(walletId);

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${testPlayer.password}`)}`)
          .end((error, response) => {
            helpers.logResponse(response);

            response.body.wallet.id.should.equal(walletId);
            resolve();
          });
      });

      // Remove connected wallet
      const removePlayerWalletAddress = testPlayer.wallet.custodialAddress || testPlayer.wallet.address;
      const removeNonce = 1235;
      const removeHash = ethers.utils.keccak256(abiCoder.encode(
        [ 'bytes32', 'address', 'bool', 'address', 'uint256' ],
        [ ethers.utils.id(testGame.id), removePlayerWalletAddress, false, wallet.address, removeNonce ],
      ));

      const removeSignature = await wallet.signMessage(ethers.utils.arrayify(removeHash));

      const removeFields = {
        address: wallet.address,
        nonce: removeNonce,
        signature: removeSignature,
        chain: 'LOCAL',
        forwarderAddress: testForwarder.address,
      };

      await new Promise(resolve => {
        chai.request(server)
          .delete(`/v1/players/${testPlayer.id}/wallets/${walletId}`)
          .set('X-Authorization', testPlayer.accessToken)
          .send(removeFields)
          .end((error, response) => {
            helpers.logResponse(response);
            resolve();
          });
      });

      await new Promise(resolve => {
        chai.request(server)
          .get('/v1/players/auth')
          .set('X-Game-Key', testGame.publishedKey)
          .set('Authorization', `Basic ${btoa(`${testPlayer.username}:${testPlayer.password}`)}`)
          .end((error, response) => {
            helpers.logResponse(response);

            response.body.wallet.id.should.equal(testPlayer.wallet.custodialId || testPlayer.wallet.id);
            resolve();
          });
      });
    });
  });
});
