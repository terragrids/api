import { ConditionalCheckFailedException, DeleteItemCommand, DescribeTableCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
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

    async testConnection() {
        const command = new DescribeTableCommand({ TableName: this.table })
        try {
            const response = await this.client.send(command)
            return {
                status: response.$metadata.httpStatusCode,
                table: this.table,
                region: process.env.DYNAMO_DB_REGION,
                endpoint: process.env.DYNAMO_DB_ENDPOINT
            }
        } catch (e) {
            return { error: 'Unable to connect to dynamo db' }
        }
    }

    async query({ indexName, conditionExpression, attributeNames, attributeValues, pageSize = 10, nextPageKey, forward = true, itemLogName = 'item' }) {
        const params = {
            TableName: this.table,
            IndexName: indexName,
            KeyConditionExpression: conditionExpression,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            Limit: pageSize,
            ExclusiveStartKey: nextPageKey ? JSON.parse(Buffer.from(nextPageKey, 'base64').toString('ascii')) : null,
            ScanIndexForward: forward
        }

        const command = new QueryCommand(params)

        try {
            const data = await this.client.send(command)
            return {
                items: data.Items || [],
                nextPageKey: data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : null
            }
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
            if (e instanceof ConditionalCheckFailedException) throw e
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
            ...(condition && { ConditionExpression: condition })
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
            if (e instanceof ConditionalCheckFailedException) throw e
            else throw new RepositoryError(e, `Unable to delete ${itemLogName}`)
        }
    }

    async transactWrite({ params, itemLogName = 'item' }) {
        const command = new TransactWriteItemsCommand(params)

        try {
            return await this.client.send(command)
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
            if (e instanceof ConditionalCheckFailedException) throw e
            else throw new RepositoryError(e, `Unable to execute transaction on ${itemLogName}`)
        }
    }

    getUpdateCountersTnxCommand({ key, counters, conditionExpression }) {
        return {
            Update: {
                TableName: this.table,
                Key: key,
                UpdateExpression: `add ${counters.map(c => `${c.name} :${c.name}`).join(',')}`,
                ExpressionAttributeValues: {
                    ...counters.reduce((map, counter) => ((map[`:${counter.name}`] = { N: counter.change }), map), {})
                },
                ...(conditionExpression && { ConditionExpression: conditionExpression })
            }
        }
    }

    getPutTnxCommand(item) {
        return {
            Put: {
                TableName: this.table,
                Item: item
            }
        }
    }

    getDeleteTnxCommand(key) {
        return {
            Delete: {
                TableName: this.table,
                Key: key
            }
        }
    }
}
