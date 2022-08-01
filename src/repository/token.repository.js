import DynamoDbRepository from './dynamodb.repository.js'

export default class TokenRepository extends DynamoDbRepository {
    pkPrefix = 'asset'
    itemName = 'token'

    async putTokenContract({ assetId, applicationId, contractInfo, sellerAddress, assetPrice, assetPriceUnit, verified }) {
        return await this.put({
            item: {
                pk: { S: `${this.pkPrefix}|${assetId}` },
                applicationId: { S: applicationId },
                contractInfo: { S: contractInfo },
                sellerAddress: { S: sellerAddress },
                assetPrice: { S: assetPrice },
                assetPriceUnit: { S: assetPriceUnit },
                verified: { BOOL: verified }
            },
            itemLogName: this.itemName
        })
    }

    async putToken({ assetId, symbol, offchainUrl }) {
        return await this.put({
            item: {
                pk: { S: `${this.pkPrefix}|${assetId}` },
                symbol: { S: symbol },
                offchainUrl: { S: offchainUrl }
            },
            itemLogName: this.itemName
        })
    }

    async getToken(assetId) {
        const data = await this.get({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
            itemLogName: this.itemName
        })

        return data.Item ? {
            symbol: data.Item.symbol.S,
            offchainUrl: data.Item.offchainUrl.S,
            contractId: data.Item.applicationId ? data.Item.applicationId.S : null,
            contractInfo: data.Item.contractInfo ? data.Item.contractInfo.S : null,
            sellerAddress: data.Item.sellerAddress ? data.Item.sellerAddress.S : null,
            assetPrice: data.Item.assetPrice ? data.Item.assetPrice.S : null,
            assetPriceUnit: data.Item.assetPriceUnit ? data.Item.assetPriceUnit.S : null,
            verified: data.Item.verified ? data.Item.verified.BOOL : null
        } : null
    }

    async deleteToken(assetId) {
        return await this.delete({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
            itemLogName: this.itemName
        })
    }
}
