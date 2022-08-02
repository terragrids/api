import { ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import AssetContractNotFoundError from '../error/asset-contract-not-found.error.js'
import AssetNotFoundError from '../error/asset-not-found.error.js'
import RepositoryError from '../error/repository.error.js'

export default class DynamoDbRepository {
    client
    table

    constructor() {
        this.client = new DynamoDBClient({
            region: process.env.DYNAMO_DB_REGION,
            endpoint: process.env.DYNAMO_DB_ENDPOINT
        })
        this.table = process.env.DYNAMO_DB_ENV === 'prod' ? 'terragrids' : 'terragrids-dev'
    }

    async query({ conditionExpression, attributeNames, attributeValues, pageSize = 1, nextPageKey, forward = true, itemLogName = 'item' }) {
        const params = {
            TableName: this.table,
            KeyConditionExpression: conditionExpression,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            Limit: pageSize,
            ExclusiveStartKey: nextPageKey ? JSON.parse(Buffer.from(nextPageKey, 'base64').toString('ascii')) : null,
            ScanIndexForward: forward
        }

        const command = new QueryCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            throw new RepositoryError(e, `Unable to get ${itemLogName}`)
        }
    }

    async get({ key, itemLogName = 'item' }) {
        const params = {
            TableName: this.table,
            Key: key
        }
        const command = new GetItemCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetContractNotFoundError()
            throw new RepositoryError(e, `Unable to get ${itemLogName}`)
        }
    }

    async put({ item, itemLogName = 'item' }) {
        const params = {
            TableName: this.table,
            Item: item
        }

        const command = new PutItemCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            throw new RepositoryError(e, `Unable to put ${itemLogName}`)
        }
    }

    async update({ key, condition, attributes, itemLogName = 'item' }) {
        const { updateExpression, attributeNames, attributeValues } = this.buildUpdate(attributes)
        const params = {
            TableName: this.table,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            ...condition && { ConditionExpression: condition }
        }

        const command = new UpdateItemCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw e
            throw new RepositoryError(e, `Unable to update ${itemLogName}`)
        }
    }

    buildUpdate(attributes) {
        const updateExpression = []
        const attributeValues = {}
        let attributeNames

        for (const [key, value] of Object.entries(attributes)) {
            if (value !== undefined) {
                let placeholder = key
                if (key.startsWith('#')) {
                    placeholder = key.substring(1)
                    if (!attributeNames) attributeNames = {}
                    attributeNames[key] = placeholder
                }
                updateExpression.push(`${key} = :${placeholder}`)
                attributeValues[`:${placeholder}`] = value
            }
        }

        return {
            updateExpression: updateExpression.length > 0 ? `set ${updateExpression.join(',')}` : null,
            attributeNames,
            attributeValues
        }
    }

    async delete({ key, itemLogName = 'item' }) {
        const params = {
            TableName: this.table,
            Key: key,
            ConditionExpression: 'attribute_exists(pk)'
        }
        const command = new DeleteItemCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) throw new AssetNotFoundError()
            else throw new RepositoryError(e, `Unable to delete ${itemLogName}`)
        }
    }
}
