import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class MediaRepository extends DynamoDbRepository {
    async getMediaByType({ type, withHash = false, rank, pageSize, nextPageKey, sort }) {
        const forward = sort && sort === 'desc' ? false : true
        let filter = 'media|'
        if (rank) filter = `${filter}${rank}|`

        const data = await this.query({
            indexName: 'gsi1',
            conditionExpression: 'gsi1pk = :gsi1pk AND begins_with(#data, :data)',
            attributeNames: { '#data': 'data' },
            attributeValues: {
                ':gsi1pk': { S: `type|${type}` },
                ':data': { S: filter }
            },
            pageSize,
            nextPageKey,
            forward,
            itemLogName: 'media'
        })

        return {
            media: data.items.map(asset => ({
                id: asset.pk.S.replace('fileId|', ''),
                key: asset.data.S.replace('media|', ''),
                ...(withHash && { hash: asset.hash.S })
            })),
            ...(data.nextPageKey && { nextPageKey: data.nextPageKey })
        }
    }

    async getMediaItem(fileId) {
        try {
            const response = await this.get({
                key: { pk: { S: `fileId|${fileId}` } },
                itemLogName: 'media'
            })

            const item = response.Item
            if (!item) throw new AssetNotFoundError()

            return {
                id: item.pk.S.replace('fileId|', ''),
                key: item.data.S.replace('media|', ''),
                hash: item.hash.S
            }
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw e
        }
    }
}
