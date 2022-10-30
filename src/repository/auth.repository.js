import cryptoRandomString from 'crypto-random-string'
import DynamoDbRepository from './dynamodb.repository.js'

export default class AuthRepository extends DynamoDbRepository {
    itemName = 'auth'

    async getAuthMessage(walletAddress) {
        const nonce = `${cryptoRandomString({ length: 32 })}-${Date.now() + 600000}` // valid for 10 minutes
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
