import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import UserNotFoundError from '../error/user-not-found.error.js'
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
                permissions: { NS: ['-1'] },
                lastModified: { N: `${now}` }
            },
            itemLogName: 'user'
        })
        return { id: userId, permissions: [] }
    }

    async getUserByOauthId(id) {
        try {
            const response = await this.get({
                key: { pk: { S: `user|oauth|${id}` } },
                itemLogName: 'user'
            })

            const item = response.Item
            if (item)
                return {
                    id: item.gsi1pk.S.replace('user|id|', ''),
                    ...(item.walletAddress && { walletAddress: item.walletAddress.S }),
                    permissions: item.permissions.NS.map(p => parseInt(p)).filter(p => p !== -1)
                }
            else throw new UserNotFoundError()
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new UserNotFoundError()
            else throw e
        }
    }
}
