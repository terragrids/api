import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import { TRCL } from '../utils/assets.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class TokenRepository extends DynamoDbRepository {
    pkTokenPrefix = 'asset'
    pkSolarPowerPlantPrefix = 'spp'
    itemName = 'token'

    async putTrclToken({ assetId, symbol, offchainUrl, power }) {
        const params = {
            TransactItems: [
                this.getUpdateCountersTnxCommand({
                    key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                    counters: [{
                        name: 'powerCapacity',
                        change: power
                    }]
                }),
                this.getPutTnxCommand({
                    pk: { S: `${this.pkTokenPrefix}|${assetId}` },
                    symbol: { S: symbol },
                    offchainUrl: { S: offchainUrl },
                    power: { N: power.toString() }
                })
            ]
        }

        return await this.transactWrite({
            params,
            itemLogName: this.itemName
        })
    }

    async putTrldToken({ assetId, symbol, offchainUrl, positionX, positionY }) {
        return await this.put({
            item: {
                pk: { S: `${this.pkTokenPrefix}|${assetId}` },
                symbol: { S: symbol },
                offchainUrl: { S: offchainUrl },
                positionX: { N: positionX.toString() },
                positionY: { N: positionY.toString() }
            },
            itemLogName: this.itemName
        })
    }

    async putTrbdToken({ assetId, symbol, offchainUrl }) {
        return await this.put({
            item: {
                pk: { S: `${this.pkTokenPrefix}|${assetId}` },
                symbol: { S: symbol },
                offchainUrl: { S: offchainUrl }
            },
            itemLogName: this.itemName
        })
    }

    async getToken(assetId) {
        try {
            const data = await this.get({
                key: { pk: { S: `${this.pkTokenPrefix}|${assetId}` } },
                itemLogName: this.itemName
            })

            return data.Item ? {
                id: assetId,
                symbol: data.Item.symbol.S,
                offchainUrl: data.Item.offchainUrl.S,
                ...data.Item.applicationId && data.Item.applicationId.S && { contractId: data.Item.applicationId.S },
                ...data.Item.contractInfo && data.Item.contractInfo.S && { contractInfo: data.Item.contractInfo.S },
                ...data.Item.sellerAddress && data.Item.sellerAddress.S && { sellerAddress: data.Item.sellerAddress.S },
                ...data.Item.assetPrice && data.Item.assetPrice.S && { assetPrice: data.Item.assetPrice.S },
                ...data.Item.assetPriceUnit && data.Item.assetPriceUnit.S && { assetPriceUnit: data.Item.assetPriceUnit.S },
                ...data.Item.verified && data.Item.applicationId && data.Item.applicationId.S && { verified: data.Item.verified.BOOL },
                ...data.Item.power && data.Item.power.N && { power: parseInt(data.Item.power.N) },
                ...data.Item.positionX && data.Item.positionX.N && { positionX: parseInt(data.Item.positionX.N) },
                ...data.Item.positionY && data.Item.positionY.N && { positionY: parseInt(data.Item.positionY.N) }
            } : null

        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async deleteToken(assetId) {
        const token = await this.getToken(assetId)

        const params = {
            TransactItems: [
                this.getDeleteTnxCommand({
                    pk: { S: `${this.pkTokenPrefix}|${assetId}` }
                })
            ]
        }

        if (token.symbol.toUpperCase() === TRCL) {
            params.TransactItems.push(this.getUpdateCountersTnxCommand({
                key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                counters: [{
                    name: 'powerCapacity',
                    change: -token.power
                }]
            }))
        }

        try {
            return await this.transactWrite({
                params,
                itemLogName: this.itemName
            })
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async putTokenContract({ assetId, applicationId, contractInfo, sellerAddress, assetPrice, assetPriceUnit, verified }) {
        try {
            return await this.update({
                key: { pk: { S: `${this.pkTokenPrefix}|${assetId}` } },
                attributes: {
                    applicationId: { S: applicationId },
                    contractInfo: { S: contractInfo },
                    sellerAddress: { S: sellerAddress },
                    assetPrice: { S: assetPrice },
                    assetPriceUnit: { S: assetPriceUnit },
                    verified: { BOOL: verified }
                },
                condition: 'attribute_exists(pk)',
                itemLogName: this.itemName
            })
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async deleteTokenContract(assetId) {
        try {
            return await this.update({
                key: { pk: { S: `${this.pkTokenPrefix}|${assetId}` } },
                attributes: {
                    applicationId: { S: '' },
                    contractInfo: { S: '' },
                    sellerAddress: { S: '' },
                    assetPrice: { S: '' },
                    assetPriceUnit: { S: '' },
                    verified: { BOOL: false }
                },
                condition: 'attribute_exists(pk)',
                itemLogName: this.itemName
            })
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
