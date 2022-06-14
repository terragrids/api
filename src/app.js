'use strict'

import dotenv from 'dotenv'
import Koa from 'koa'
import Router from '@koa/router'
import AlgoIndexer from './algo-indexer.js'

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
        assets: response.assets
            .filter(asset => !asset.deleted && asset.params.total === 1 && asset.params.decimals === 0)
            .map(asset => ({
                id: asset.index,
                name: asset.params.name,
                symbol: asset.params['unit-name'],
                url: asset.params.url
            }))
    }
})

app
    .use(router.routes())
    .use(router.allowedMethods())