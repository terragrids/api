import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import { minutes10 } from '../utils/constants.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class JwtRepository extends DynamoDbRepository {
    async putJwks(jwks) {
        return await this.put({
            item: {
                pk: { S: 'jwks' },
                jwks: { S: jwks },
                lastCached: { N: `${Date.now()}` }
            },
            itemLogName: 'jwks'
        })
    }

    async getJwks() {
        try {
            const response = await this.get({
                key: { pk: { S: 'jwks' } },
                itemLogName: 'jwks'
            })

            if (!response.Item) return null

            const item = response.Item
            if (!item.lastCached || Date.now() > Number(item.lastCached.N) + minutes10) return null

            return item.jwks.S
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
