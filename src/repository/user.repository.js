import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class UserRepository extends DynamoDbRepository {
    async putUser({ id, walletAddress }) {
        return await this.put({
            item: {
                pk: { S: `user|${id}` },
                ...(walletAddress && { gsi1pk: { S: `user|wallet|${walletAddress}` } }),
                lastModified: { N: `${Date.now()}` }
            },
            itemLogName: 'user'
        })
    }

    async getUserById(id) {
        try {
            const response = await this.get({
                key: { pk: { S: `user|${id}` } },
                itemLogName: 'user'
            })

            const item = response.Item
            return item
                ? {
                      id: item.pk.S.replace('user|', ''),
                      ...(item.walletAddress && { walletAddress: item.walletAddress.S })
                  }
                : null
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
