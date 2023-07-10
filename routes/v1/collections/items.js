/*
 * Route: /collections/:collectionId/items
 */

const fileType = require('file-type');
const contractUtils = rootRequire('/libs/contractUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const ipfsUtils = rootRequire('/libs/ipfsUtils');
const metadataUtils = rootRequire('/libs/metadataUtils');
const gameSecretKeyAuthorize = rootRequire('/middlewares/games/secretKeyAuthorize');
const gameDecryptWallet = rootRequire('/middlewares/games/decryptWallet');

const router = express.Router({
  mergeParams: true,
});

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items:
 *    get:
 *      operationId: getCollectionItems
 *      summary: Get collection items
 *      description:
 *        Returns all collection items as an array of metadata objects.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved collection items metadata.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/CollectionItem'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { collectionId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const itemUris = await connectedContractInstance.allItemURIs();

  const metadatas = [];

  for (let i = 0; i < itemUris.length; i++) {
    metadatas.push(await metadataUtils.getMetadata(itemUris[i]));
  }

  response.success(metadatas);
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items/{collectionItemId}:
 *    get:
 *      operationId: getCollectionItem
 *      summary: Get collection item
 *      description:
 *        Returns a metadata object for the provided collectionItemId.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/pathCollectionItemId'
 *      responses:
 *        200:
 *          description:
 *            Successfully retrieved collection item metadata.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/CollectionItem'
 *        400:
 *          $ref: '#/components/responses/400'
 */

router.get('/:collectionItemId', asyncMiddleware(async (request, response) => {
  const { collectionId, collectionItemId } = request.params;

  const connectedContractInstance = await contractUtils.getConnectedContractInstanceFromModel(
    'collection',
    collectionId,
  );

  const itemUri = await connectedContractInstance.uri(collectionItemId);
  const metadata = await metadataUtils.getMetadata(itemUri);

  response.success(metadata);
}));

/**
 *  @openapi
 *  /v1/collections/{collectionId}/items:
 *    post:
 *      operationId: createCollectionItem
 *      summary: Create collection item
 *      description:
 *        Creates a new item type. Item type creation associates all of the relevant
 *        item data to a specific itemId. Such as item name, image, description, attributes,
 *        any arbitrary data such as 2D or 3D model resolver URLs, and more. It is recommended,
 *        but not required, that you create a new item type through this endpoint before
 *        minting any quantity of the related itemId.
 *
 *
 *        Any itemId provided will have its existing item type overriden
 *        if it already exists.
 *
 *
 *        Item type data is uploaded to, and resolved through IPFS for decentralized
 *        persistence.
 *      tags:
 *        - Items
 *      parameters:
 *        - $ref: '#/components/parameters/pathCollectionId'
 *        - $ref: '#/components/parameters/headerAuthorizationGame'
 *        - $ref: '#/components/parameters/headerWalletDecryptKeyGame'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description:
 *                    A unique itemId to use for this item within the collection.
 *                    If an existing itemId is used, the current metadata will be
 *                    overriden. Any number may be used.
 *
 *
 *                    The terms `itemId` and `collectionItemId` are used interchangeably
 *                    and equivalent to one another throughout MetaFab documentation.
 *                  example: 1337
 *                name:
 *                  type: string
 *                  description: The name of this item.
 *                  example: Fire Dagger
 *                description:
 *                  type: string
 *                  description:
 *                    A text description of this item. This is a great spot to
 *                    include lore, game mechanics and more related to this item.
 *                imageBase64:
 *                  type: string
 *                  format: byte
 *                  description:
 *                    A base64 string of the image for this item. Either `imageBase64`
 *                    or `imageUrl` must be provided. Supported image formats are
 *                    `jpg`, `jpeg`, `png`, `gif`. Recommended size of 1:1 aspect
 *                    ratio and no more than 1500x1500 pixels.
 *                  example: iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ1IDc5LjE2MzQ5OSwgMjAxOC8wOC8xMy0xNjo0MDoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjMjliZTNkYy03YWU1LTQyNDItYTJkZS1kOTczYmVmNjE5MGYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NUQzRkUwRkQwMTRCMTFFQzlCRDhDRkU3MTJBRERFQzYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NUQzRkUwRkMwMTRCMTFFQzlCRDhDRkU3MTJBRERFQzYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6YzliNTI0MTgtMjAwZi03OTQ2LTljZGMtNDZkZmY1M2UzNzUxIiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6OWE1NWVkMGMtNTg2Ny1mODQ5LWI0NDktMzBmM2E0ZDRlODY4Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+AtOGKQAAAhpJREFUeNpidDPWZaAlYKKRufcvX4MwWEjSduHKNQMdLVxmQYCiLooCFuKNBpIQ09FMXDJJ9MqVX+fOvweyX71iuACWhVvDQqTpLc2euybtuwjWfOMO05ltwm+ffbtw/PP5Bwwxea+RQxtotENyzoG5UyBcRoKRDDQ9Nlrt4a6HK4/93jmHE2jo028Mu05DjXv355+xoQ6yemTTifUB0PTkdNEFXZ+B4QA0GmwoNAQUUVWimQ4EzMpS4niM3nX2soiM/J3v/9dufyHM8gNoOjAEpCTFsCoOaZ+0rbuRhGQKNN3e3v7Dh/ev37wBhgPEdFyKgaavqczDFGfBYzo/P/+DBw8/fvwIiSc8pldu3t/u60hCRoO4XUBA8OHDBwRTAR7TsfgAkt7l5RUuXLgAdzvZpqP7AJIi7UTZv339QhXTUSyA5CZIivz37i1B05ecvETQdHQfAPMqMDc9e/k5wpLh7Pkr+E2PMdcjoTSFlGIXX/0E5lVIbkLLn+SZjohkeBkJLAnwp/edZy65m+gRXwAzIZe6wFIMWM4ASwJqmY4eB8AyEk/gAEOGVNPRLQCWwFQJd5wWbN37mbqmo1sArI8wIwCYm8g2HWEBMIaBNd+Fh+gRQExeJdYHwHoVswSm0HQUCyC1NsHynTrtImqZjmIBMIbh9Sq1TEdpawBjGK3FQf2mI9VNh7aL7qO2xagLWGhnNG1b13AAEGAAXoMjTB7v7GQAAAAASUVORK5CYII=
 *                imageUrl:
 *                  type: string
 *                  format: uri
 *                  description:
 *                    An external url that resolves to an image to use for this item.
 *                    This can also be set to an ipfs:// uri. Recommended size of
 *                    1:1 aspect ratio and no more than 1500x1500 pixels.
 *                  example: https://mycdn.mygame.com/example/item1.gif
 *                externalUrl:
 *                  type: string
 *                  format: uri
 *                  description:
 *                    An optional URL where players can go to learn more about
 *                    this item specifically, or your game, or any other link.
 *                attributes:
 *                  type: array
 *                  description:
 *                    An array of objects that conform with the [metadata attributes standard that can
 *                    be found here](https://docs.opensea.io/docs/metadata-standards#attributes)
 *                  items:
 *                    type: object
 *                    properties:
 *                      trait_type:
 *                        type: string
 *                        example: Attack Power
 *                      value:
 *                        example: 100
 *                    required:
 *                      - trait_type
 *                      - value
 *                data:
 *                  type: object
 *                  description:
 *                    An arbitrary object of data attached to the top level
 *                    metadata object. This is useful for including data or resource
 *                    URLs specific to your game. Such as URLs that point to 3D models,
 *                    music files, bitmaps, or anything else you need to reference.
 *              required:
 *                - id
 *                - name
 *                - description
 *      responses:
 *        200:
 *          description:
 *            Successfully created a new item type and assigned it to the provided
 *            item `id`. Returns a transaction object.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/TransactionModel'
 *        400:
 *          $ref: '#/components/responses/400'
 *        401:
 *          $ref: '#/components/responses/401'
 */

router.post('/', gameSecretKeyAuthorize);
router.post('/', gameDecryptWallet);
router.post('/', asyncMiddleware(async (request, response) => {
  const { wallet, walletSigner } = request;
  const { collectionId } = request.params;
  const { id, name, description, imageBase64, externalUrl, attributes, data } = request.body;
  let { imageUrl } = request.body;

  if (id === undefined || !name || !description) {
    throw new Error('id, name and description must be provided.');
  }

  if (!imageBase64 && !imageUrl) {
    throw new Error('An image or imageUrl must be provided.');
  }

  if (attributes && !Array.isArray(attributes)) {
    throw new Error('attributes must be an array of objects');
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: {
      contract: {
        select: { id: true },
      },
    },
  });

  if (!collection) {
    throw new Error('Invalid collectionId provided.');
  }

  if (imageBase64) {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const mimeInfo = await fileType.fromBuffer(imageBuffer);

    if (!mimeInfo || ![ 'image/jpg', 'image/jpeg', 'image/gif', 'image/png', 'image/webp' ].includes(mimeInfo.mime)) {
      throw new Error('Invalid image file type. Only jpeg, gif, png and webp are supported.');
    }

    const imageIpfsHash = await ipfsUtils.pinFile(imageBuffer, mimeInfo.ext);

    imageUrl = `ipfs://${imageIpfsHash}`;
  }

  const metadataUrl = await metadataUtils.pinMetadata({
    id,
    imageUrl,
    name,
    description,
    externalUrl,
    attributes,
    data,
  });

  const transaction = await transactionUtils.executeTransaction({
    contractId: collection.contract.id,
    wallet,
    walletSigner,
    func: 'setItemURI',
    args: [ id, metadataUrl ],
  });

  response.success(transaction);
}));

/*
 * Export
 */

module.exports = router;
