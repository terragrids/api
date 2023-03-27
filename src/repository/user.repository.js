import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import uuid from '../utils/uuid.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class UserRepository extends DynamoDbRepository {
    async addUser({ oauthId, walletAddress }) {
        const userId = uuid()
        const now = Date.now()
        await this.put({
            item: {
                pk: { S: `user|oauth|${oauthId}` },
                gsi1pk: { S: `user|id|${userId}` },
                ...(walletAddress && { gsi2pk: { S: `user|wallet|${walletAddress}` } }),
                data: { S: `user|created|${now}` },
                lastModified: { N: `${now}` }
            },
            itemLogName: 'user'
        })
        return { id: userId }
    }

    async getUserByOauthId(id) {
        try {
            const response = await this.get({
                key: { pk: { S: `user|oauth|${id}` } },
                itemLogName: 'user'
            })

            const item = response.Item
            return item
                ? {
                      id: item.gsi1pk.S.replace('user|id|', ''),
                      ...(item.walletAddress && { walletAddress: item.walletAddress.S })
                  }
                : null
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
