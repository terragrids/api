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
                        data: { S: `project||created|${Date.now()}` },
                        offchainUrl: { S: offchainUrl },
                        power: { N: power.toString() },
                        ...(positionX && { positionX: { N: positionX.toString() } }),
                        ...(positionY && { positionY: { N: positionY.toString() } })
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
                    data: { S: `project||created|${Date.now()}` },
                    offchainUrl: { S: offchainUrl },
                    ...(positionX && { positionX: { N: positionX.toString() } }),
                    ...(positionY && { positionY: { N: positionY.toString() } })
                },
                itemLogName: this.itemName
            })
        }
    }

    async getToken(assetId) {
        try {
            const response = await this.get({
                key: { pk: { S: `${this.pkTokenPrefix}|${assetId}` } },
                itemLogName: this.itemName
            })

            const item = response.Item

            let symbol
            if (item && item.gsi1pk) {
                symbol = item.gsi1pk.S.replace('symbol|', '')
            } else if (item && item.symbol) {
                symbol = item.symbol.S
            } else {
                symbol = null
            }

            const data = item.data.S.split('|')
            const status = data[2]
            const date = data[3]

            return item && symbol
                ? {
                      id: assetId,
                      symbol,
                      status,
                      statusChanged: date,
                      ...(item.offchainUrl && item.offchainUrl.S && { offchainUrl: item.offchainUrl.S }),
                      ...(item.applicationId && item.applicationId.S && { contractId: item.applicationId.S }),
                      ...(item.contractInfo && item.contractInfo.S && { contractInfo: item.contractInfo.S }),
                      ...(item.sellerAddress && item.sellerAddress.S && { sellerAddress: item.sellerAddress.S }),
                      ...(item.assetPrice && item.assetPrice.S && { assetPrice: item.assetPrice.S }),
                      ...(item.assetPriceUnit && item.assetPriceUnit.S && { assetPriceUnit: item.assetPriceUnit.S }),
                      ...(item.verified && item.applicationId && item.applicationId.S && { verified: item.verified.BOOL }),
                      ...(item.power && item.power.N !== undefined && { power: parseInt(item.power.N) }),
                      ...(item.positionX && item.positionX.N !== undefined && { positionX: parseInt(item.positionX.N) }),
                      ...(item.positionY && item.positionY.N !== undefined && { positionY: parseInt(item.positionY.N) })
                  }
                : null
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }

    async getTokensBySymbol({ symbol, projectId = '', status = 'created', pageSize, nextPageKey, sort }) {
        const forward = sort && sort === 'desc' ? false : true
        const data = await this.query({
            indexName: 'gsi1',
            conditionExpression: 'gsi1pk = :gsi1pk AND begins_with(#data, :project)',
            attributeNames: { '#data': 'data' },
            attributeValues: {
                ':gsi1pk': { S: `symbol|${symbol}` },
                ':project': { S: `project|${projectId}|${status}|` }
            },
            pageSize,
            nextPageKey,
            forward,
            itemLogName: 'assets'
        })

        return {
            assets: data.items.map(asset => {
                const data = asset.data.S.split('|')
                const status = data[2]
                const date = data[3]
                return {
                    id: asset.pk.S.replace(`${this.pkTokenPrefix}|`, ''),
                    status,
                    statusChanged: date,
                    ...(asset.name && { name: asset.name.S }),
                    ...(asset.offchainUrl && { offchainUrl: asset.offchainUrl.S }),
                    ...(asset.applicationId && { offchainUrl: asset.offchainUrl.S })
                }
            }),
            ...(data.nextPageKey && { nextPageKey: data.nextPageKey })
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
