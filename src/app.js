'use strict'

import dotenv from 'dotenv'
import Koa from 'koa'
import Router from '@koa/router'
import bodyparser from 'koa-bodyparser'
import AlgoIndexer from './network/algo-indexer.js'
import TokenRepository from './repository/token.repository.js'
import AssetNotFoundError from './error/asset-not-found.error.js'
import errorHandler from './middleware/error-handler.js'
import requestLogger from './middleware/request-logger.js'
import MissingParameterError from './error/missing-parameter.error.js'
import ApplicationStillRunningError from './error/application-still-running.error.js'
import IpfsRepository from './repository/ipfs.repository.js'
import S3Repository from './repository/s3.repository.js'

dotenv.config()
export const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
    ctx.body = 'terragrids api'
})

router.get('/hc', async (ctx) => {
    ctx.body = {
        env: process.env.ENV,
        region: process.env.AWS_REGION,
        ipfs: await new IpfsRepository().testConnection(),
        s3: await new S3Repository().testConnection()
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
                    .filter(balance => balance.amount > 0 && !balance.deleted)
                    .map(balance => ({
                        address: balance.address,
                        amount: balance.amount
                    })),
                ...contract && { contract }
            })
        }
    }
})

router.post('/terracells/:assetId/contracts/:applicationId', bodyparser(), async (ctx) => {
    if (!ctx.request.body.contractInfo) throw new MissingParameterError('contractInfo')
    if (!ctx.request.body.sellerAddress) throw new MissingParameterError('sellerAddress')
    if (!ctx.request.body.assetPrice) throw new MissingParameterError('assetPrice')
    if (!ctx.request.body.assetPriceUnit) throw new MissingParameterError('assetPriceUnit')

    const algoIndexer = new AlgoIndexer()
    const [assetResponse, appResponse] = await Promise.all([
        algoIndexer.callAlgonodeIndexerEndpoint(`assets/${ctx.params.assetId}`),
        algoIndexer.callAlgonodeIndexerEndpoint(`applications/${ctx.params.applicationId}`)
    ])

    if (assetResponse.status !== 200 || !assetResponse.json.asset || assetResponse.json.asset.params['unit-name'] !== 'TRCL') {
        throw new AssetNotFoundError()
    }

    let contractVerified = true
    if (appResponse.status !== 200 || appResponse.json.application.params['approval-program'] !== process.env.ALGO_APP_APPROVAL) {
        contractVerified = false
    }

    await new TokenRepository().putTokenContract({
        assetId: ctx.params.assetId,
        applicationId: ctx.params.applicationId,
        contractInfo: ctx.request.body.contractInfo,
        verified: contractVerified,
        sellerAddress: ctx.request.body.sellerAddress,
        assetPrice: ctx.request.body.assetPrice.toString(),
        assetPriceUnit: ctx.request.body.assetPriceUnit
    })

    ctx.body = { contractVerified }
    ctx.status = 201
})

router.delete('/terracells/:assetId/contracts/:applicationId', async (ctx) => {
    const algoIndexer = new AlgoIndexer()
    const [assetResponse, appResponse] = await Promise.all([
        algoIndexer.callAlgonodeIndexerEndpoint(`assets/${ctx.params.assetId}`),
        algoIndexer.callAlgonodeIndexerEndpoint(`applications/${ctx.params.applicationId}`)
    ])

    if (assetResponse.status !== 200 || !assetResponse.json.asset || assetResponse.json.asset.params['unit-name'] !== 'TRCL') {
        throw new AssetNotFoundError()
    }

    if (appResponse.status === 200 && appResponse.json.application.id === `${ctx.params.applicationId}`) {
        throw new ApplicationStillRunningError()
    }

    await new TokenRepository().deleteTokenContract(ctx.params.assetId)

    ctx.body = ''
    ctx.status = 204
})

router.get('/accounts/:accountId/terracells', async (ctx) => {
    const response = await new AlgoIndexer().callRandLabsIndexerEndpoint(`accounts/${ctx.params.accountId}/assets`)
    ctx.body = {
        assets: response.status !== 200 ? [] : response.json.assets
            .filter(asset => !asset.deleted && asset.amount === 1 && asset.decimals === 0 && asset['unit-name'] === 'TRCL')
            .map(asset => ({
                id: asset['asset-id'],
                name: asset.name,
                symbol: asset['unit-name']
            }))
    }
})

router.post('/ipfs/files', bodyparser(), async (ctx) => {
    if (!ctx.request.body.assetName) throw new MissingParameterError('assetName')
    if (!ctx.request.body.assetDescription) throw new MissingParameterError('assetDescription')
    if (!ctx.request.body.fileName) throw new MissingParameterError('fileName')

    const s3 = new S3Repository()
    const ipfs = new IpfsRepository()

    const s3Object = await s3.getFileReadStream(ctx.request.body.fileName)
    const resultFile = await ipfs.pinFile(s3Object.fileStream)
    const resultMeta = await ipfs.pinJson({
        assetName: ctx.request.body.assetName,
        assetDescription: ctx.request.body.assetDescription,
        fileIpfsHash: resultFile.IpfsHash,
        fileName: ctx.request.body.fileName,
        fileMimetype: s3Object.contentType
    })

    ctx.body = {
        assetName: resultMeta.assetName,
        url: `ipfs://${resultMeta.IpfsHash}`,
        integrity: resultMeta.integrity
    }
    ctx.status = 201
})

router.post('/files/upload', bodyparser(), async ctx => {
    if (!ctx.request.body.contentType) throw new MissingParameterError('contentType')
    const response = await new S3Repository().getUploadSignedUrl(ctx.request.body.contentType)
    ctx.body = {
        id: response.id,
        url: response.url
    }
    ctx.status = 201
})

app
    .use(requestLogger)
    .use(errorHandler)
    .use(router.routes())
    .use(router.allowedMethods())
