import DynamoDbRepository from './dynamodb.repository.js'

export default class TokenRepository extends DynamoDbRepository {
    pkPrefix = 'asset'
    itemName = 'token'

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
            id: assetId,
            symbol: data.Item.symbol.S,
            offchainUrl: data.Item.offchainUrl.S,
            ...data.Item.applicationId && data.Item.applicationId.S && { contractId: data.Item.applicationId.S },
            ...data.Item.contractInfo && data.Item.contractInfo.S && { contractInfo: data.Item.contractInfo.S },
            ...data.Item.sellerAddress && data.Item.sellerAddress.S && { sellerAddress: data.Item.sellerAddress.S },
            ...data.Item.assetPrice && data.Item.assetPrice.S && { assetPrice: data.Item.assetPrice.S },
            ...data.Item.assetPriceUnit && data.Item.assetPriceUnit.S && { assetPriceUnit: data.Item.assetPriceUnit.S },
            ...data.Item.verified && data.Item.applicationId && data.Item.applicationId.S && { verified: data.Item.verified.BOOL }
        } : null
    }

    async deleteToken(assetId) {
        return await this.delete({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
            itemLogName: this.itemName
        })
    }

    async putTokenContract({ assetId, applicationId, contractInfo, sellerAddress, assetPrice, assetPriceUnit, verified }) {
        return await this.update({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
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
    }

    async deleteTokenContract(assetId) {
        return await this.update({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
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
    }
}
