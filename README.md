# MetaFab API

The core API that powers all of MetaFab's services. 

If you just want to use MetaFab, you can use our hosted version here: https://docs.trymetafab.com/docs

MetaFab currently runs on top of AWS. The stack is primarily node.js, [prisma (MySQL orm)](https://www.prisma.io/), Redis, ethers.js

## Local Quickstart

Follow these steps to get the API up and running locally

### Setup
1. Use `nvm` or equivalent to install Node version 16.0.0+ locally.
2. `git clone --recurse-submodules` this repo.
3. `cd` into the repo folder, run `npm install`
4. Follow this guide to install Redis locally if you don't already have it: https://redis.io/docs/getting-started/installation/
5. Install MySQL 5.7 locally, we use Amazon Aurora in production which uses MySQL 5.7. Guide can be found here: https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/
6. Make sure your local MySQL server is running, `cd` into the root folder of our API and run `npx prisma migrate dev` to create a local MetaFab database & all necessary tables.
7. Create a local `.env` file. You can just copy `.env.sample` for local development quickstart.

### Run
1. In a terminal window, start a local redis server by running `redis-server`.
2. In another terminal window, start a local ethereum environment by `cd` into the root folder of our API repo and running `npx hardhat node`
3. In another terminal window, start the api by `cd` into the root folder of our API repo and running `npm run dev`

### Test
Once you have an environment up and running locally, you can run the entire test suite located in `test/` by `cd` into the root folder of our API repo and running `npm test`

## Production Deployments & Development Considerations

Any commits merged into the `master` branch will automatically trigger a deployment to production. The master branch is guarded and can only be committed directly to, or have PR's approved by a specific set of individuals within the team. 

It is expected that any typical feature development is done on it's own branch and merged into master once completed and approved.

## OpenAPI Spec & SDK Generation / Deployments

MetaFab's development pattern has been setup such that each API endpoint within the codebase that is intended to be publicly exposed for developer consumption is documented according to the OpenAPI 3.0 spec. You can see examples of this by looking at nearly every route file in the `routes/` folder.

This pattern allows us to retain clear endpoint purpose documentation within our own internal development environment, quality control and check that API endpoints are build to meet their intended purpose, generate OpenAPI 3.0 spec and auto update our docs.trymetafab.com website, and auto-generate SDKs for all our supported platforms.

### Spec File Generation

The OpenAPI spec file is saved to the `openapi/spec/` directory. You can generate the OpenAPI spec at any time using `npm run generate-openapi-spec`

### SDK Generation

You can generate an updated version matching the latest API spec using `npm run generate-openapi-sdks`. This will automatically generate SDKs for all of our supported platforms to the `openapi/sdks/` directory for each respective platform. 
