'use strict'

import dotenv from 'dotenv'
import Koa from 'koa'
import Router from '@koa/router'
import AlgoIndexer from './network/algo-indexer.js'
import TokenRepository from './repository/token.repository.js'
import AssetNotFoundError from './error/asset-not-found.error.js'
import errorHandler from './middleware/error-handler.js'
import requestLogger from './middleware/request-logger.js'

dotenv.config()
export const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
    ctx.body = 'terragrids api'
})

router.get('/hc', (ctx) => {
    ctx.body = {
        env: process.env.ENV,
        region: process.env.AWS_REGION
    }
})

router.get('/terracells', async (ctx) => {
    const response = await new AlgoIndexer().callRandLabsIndexerEndpoint('assets?unit=TRCL')
    ctx.body = {
        assets: response.json.assets
            .filter(asset => !asset.deleted && asset.params.total === 1 && asset.params.decimals === 0)
            .map(asset => ({
                id: asset.index,
                name: asset.params.name,
                symbol: asset.params['unit-name'],
                url: asset.params.url
            }))
    }
})

router.get('/terracells/:assetId', async (ctx) => {
    const algoIndexer = new AlgoIndexer()
    const [assetResponse, balancesResponse, contract] = await Promise.all([
        algoIndexer.callAlgonodeIndexerEndpoint(`assets/${ctx.params.assetId}`),
        algoIndexer.callAlgonodeIndexerEndpoint(`assets/${ctx.params.assetId}/balances`),
        new TokenRepository().getTokenContract(ctx.params.assetId)
    ])

    if (!assetResponse || assetResponse.status !== 200 || assetResponse.json.asset.params['unit-name'] !== 'TRCL') {
        throw new AssetNotFoundError()
    } else {
        const asset = assetResponse.json.asset
        const balances = balancesResponse.json.balances
        ctx.body = {
            asset: ({
                id: asset.index,
                name: asset.params.name,
                symbol: asset.params['unit-name'],
                url: asset.params.url,
                holders: balances
                    .filter(balance => balance.amount > 0)
                    .map(balance => ({
                        address: balance.address,
                        amount: balance.amount
                    })),
                ...contract && { contract }
            })
        }
    }
})

app
    .use(requestLogger)
    .use(errorHandler)
    .use(router.routes())
    .use(router.allowedMethods())