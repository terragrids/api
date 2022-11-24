import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import { TRCL } from '../utils/assets.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class TokenRepository extends DynamoDbRepository {
    pkTokenPrefix = 'asset'
    pkSolarPowerPlantPrefix = 'spp'
    symbolPrefix = 'symbol'
    itemName = 'token'

    async putToken({ assetId, symbol, offchainUrl, power, positionX, positionY }) {
        // If the token is a Terracell NFT, add power capacity to the Solar Power Plant
        if (power) {
            const params = {
                TransactItems: [
                    this.getUpdateCountersTnxCommand({
                        key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                        counters: [
                            {
                                name: 'powerCapacity',
                                change: power.toString()
                            }
                        ]
                    }),
                    this.getPutTnxCommand({
                        pk: { S: `${this.pkTokenPrefix}|${assetId}` },
                        gsi1pk: { S: `${this.symbolPrefix}|${symbol}` },
                        offchainUrl: { S: offchainUrl },
                        power: { N: power.toString() },
                        positionX: { N: positionX.toString() },
                        positionY: { N: positionY.toString() }
                    })
                ]
            }
            return await this.transactWrite({
                params,
                itemLogName: this.itemName
            })
        } else {
            // If the token is a Terraland or a Terrabuild NFT, just save it
            return await this.put({
                item: {
                    pk: { S: `${this.pkTokenPrefix}|${assetId}` },
                    gsi1pk: { S: `${this.symbolPrefix}|${symbol}` },
                    offchainUrl: { S: offchainUrl },
                    positionX: { N: positionX.toString() },
                    positionY: { N: positionY.toString() }
                },
                itemLogName: this.itemName
            })
        }
    }

    async getToken(assetId) {
        try {
            const data = await this.get({
                key: { pk: { S: `${this.pkTokenPrefix}|${assetId}` } },
                itemLogName: this.itemName
            })

            let symbol
            if (data.Item && data.Item.gsi1pk) {
                symbol = data.Item.gsi1pk.S.replace('symbol|', '')
            } else if (data.Item && data.Item.symbol) {
                symbol = data.Item.symbol.S
            } else {
                symbol = null
            }

            return data.Item && symbol
                ? {
                      id: assetId,
                      symbol,
                      ...(data.Item.offchainUrl && data.Item.offchainUrl.S && { offchainUrl: data.Item.offchainUrl.S }),
                      ...(data.Item.applicationId && data.Item.applicationId.S && { contractId: data.Item.applicationId.S }),
                      ...(data.Item.contractInfo && data.Item.contractInfo.S && { contractInfo: data.Item.contractInfo.S }),
                      ...(data.Item.sellerAddress && data.Item.sellerAddress.S && { sellerAddress: data.Item.sellerAddress.S }),
                      ...(data.Item.assetPrice && data.Item.assetPrice.S && { assetPrice: data.Item.assetPrice.S }),
                      ...(data.Item.assetPriceUnit && data.Item.assetPriceUnit.S && { assetPriceUnit: data.Item.assetPriceUnit.S }),
                      ...(data.Item.verified && data.Item.applicationId && data.Item.applicationId.S && { verified: data.Item.verified.BOOL }),
                      ...(data.Item.power && data.Item.power.N !== undefined && { power: parseInt(data.Item.power.N) }),
                      ...(data.Item.positionX && data.Item.positionX.N !== undefined && { positionX: parseInt(data.Item.positionX.N) }),
                      ...(data.Item.positionY && data.Item.positionY.N !== undefined && { positionY: parseInt(data.Item.positionY.N) })
                  }
                : null
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async deleteToken(assetId) {
        const token = await this.getToken(assetId)
        if (!token) throw new AssetNotFoundError()

        const params = {
            TransactItems: [
                this.getDeleteTnxCommand({
                    pk: { S: `${this.pkTokenPrefix}|${assetId}` }
                })
            ]
        }

        if (token.symbol.toUpperCase() === TRCL) {
            params.TransactItems.push(
                this.getUpdateCountersTnxCommand({
                    key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                    counters: [
                        {
                            name: 'powerCapacity',
                            change: -token.power
                        }
                    ]
                })
            )
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

    async getSpp() {
        try {
            const data = await this.get({
                key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                itemLogName: this.pkSolarPowerPlantPrefix
            })

            return data.Item
                ? {
                      ...(data.Item.contractInfo && data.Item.contractInfo.S !== undefined && { contractInfo: data.Item.contractInfo.S }),
                      ...(data.Item.powerCapacity && data.Item.powerCapacity.N !== undefined && { capacity: parseInt(data.Item.powerCapacity.N) }),
                      ...(data.Item.powerOutput && data.Item.powerOutput.N !== undefined && { output: parseInt(data.Item.powerOutput.N) }),
                      ...(data.Item.totalTerracells && data.Item.totalTerracells.N !== undefined && { totalTerracells: parseInt(data.Item.totalTerracells.N) }),
                      ...(data.Item.activeTerracells && data.Item.activeTerracells.N !== undefined && { activeTerracells: parseInt(data.Item.activeTerracells.N) })
                  }
                : null
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async putSpp({ contractInfo, capacity, output, totalTerracells, activeTerracells }) {
        try {
            return await this.update({
                key: { pk: { S: this.pkSolarPowerPlantPrefix } },
                attributes: {
                    ...(contractInfo !== undefined && { contractInfo: { S: contractInfo } }),
                    ...(capacity !== undefined && { powerCapacity: { N: capacity.toString() } }),
                    ...(output !== undefined && { powerOutput: { N: output.toString() } }),
                    ...(totalTerracells !== undefined && { totalTerracells: { N: totalTerracells.toString() } }),
                    ...(activeTerracells !== undefined && { activeTerracells: { N: activeTerracells.toString() } })
                },
                condition: 'attribute_exists(pk)',
                itemLogName: this.pkSolarPowerPlantPrefix
            })
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
