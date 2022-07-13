import DynamoDbRepository from './dynamodb.repository.js'

export default class TokenRepository extends DynamoDbRepository {
    pkPrefix = 'asset'
    itemName = 'token contract'

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

    async getTokenContract(assetId) {
        const data = await this.get({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
            itemLogName: this.itemName
        })

        return data.Item && data.Item.applicationId ? {
            id: data.Item.applicationId.S,
            info: data.Item.contractInfo.S,
            sellerAddress: data.Item.sellerAddress.S,
            assetPrice: data.Item.assetPrice.S,
            assetPriceUnit: data.Item.assetPriceUnit.S,
            verified: data.Item.verified.BOOL
        } : null
    }

    async deleteTokenContract(assetId) {
        return await this.delete({
            key: { pk: { S: `${this.pkPrefix}|${assetId}` } },
            itemLogName: this.itemName
        })
    }
}
