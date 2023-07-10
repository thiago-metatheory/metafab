const fs = require('fs');
const helpers = require('../../../helpers');

describe('Collection Items', () => {
  /*
   * GET
   */

  describe('GET /v1/collections/:collectionId/items', () => {
    it('200s with an array of created collection item metadata or metadata for provided collectionItemId', async () => {
      const itemOne = {
        id: 531,
        name: 'Warg Belt',
        description: 'Some belt or something',
        imageUrl: 'https://picsum.photos/id/237/200/300',
      };

      const itemTwo = {
        id: 231,
        name: 'Gold Ingot',
        description: 'An ingot, that is gold.',
        imageUrl: 'https://picsum.photos/id/237/200/300',
      };

      const itemIds = [ itemOne.id, itemTwo.id ];

      const createItem = async fields => {
        return new Promise(resolve => {
          chai.request(server)
            .post(`/v1/collections/${testCollection.id}/items`)
            .set('X-Authorization', testGame.secretKey)
            .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
            .send(fields)
            .end((error, response) => {
              response.should.have.status(200);
              resolve();
            });
        });
      };

      await createItem(itemOne);
      await createItem(itemTwo);
      await helpers.batchMintTestCollectionItems({
        address: testPlayer.wallet.address,
        itemIds,
        quantities: [ 1, 1 ],
      });

      // get all metadata
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/items`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('array');
            response.body.forEach(metadata => {
              [ 1, ...itemIds ].includes(metadata.id).should.equal(true); // account for test collection item id from _setup.js.
              metadata.should.have.property('id');
              metadata.should.have.property('image');
              metadata.should.have.property('name');
              metadata.should.have.property('description');
            });
            resolve();
          });
      });

      // get single item metadata
      await new Promise(resolve => {
        chai.request(server)
          .get(`/v1/collections/${testCollection.id}/items/${itemOne.id}`)
          .end((error, response) => {
            helpers.logResponse(response);
            response.should.have.status(200);
            response.body.should.be.an('object');
            response.body.id.should.equal(itemOne.id);
            response.body.should.have.property('id');
            response.body.should.have.property('image');
            response.body.should.have.property('name');
            response.body.should.have.property('description');
            resolve();
          });
      });
    });
  });

  /*
   * POST
   */

  describe('POST /v1/collections/:collectionId/items', () => {
    it('200s with transaction object and sets item metadata URI', done => {
      const fields = {
        id: 11,
        name: 'Dog Companion',
        imageUrl: 'https://picsum.photos/id/237/200/300',
        description: 'An animal companion',
        attributes: [
          { trait_type: 'attack', value: 100 },
        ],
        data: {
          modelUrl: 'https://somecdn.com/model.obj',
        },
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/items`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);

          chai.request(server)
            .get(`/v1/collections/${testCollection.id}/items/${fields.id}`)
            .end((error, response) => {
              helpers.logResponse(response);
              response.body.data.modelUrl.should.equal(fields.data.modelUrl);
              done();
            });
        });
    });

    it('200s with transaction object, uploads image and metadata to ipfs, sets item metadata URI', done => {
      const fields = {
        id: 5,
        name: 'Bow',
        imageBase64: fs.readFileSync('test/assets/item.png').toString('base64'),
        description: 'A powerful bow',
        attributes: [
          { trait_type: 'attack', value: 100 },
        ],
        data: {
          modelUrl: 'https://somecdn.com/model.obj',
        },
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/items`)
        .set('X-Authorization', testGame.secretKey)
        .set('X-Wallet-Decrypt-Key', testGame.walletDecryptKey)
        .send(fields)
        .end((error, response) => {
          helpers.logResponse(response);
          helpers.testTransactionResponse(response, 'setItemURI');
          done();
        });
    });

    it('400s if provided unsupported file type', done => {
      const fields = {
        id: 7,
        name: 'Mega Paper',
        imageBase64: fs.readFileSync('test/assets/text.txt').toString('base64'),
        description: 'A big thing of digital paper.',
      };

      chai.request(server)
        .post(`/v1/collections/${testCollection.id}/items`)
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
