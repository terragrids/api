import cryptoRandomString from 'crypto-random-string'
import { minutes10 } from '../utils/constants.js'
import DynamoDbRepository from './dynamodb.repository.js'

export default class AuthRepository extends DynamoDbRepository {
    itemName = 'auth'

    async getAuthMessage(walletAddress) {
        const nonce = `${cryptoRandomString({ length: 32 })}-${Date.now() + minutes10}`
        const message = {
            service: 'terragrids.org',
            desc: 'Terragrids Systems',
            authAcc: walletAddress,
            nonce
        }

        // Save nonce for later verification
        await this.put({
            item: {
                pk: { S: `${this.itemName}|${walletAddress}` },
                nonce: { S: nonce }
            },
            itemLogName: this.itemName
        })

        return message
    }
}
