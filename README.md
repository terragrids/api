# api
API layer used to access off-chain storage and as a proxy to the Algorand indexer API.

## Documentation
The Terragrids public API documentation is [here](https://www.postman.com/terragrids/workspace/terragrids/documentation/83746-4aaa6130-7f9d-47b2-aa19-d6cd9b181266).

## System Overview
The Terragrids API is a [Koa](https://koajs.com/) application running on Node.js.

For every commit on the `dev` or `master` branch, GitHub Actions workflows build the application and deploy it to a multi-region AWS Lambda running in `eu-west-3` and `us-west-1`.

`dev` builds will be accesible at `https://dev-api.terragrids.org`, while `master` builds will be accesible at `https://api.terragrids.org` through and AWS API Gateway.

## Prerequisites
To start with the development, you need to have a recent version of `node` and `npm` installed.

Also, make sure you follow the DynamoDB local instance setup [here](https://github.com/terragrids/db-scripts).

## Run a local instance
Make a copy of `.env.ref` in in the project root and rename it as `.env`. 

Ask the project maintainers to securely share with you the missing secrets to access remote resources.

Then run:
```
npm run start
```
and test that the instance is working:
```
curl http://localhost:3003/hc
```
To run the tests:
```
npm test
```
## Make contributions
To make contributions, check out the `dev` branch, crate a personal branch and push your commits. When you are ready, open a Pull Request on the `dev` branch.

**Dev rules**
1. If possible, please use Visual Code to write changes and make contributions to the repository. This will ensure code standard consistency.
2. Make small Pull Requests. This will ensure other developers and project maintainers can review your changes and give feedback as quickly as possible. 
3. Never make a Pull Request on `master`. The `master` branch is regularly updated with `dev` only by project maintainers. 
